import { createElement } from "react";
import { Building } from "lucide-react";
import type { LayerDefinition } from "../types";

export const buildings3dLayerDef: LayerDefinition = {
  id: "buildings3d",
  group: "Infrastructure",
  label: "3D Buildings",
  icon: createElement(Building, { size: 18 }),
  color: "#4a90d9",
  borderClass: "border-l-blue-400",
  description: "Extruded building footprints",
  defaultVisible: false,
  isLive: false,
  fetchConfig: { type: "none" },
  createLayer: () => null,
  normalizeFeature: () => ({
    layerId: "buildings3d",
    title: "Building",
    fields: [],
    raw: {},
  }),
  getTooltip: () => null,
};
