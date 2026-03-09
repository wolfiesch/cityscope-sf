import { createElement } from "react";
import { Landmark } from "lucide-react";
import { LAYER_ICON_SIZE, type HeritagePoint, type LayerDefinition, type NormalizedFeature } from "../types";

const CATEGORY_NAMES: Record<number, string> = {
  0: "Unknown",
  1: "Category A - Known Historic",
  2: "Category B - Potential",
  3: "Category C - Not Historic",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Category A - Known Historic": "Confirmed historic resource eligible for preservation under CEQA",
  "Category B - Potential": "Requires further review to determine historic significance",
  "Category C - Not Historic": "Determined not to be a historic resource",
};

const CATEGORY_BADGE_STYLES: Record<number, string> = {
  0: "bg-gray-500/20 text-gray-400 border border-gray-500/40",
  1: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
  2: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
  3: "bg-stone-500/20 text-stone-400 border border-stone-500/40",
};

/**
 * Normalize a heritage feature from either tuple format or MapLibre GeoJSON properties.
 * MapLibre queryRenderedFeatures returns { category_code, name, ... } as plain object.
 */
function normalizeHeritage(d: HeritagePoint | Record<string, unknown>): NormalizedFeature {
  const isTuple = Array.isArray(d);
  const categoryCode = isTuple ? d[2] : Number(d.category_code ?? 0);
  const name = isTuple ? d[3] : String(d.name ?? "");
  const lng = isTuple ? d[0] : Number(d.longitude ?? 0);
  const lat = isTuple ? d[1] : Number(d.latitude ?? 0);
  const categoryName = CATEGORY_NAMES[categoryCode] ?? "Unknown";
  const description = CATEGORY_DESCRIPTIONS[categoryName];

  const fields: { label: string; value: string }[] = [];
  if (description) fields.push({ label: "Designation", value: description });

  return {
    layerId: "heritage",
    title: name || "Heritage Site",
    badge: { text: categoryName, className: CATEGORY_BADGE_STYLES[categoryCode] ?? CATEGORY_BADGE_STYLES[0] },
    fields,
    raw: { name, category: categoryName, category_code: categoryCode, longitude: lng, latitude: lat },
  };
}

export const heritageLayerDef: LayerDefinition<HeritagePoint> = {
  id: "heritage",
  group: "Historic",
  label: "Heritage Sites",
  icon: createElement(Landmark, { size: LAYER_ICON_SIZE }),
  color: "#ffc832",
  borderClass: "border-l-amber-500",
  description: "145K parcels by CEQA category",
  defaultVisible: true,
  isLive: false,
  fetchConfig: { type: "none" },
  createLayer: () => null,
  normalizeFeature: normalizeHeritage as (d: HeritagePoint) => NormalizedFeature,
  getTooltip: (d: HeritagePoint) => ({
    text: d[3] || "Heritage site",
    style: { backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "4px" },
  }),
};

/** Normalize from MapLibre queryRenderedFeatures properties */
export { normalizeHeritage };
