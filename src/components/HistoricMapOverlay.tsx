import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import { WarpedMapLayer } from "@allmaps/maplibre";

interface HistoricMap {
  id: string;
  title: string;
  year: number;
  iiif_base: string;
  width: number;
  height: number;
  gcps: { location: [number, number]; pixel: [number, number] }[];
}

function generateAnnotation(m: HistoricMap) {
  const gcpFeatures = m.gcps.map((gcp) => ({
    type: "Feature" as const,
    properties: { resourceCoords: gcp.pixel },
    geometry: { type: "Point" as const, coordinates: gcp.location },
  }));

  const svgSelector = `<svg width="${m.width}" height="${m.height}"><polygon points="0,0 ${m.width},0 ${m.width},${m.height} 0,${m.height}"/></svg>`;

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
          transformation: { type: "polynomial", options: { order: 1 } },
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
  const [maps, setMaps] = useState<HistoricMap[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.65);
  const [loading, setLoading] = useState(false);

  // Load map data
  useEffect(() => {
    fetch("/data/historic_maps.json")
      .then((r) => r.json())
      .then(setMaps);
  }, []);

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
    async (m: HistoricMap) => {
      if (!warpedLayerRef.current) return;
      setLoading(true);
      try {
        warpedLayerRef.current.clear();
        const annotation = generateAnnotation(m);
        await warpedLayerRef.current.addGeoreferenceAnnotation(annotation);
        warpedLayerRef.current.setOpacity(opacity);
        setActiveMapId(m.id);
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

  // Update opacity live
  useEffect(() => {
    if (warpedLayerRef.current && activeMapId) {
      warpedLayerRef.current.setOpacity(opacity);
    }
  }, [opacity, activeMapId]);

  if (!visible || maps.length === 0) return null;

  return (
    <div className="absolute top-14 left-[17.5rem] bg-gray-900/95 backdrop-blur-sm rounded-xl p-3 w-56 shadow-2xl border border-gray-700/50 z-10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 font-bold text-xs tracking-wider uppercase">
          Historic Maps
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

      <div className="space-y-1">
        {maps.map((m) => (
          <button
            key={m.id}
            onClick={() =>
              activeMapId === m.id ? clearMap() : loadMap(m)
            }
            className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all ${
              activeMapId === m.id
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                : "bg-gray-800/50 hover:bg-gray-800/80 text-gray-300 border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold">{m.year}</span>
              {loading && activeMapId === null && (
                <span className="text-gray-500 text-xs">...</span>
              )}
            </div>
            <div className="text-xs text-gray-400 truncate mt-0.5">
              {m.title}
            </div>
          </button>
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
