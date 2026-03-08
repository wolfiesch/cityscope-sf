import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useMap } from "react-map-gl/maplibre";
import { WarpedMapLayer } from "@allmaps/maplibre";

interface MapIndex {
  id: string;
  title: string;
  year: number;
  gcps_count: number;
  width: number;
  height: number;
  transformation_method: string;
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

function generateAnnotation(m: FullMap) {
  const gcpFeatures = m.gcps.map((gcp) => ({
    type: "Feature" as const,
    properties: { resourceCoords: gcp.pixel },
    geometry: { type: "Point" as const, coordinates: gcp.location },
  }));

  const svgSelector = `<svg width="${m.width}" height="${m.height}"><polygon points="0,0 ${m.width},0 ${m.width},${m.height} 0,${m.height}"/></svg>`;

  let transformation: { type: string; options?: { order: number } };
  if (m.transformation_method === "tps") {
    transformation = { type: "thinPlateSpline" };
  } else {
    transformation = { type: "polynomial", options: { order: 1 } };
  }

  return {
    type: "AnnotationPage",
    "@context": [
      "http://www.w3.org/ns/anno.jsonld",
      "http://geojson.org/geojson-ld/geojson-context.jsonld",
      "http://iiif.io/api/extension/georef/1/context.json",
    ],
    items: [
      {
        id: `urn:cityscope:map:${m.id}`,
        type: "Annotation",
        motivation: "georeferencing",
        target: {
          type: "SpecificResource",
          source: {
            id: m.iiif_base,
            type: "ImageService2",
            height: m.height,
            width: m.width,
          },
          selector: { type: "SvgSelector", value: svgSelector },
        },
        body: {
          type: "FeatureCollection",
          transformation,
          features: gcpFeatures,
        },
      },
    ],
  };
}

interface HistoricMapOverlayProps {
  visible: boolean;
}

export function HistoricMapOverlay({ visible }: HistoricMapOverlayProps) {
  const { current: mapRef } = useMap();
  const warpedLayerRef = useRef<WarpedMapLayer | null>(null);
  const [index, setIndex] = useState<MapIndex[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.65);
  const [loading, setLoading] = useState(false);
  const [expandedEra, setExpandedEra] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Load lightweight index
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

  // Initialize WarpedMapLayer when map style is loaded
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || warpedLayerRef.current) return;

    function addWarpedLayer() {
      if (warpedLayerRef.current) return;
      const layer = new WarpedMapLayer();
      map!.addLayer(layer as never);
      warpedLayerRef.current = layer;
    }

    if (map.loaded()) {
      addWarpedLayer();
    } else {
      map.on("load", addWarpedLayer);
    }

    return () => {
      map.off("load", addWarpedLayer);
      try {
        warpedLayerRef.current?.clear();
      } catch {
        // ignore cleanup errors
      }
      warpedLayerRef.current = null;
    };
  }, [mapRef]);

  // Show/hide based on visibility
  useEffect(() => {
    if (!warpedLayerRef.current) return;
    if (!visible) {
      warpedLayerRef.current.clear();
      setActiveMapId(null);
    }
  }, [visible]);

  const loadMap = useCallback(
    async (mapMeta: MapIndex) => {
      if (!warpedLayerRef.current) return;
      setLoading(true);
      setActiveMapId(mapMeta.id);
      try {
        const resp = await fetch(`/data/maps/${mapMeta.id}.json`);
        const fullMap: FullMap = await resp.json();

        warpedLayerRef.current.clear();
        const annotation = generateAnnotation(fullMap);
        await warpedLayerRef.current.addGeoreferenceAnnotation(annotation);
        warpedLayerRef.current.setOpacity(opacity);
      } catch (err) {
        console.error("Failed to load historic map:", err);
        setActiveMapId(null);
      } finally {
        setLoading(false);
      }
    },
    [opacity]
  );

  const clearMap = useCallback(() => {
    if (!warpedLayerRef.current) return;
    warpedLayerRef.current.clear();
    setActiveMapId(null);
  }, []);

  useEffect(() => {
    if (warpedLayerRef.current && activeMapId) {
      warpedLayerRef.current.setOpacity(opacity);
    }
  }, [opacity, activeMapId]);

  if (!visible || index.length === 0) return null;

  return (
    <div className="absolute inset-x-3 top-3 z-20 max-h-[45vh] rounded-2xl border border-gray-700/50 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm lg:inset-x-auto lg:left-[17.5rem] lg:top-3 lg:w-72">
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
    </div>
  );
}
