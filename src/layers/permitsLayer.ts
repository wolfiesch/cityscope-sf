import { createElement } from "react";
import { ScatterplotLayer } from "deck.gl";
import { HardHat } from "lucide-react";
import { LAYER_ICON_SIZE, type PermitPoint, type LayerDefinition, type NormalizedFeature } from "../types";

const TYPE_COLORS: Record<number, [number, number, number]> = {
  0: [120, 120, 120], 1: [255, 70, 70], 2: [70, 140, 255], 3: [70, 220, 100],
};

const TYPE_NAMES = ["Other", "Demolition", "Renovation/Alteration", "New Construction"];

const TYPE_BADGE_STYLES: Record<string, string> = {
  Demolition: "bg-red-500/20 text-red-400 border border-red-500/40",
  "Renovation/Alteration": "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  "New Construction": "bg-green-500/20 text-green-400 border border-green-500/40",
  Other: "bg-gray-500/20 text-gray-400 border border-gray-500/40",
};

const TOOLTIP_STYLE: Record<string, string> = {
  backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "4px",
};

export function createPermitsLayer(data: PermitPoint[], visible: boolean) {
  return new ScatterplotLayer<PermitPoint>({
    id: "permits", data, visible,
    getPosition: (d) => [d[0], d[1]],
    getFillColor: (d) => TYPE_COLORS[d[2]] ?? TYPE_COLORS[0],
    getRadius: 12, radiusMinPixels: 2, radiusMaxPixels: 10, opacity: 0.7,
    pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 180],
  });
}

export const permitsLayerDef: LayerDefinition<PermitPoint> = {
  id: "permits",
  group: "Historic",
  label: "Building Permits",
  icon: createElement(HardHat, { size: LAYER_ICON_SIZE }),
  color: "#46dc64",
  borderClass: "border-l-green-500",
  description: "Active construction/demo",
  defaultVisible: false,
  isLive: false,
  fetchConfig: { type: "none" },
  createLayer: () => null,
  normalizeFeature: (d: PermitPoint): NormalizedFeature => {
    const typeName = TYPE_NAMES[d[2]] ?? TYPE_NAMES[0];
    const fields: { label: string; value: string }[] = [];
    if (d[4]) fields.push({ label: "Year", value: String(d[4]) });
    if (d[5]) fields.push({ label: "Description", value: d[5] });
    return {
      layerId: "permits",
      title: d[3],
      badge: { text: typeName, className: TYPE_BADGE_STYLES[typeName] ?? TYPE_BADGE_STYLES.Other },
      fields,
      raw: { address: d[3], type: typeName, year: d[4], description: d[5] },
    };
  },
  getTooltip: (d: PermitPoint) => ({
    text: `${d[3]} (${d[4] ?? "?"})`,
    style: TOOLTIP_STYLE,
  }),
};
