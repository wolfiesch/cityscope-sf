import { createElement } from "react";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { Tiles3DLoader } from "@loaders.gl/3d-tiles";
import { Globe } from "lucide-react";
import { LAYER_ICON_SIZE, type LayerDefinition } from "../types";

const TILES_URL = "https://tile.googleapis.com/v1/3dtiles/root.json";

export const google3dLayerDef: LayerDefinition = {
  id: "google3d",
  group: "Infrastructure",
  label: "Satellite 3D",
  icon: createElement(Globe, { size: LAYER_ICON_SIZE }),
  color: "#34a853",
  borderClass: "border-l-green-500",
  description: "Google Photorealistic 3D Tiles",
  defaultVisible: false,
  isLive: false,
  fetchConfig: { type: "none" },
  createLayer: (_data: unknown[], visible: boolean) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !visible) return null;

    return new Tile3DLayer({
      id: "google3d",
      data: TILES_URL,
      loaders: [Tiles3DLoader],
      loadOptions: {
        fetch: { headers: { "X-GOOG-API-KEY": apiKey } },
      },
      pickable: false,
    });
  },
  normalizeFeature: () => ({
    layerId: "google3d",
    title: "3D Tile",
    fields: [],
    raw: {},
  }),
  getTooltip: () => null,
};
