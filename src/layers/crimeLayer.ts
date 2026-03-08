import { ScatterplotLayer } from "deck.gl";
import type { CrimeDispatch } from "../types";

// Priority colors: A=red, B=orange, C=yellow
const PRIORITY_COLORS: Record<string, [number, number, number]> = {
  A: [255, 50, 50],
  B: [255, 140, 30],
  C: [255, 220, 50],
};

export function createCrimeLayer(data: CrimeDispatch[], visible: boolean, time?: number) {
  const pulse = time !== undefined ? Math.sin(time / 300) : 0;

  return new ScatterplotLayer<CrimeDispatch>({
    id: "crime",
    data: data.filter((d) => d.intersection_point?.coordinates),
    visible,
    getPosition: (d) => d.intersection_point!.coordinates as [number, number],
    getFillColor: (d) =>
      PRIORITY_COLORS[d.priority_final] ?? PRIORITY_COLORS[d.priority_original] ?? [200, 200, 200],
    getRadius: (d) => {
      const priority = d.priority_final || d.priority_original;
      if (priority === "A" && time !== undefined) {
        return 40 + pulse * 15;
      }
      return 40;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 20,
    opacity: 0.8,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 200],
    radiusScale: 1,
    updateTriggers: {
      getRadius: time !== undefined ? [Math.floor(time / 300)] : undefined,
    },
  });
}
