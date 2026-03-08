import type { LayerDefinition } from "../types";

export const buildings3dLayerDef: LayerDefinition = {
  id: "buildings3d",
  group: "Infrastructure",
  label: "3D Buildings",
  icon: "\u{1F3D7}\uFE0F",
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
