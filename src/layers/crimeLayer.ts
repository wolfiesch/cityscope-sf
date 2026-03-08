import { ScatterplotLayer } from "deck.gl";
import type { CrimeDispatch } from "../types";

// Priority colors: A=red, B=orange, C=yellow
const PRIORITY_COLORS: Record<string, [number, number, number]> = {
  A: [255, 50, 50],
  B: [255, 140, 30],
  C: [255, 220, 50],
};

export function createCrimeLayer(data: CrimeDispatch[], visible: boolean) {
  return new ScatterplotLayer<CrimeDispatch>({
    id: "crime",
    data: data.filter(
      (d) => d.intersection_point?.coordinates
    ),
    visible,
    getPosition: (d) => d.intersection_point!.coordinates as [number, number],
    getFillColor: (d) =>
      PRIORITY_COLORS[d.priority_final] ?? PRIORITY_COLORS[d.priority_original] ?? [200, 200, 200],
    getRadius: 40,
    radiusMinPixels: 4,
    radiusMaxPixels: 20,
    opacity: 0.8,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 200],
    // Pulsing via animation parameters
    radiusScale: 1,
    transitions: {
      getRadius: 600,
    },
  });
}
