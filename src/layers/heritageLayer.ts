import { HeatmapLayer } from "deck.gl";
import type { HeritagePoint } from "../types";

// Weight by historic significance: A(Known Historic)=3, B(Potential)=2, C/unknown=1
const CATEGORY_WEIGHT: Record<number, number> = {
  0: 1,
  1: 3,
  2: 2,
  3: 1,
};

// Gold-to-red heat palette
const COLOR_RANGE: [number, number, number][] = [
  [255, 255, 178],
  [254, 204, 92],
  [253, 141, 60],
  [240, 59, 32],
  [189, 0, 38],
];

export function createHeritageLayer(data: HeritagePoint[], visible: boolean) {
  return new HeatmapLayer<HeritagePoint>({
    id: "heritage",
    data,
    visible,
    getPosition: (d) => [d[0], d[1]],
    getWeight: (d) => CATEGORY_WEIGHT[d[2]] ?? 1,
    colorRange: COLOR_RANGE,
    radiusPixels: 30,
    intensity: 1.2,
    threshold: 0.05,
    opacity: 0.7,
    pickable: false,
  });
}
