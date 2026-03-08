import { ScatterplotLayer } from "deck.gl";
import type { PermitPoint } from "../types";

// Type colors: 0=gray, 1=red(demolition), 2=blue(renovation), 3=green(new construction)
const TYPE_COLORS: Record<number, [number, number, number]> = {
  0: [120, 120, 120],
  1: [255, 70, 70],    // red - demolition
  2: [70, 140, 255],   // blue - renovation
  3: [70, 220, 100],   // green - new construction
};

export function createPermitsLayer(data: PermitPoint[], visible: boolean) {
  return new ScatterplotLayer<PermitPoint>({
    id: "permits",
    data,
    visible,
    getPosition: (d) => [d[0], d[1]],
    getFillColor: (d) => TYPE_COLORS[d[2]] ?? TYPE_COLORS[0],
    getRadius: 12,
    radiusMinPixels: 2,
    radiusMaxPixels: 10,
    opacity: 0.7,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 180],
  });
}
