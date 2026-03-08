import { ScatterplotLayer } from "deck.gl";
import type { Landmark } from "../types";

export function createLandmarksLayer(data: Landmark[], visible: boolean) {
  return new ScatterplotLayer<Landmark>({
    id: "landmarks",
    data,
    visible,
    getPosition: (d) => [d.lng, d.lat],
    getFillColor: (d) =>
      d.source === "nrhp" ? [255, 215, 0] : [255, 180, 50], // gold tones
    getLineColor: [255, 255, 255],
    getRadius: 60,
    radiusMinPixels: 5,
    radiusMaxPixels: 25,
    lineWidthMinPixels: 1,
    stroked: true,
    opacity: 0.9,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 200, 220],
  });
}
