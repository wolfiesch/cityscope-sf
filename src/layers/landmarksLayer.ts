import { ScatterplotLayer } from "deck.gl";
import type { Landmark, LayerDefinition, NormalizedFeature } from "../types";

export function createLandmarksLayer(data: Landmark[], visible: boolean) {
  return new ScatterplotLayer<Landmark>({
    id: "landmarks", data, visible,
    getPosition: (d) => [d.lng, d.lat],
    getFillColor: (d) => d.source === "nrhp" ? [255, 215, 0] : [255, 180, 50],
    getLineColor: [255, 255, 255],
    getRadius: 60, radiusMinPixels: 5, radiusMaxPixels: 25,
    lineWidthMinPixels: 1, stroked: true, opacity: 0.9,
    pickable: true, autoHighlight: true, highlightColor: [255, 255, 200, 220],
  });
}

export const landmarksLayerDef: LayerDefinition<Landmark> = {
  id: "landmarks",
  group: "Historic",
  label: "Landmarks",
  icon: "\u{2B50}",
  color: "#ffd700",
  borderClass: "border-l-yellow-400",
  description: "NRHP + OSM historic sites",
  defaultVisible: true,
  isLive: false,
  fetchConfig: { type: "static", url: "/data/landmarks.json" },
  createLayer: (data, visible) => createLandmarksLayer(data, visible),
  normalizeFeature: (d: Landmark): NormalizedFeature => ({
    layerId: "landmarks",
    title: d.name,
    badge: {
      text: d.source === "nrhp" ? "National Register" : "OpenStreetMap",
      className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
    },
    fields: [
      ...(d.year ? [{ label: "Year", value: String(d.year) }] : []),
      ...(d.description ? [{ label: "Description", value: d.description }] : []),
    ],
    raw: { name: d.name, source: d.source, year: d.year, description: d.description, nrhp_id: d.nrhp_id, wikidata_id: d.wikidata_id },
  }),
  getTooltip: (d: Landmark) => ({
    text: d.name,
    style: { backgroundColor: "rgba(0,0,0,0.85)", color: "#ffd700", fontSize: "13px", padding: "6px 10px", borderRadius: "4px", fontWeight: "bold" },
  }),
};
