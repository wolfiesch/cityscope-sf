import { ScatterplotLayer } from "deck.gl";
import type { HeritagePoint } from "../types";

// Category colors: 0=gray(unknown), 1=gold(A-Historic), 2=blue(B-Potential), 3=dim-gray(C-Not)
const CATEGORY_COLORS: Record<number, [number, number, number]> = {
  0: [100, 100, 100],
  1: [255, 200, 50],   // gold - Known Historic
  2: [80, 160, 255],   // blue - Potential
  3: [60, 60, 60],     // dim gray - Not Historic
};

export function createHeritageLayer(data: HeritagePoint[], visible: boolean) {
  return new ScatterplotLayer<HeritagePoint>({
    id: "heritage",
    data,
    visible,
    getPosition: (d) => [d[0], d[1]],
    getFillColor: (d) => CATEGORY_COLORS[d[2]] ?? CATEGORY_COLORS[0],
    getRadius: 8,
    radiusMinPixels: 1.5,
    radiusMaxPixels: 12,
    opacity: 0.6,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 180],
  });
}
