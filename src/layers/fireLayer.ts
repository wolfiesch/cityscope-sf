import { ScatterplotLayer } from "deck.gl";
import type { FireCall } from "../types";

export function createFireLayer(data: FireCall[], visible: boolean, time?: number) {
  const pulse = time !== undefined ? Math.sin(time / 300) : 0;

  return new ScatterplotLayer<FireCall>({
    id: "fire",
    data: data.filter((d) => d.point?.coordinates),
    visible,
    getPosition: (d) => d.point!.coordinates as [number, number],
    getFillColor: (d) =>
      d.call_type_group === "Potentially Life-Threatening"
        ? [255, 40, 40]
        : [255, 130, 50],
    getRadius: (d) => {
      if (d.call_type_group === "Potentially Life-Threatening" && time !== undefined) {
        return 35 + pulse * 12;
      }
      return 35;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 18,
    opacity: 0.8,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 200, 150, 200],
    updateTriggers: {
      getRadius: time !== undefined ? [Math.floor(time / 300)] : undefined,
    },
  });
}
