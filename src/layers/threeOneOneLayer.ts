import { ScatterplotLayer } from "deck.gl";
import type { ThreeOneOneRequest } from "../types";

export function createThreeOneOneLayer(
  data: ThreeOneOneRequest[],
  visible: boolean
) {
  return new ScatterplotLayer<ThreeOneOneRequest>({
    id: "311",
    data: data.filter((d) => d.lat && d.long),
    visible,
    getPosition: (d) => [parseFloat(d.long), parseFloat(d.lat)],
    getFillColor: [50, 200, 180],
    getRadius: 30,
    radiusMinPixels: 3,
    radiusMaxPixels: 15,
    opacity: 0.75,
    pickable: true,
    autoHighlight: true,
    highlightColor: [100, 255, 230, 200],
  });
}
