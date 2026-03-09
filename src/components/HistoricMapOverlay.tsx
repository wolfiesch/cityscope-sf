import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

interface MapIndex {
  id: string;
  title: string;
  year: number;
  gcps_count: number;
  width: number;
  height: number;
  transformation_method: string;
  bbox?: [number, number, number, number]; // [west, south, east, north]
}

interface FullMap extends MapIndex {
  iiif_base: string;
  gcps: { location: [number, number]; pixel: [number, number] }[];
}

interface EraGroup {
  label: string;
  range: [number, number];
  maps: MapIndex[];
}

// Quadrilateral bounds: [[bottomLeft], [topLeft], [topRight], [bottomRight]]
// Each corner is [lng, lat] - computed via affine transform from GCPs
export type QuadBounds = [[number, number], [number, number], [number, number], [number, number]];

export interface HistoricMapData {
  image: HTMLImageElement;
  bounds: QuadBounds;
  opacity: number;
  title: string;
  year: number;
}

function groupByEra(maps: MapIndex[]): EraGroup[] {
  const eras: { label: string; range: [number, number] }[] = [
    { label: "Pre-1800", range: [0, 1799] },
    { label: "1800s", range: [1800, 1849] },
    { label: "1850s", range: [1850, 1869] },
    { label: "1870s", range: [1870, 1889] },
    { label: "1890s", range: [1890, 1909] },
    { label: "1910s", range: [1910, 1929] },
    { label: "1930s", range: [1930, 1949] },
    { label: "1950s", range: [1950, 1969] },
    { label: "1970+", range: [1970, 9999] },
  ];

  return eras
    .map((era) => ({
      ...era,
      maps: maps.filter((m) => m.year >= era.range[0] && m.year <= era.range[1]),
    }))
    .filter((era) => era.maps.length > 0);
}

/**
 * Solve a least-squares affine transform from pixel coords to geo coords.
 * Returns coefficients [a, b, c] such that: value = a*px + b*py + c
 * Uses the normal equations: (A^T A)^-1 A^T b
 */
function solveAffineCoeffs(
  gcps: { location: [number, number]; pixel: [number, number] }[],
  coordIndex: 0 | 1, // 0=lng, 1=lat
): [number, number, number] {
  const n = gcps.length;
  // Build A^T A (3x3) and A^T b (3x1)
  let s_xx = 0, s_xy = 0, s_x = 0;
  let s_yy = 0, s_y = 0;
  let s_n = n;
  let s_xv = 0, s_yv = 0, s_v = 0;

  for (const gcp of gcps) {
    const [px, py] = gcp.pixel;
    const v = gcp.location[coordIndex];
    s_xx += px * px;
    s_xy += px * py;
    s_x += px;
    s_yy += py * py;
    s_y += py;
    s_xv += px * v;
    s_yv += py * v;
    s_v += v;
  }

  // Solve 3x3 system via Cramer's rule
  // | s_xx  s_xy  s_x  |   | a |   | s_xv |
  // | s_xy  s_yy  s_y  | * | b | = | s_yv |
  // | s_x   s_y   s_n  |   | c |   | s_v  |
  const det =
    s_xx * (s_yy * s_n - s_y * s_y) -
    s_xy * (s_xy * s_n - s_y * s_x) +
    s_x * (s_xy * s_y - s_yy * s_x);

  if (Math.abs(det) < 1e-20) {
    // Degenerate - fall back to mean position
    return [0, 0, s_v / n];
  }

  const a =
    (s_xv * (s_yy * s_n - s_y * s_y) -
      s_xy * (s_yv * s_n - s_y * s_v) +
      s_x * (s_yv * s_y - s_yy * s_v)) /
    det;

  const b =
    (s_xx * (s_yv * s_n - s_y * s_v) -
      s_xv * (s_xy * s_n - s_y * s_x) +
      s_x * (s_xy * s_v - s_yv * s_x)) /
    det;

  const c =
    (s_xx * (s_yy * s_v - s_yv * s_y) -
      s_xy * (s_xy * s_v - s_yv * s_x) +
      s_xv * (s_xy * s_y - s_yy * s_x)) /
    det;

  return [a, b, c];
}

/**
 * Compute quadrilateral bounds by mapping image corners through an affine
 * transform derived from GCPs. Returns corners in deck.gl BitmapLayer order:
 * [bottomLeft, topLeft, topRight, bottomRight]
 */
function computeQuadBounds(
  gcps: { location: [number, number]; pixel: [number, number] }[],
  width: number,
  height: number,
): QuadBounds {
  if (gcps.length < 3) {
    throw new Error(`Need at least 3 GCPs for affine transform, got ${gcps.length}`);
  }
  const lngCoeffs = solveAffineCoeffs(gcps, 0);
  const latCoeffs = solveAffineCoeffs(gcps, 1);

  const transform = (px: number, py: number): [number, number] => [
    lngCoeffs[0] * px + lngCoeffs[1] * py + lngCoeffs[2],
    latCoeffs[0] * px + latCoeffs[1] * py + latCoeffs[2],
  ];

  // Image corners in pixel space: (0,0)=top-left, (w,0)=top-right,
  // (w,h)=bottom-right, (0,h)=bottom-left
  const topLeft = transform(0, 0);
  const topRight = transform(width, 0);
  const bottomRight = transform(width, height);
  const bottomLeft = transform(0, height);

  // BitmapLayer expects: [bottomLeft, topLeft, topRight, bottomRight]
  return [bottomLeft, topLeft, topRight, bottomRight];
}

interface HistoricMapOverlayProps {
  visible: boolean;
  onMapSelect: (data: HistoricMapData | null) => void;
}

export function HistoricMapOverlay({ visible, onMapSelect }: HistoricMapOverlayProps) {
  const [index, setIndex] = useState<MapIndex[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<Omit<HistoricMapData, "opacity"> | null>(null);
  const loadSeqRef = useRef(0);
  const [opacity, setOpacity] = useState(0.65);
  const [loading, setLoading] = useState(false);
  const [expandedEra, setExpandedEra] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/data/historic_maps_index.json")
      .then((r) => r.json())
      .then(setIndex);
  }, []);

  const eras = useMemo(() => groupByEra(index), [index]);

  const filteredEras = useMemo(() => {
    if (!search.trim()) return eras;
    const q = search.toLowerCase();
    return eras
      .map((era) => ({
        ...era,
        maps: era.maps.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            String(m.year).includes(q)
        ),
      }))
      .filter((era) => era.maps.length > 0);
  }, [eras, search]);

  useEffect(() => {
    if (!visible) {
      setActiveMapId(null);
      setActiveOverlay(null);
      onMapSelect(null);
    }
  }, [visible, onMapSelect]);

  const loadMap = useCallback(
    async (mapMeta: MapIndex) => {
      const seq = ++loadSeqRef.current;
      setLoading(true);
      setActiveMapId(mapMeta.id);
      try {
        const resp = await fetch(`/data/maps/${mapMeta.id}.json`);
        const fullMap: FullMap = await resp.json();
        if (seq !== loadSeqRef.current) return; // stale request

        const bounds = computeQuadBounds(fullMap.gcps, fullMap.width, fullMap.height);
        const imageUrl = `${fullMap.iiif_base}/full/768,/0/default.jpg`;

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = imageUrl;
        });
        if (seq !== loadSeqRef.current) return; // stale request

        const overlay = { image: img, bounds, title: fullMap.title, year: fullMap.year };
        setActiveOverlay(overlay);
        onMapSelect({ ...overlay, opacity });
      } catch (err) {
        if (seq !== loadSeqRef.current) return;
        console.error("[HistoricMap] Failed to load map:", err);
        setActiveMapId(null);
        setActiveOverlay(null);
        onMapSelect(null);
      } finally {
        if (seq === loadSeqRef.current) setLoading(false);
      }
    },
    [opacity, onMapSelect]
  );

  const clearMap = useCallback(() => {
    setActiveMapId(null);
    setActiveOverlay(null);
    onMapSelect(null);
  }, [onMapSelect]);

  // Update opacity on the active map overlay
  useEffect(() => {
    if (activeOverlay) {
      onMapSelect({ ...activeOverlay, opacity });
    }
  }, [opacity, activeOverlay, onMapSelect]);

  if (!visible || index.length === 0) return null;

  return createPortal(
    <div className="fixed inset-x-3 top-16 z-[9999] max-h-[45vh] overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm lg:inset-x-auto lg:left-[17.5rem] lg:top-16 lg:w-72">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 font-bold text-xs tracking-wider uppercase">
          Historic Maps
          <span className="text-gray-500 font-normal ml-1">
            ({index.length.toLocaleString()})
          </span>
        </h3>
        {activeMapId && (
          <button
            onClick={clearMap}
            className="text-gray-500 hover:text-white text-xs"
          >
            Clear
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search maps..."
        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 mb-2"
      />

      <div className="overflow-y-auto max-h-[50vh] space-y-1">
        {filteredEras.map((era) => (
          <div key={era.label}>
            <button
              onClick={() =>
                setExpandedEra(expandedEra === era.label ? null : era.label)
              }
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-gray-800/60 transition-colors"
            >
              <span className="text-amber-400 font-bold">{era.label}</span>
              <span className="text-gray-500 font-mono">
                {era.maps.length}
              </span>
            </button>

            {expandedEra === era.label && (
              <div className="ml-1 space-y-0.5 mt-0.5">
                {era.maps.map((m) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      activeMapId === m.id ? clearMap() : loadMap(m)
                    }
                    className={`w-full text-left px-2 py-1 rounded-md text-xs transition-all ${
                      activeMapId === m.id
                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                        : "bg-gray-800/30 hover:bg-gray-800/60 text-gray-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-400 shrink-0 w-8">
                        {m.year}
                      </span>
                      <span className="truncate flex-1">{m.title}</span>
                      {loading && activeMapId === m.id && (
                        <span className="text-amber-400 shrink-0">...</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-[10px] ml-10">
                      {m.gcps_count} GCPs
                      {m.transformation_method === "tps" ? " | TPS" : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeMapId && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Opacity</span>
            <span className="font-mono">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity * 100}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-full h-1 rounded-full appearance-none bg-gray-700 cursor-pointer"
          />
        </div>
      )}
    </div>,
    document.body
  );
}
