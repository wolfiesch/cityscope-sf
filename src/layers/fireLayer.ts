import { createElement } from "react";
import { ScatterplotLayer } from "deck.gl";
import { Flame } from "lucide-react";
import type { FireCall, LayerDefinition, NormalizedFeature, LiveFeedItem, SelectedFeature } from "../types";

export function createFireLayer(data: FireCall[], visible: boolean, time?: number) {
  const pulse = time !== undefined ? Math.sin(time / 300) : 0;
  return new ScatterplotLayer<FireCall>({
    id: "fire", data: data.filter((d) => d.point?.coordinates), visible,
    getPosition: (d) => d.point!.coordinates as [number, number],
    getFillColor: (d) => d.call_type_group === "Potentially Life-Threatening" ? [255, 40, 40] : [255, 130, 50],
    getRadius: (d) => {
      if (d.call_type_group === "Potentially Life-Threatening" && time !== undefined) return 35 + pulse * 12;
      return 35;
    },
    radiusMinPixels: 4, radiusMaxPixels: 18, opacity: 0.8,
    pickable: true, autoHighlight: true, highlightColor: [255, 200, 150, 200],
    updateTriggers: { getRadius: time !== undefined ? [Math.floor(time / 300)] : undefined },
  });
}

export const fireLayerDef: LayerDefinition<FireCall> = {
  id: "fire",
  group: "Public Safety",
  label: "Fire & EMS",
  icon: createElement(Flame, { size: 18 }),
  color: "#ff8232",
  borderClass: "border-l-orange-500",
  description: "Live emergency calls",
  defaultVisible: true,
  isLive: true,
  fetchConfig: {
    type: "soda",
    dataset: "nuek-vuh3",
    limit: 200,
    order: "received_dttm DESC",
    where: "received_dttm > '" + new Date(Date.now() - 86400000).toISOString().slice(0, 19) + "'",
  },
  createLayer: (data, visible, time) => createFireLayer(data, visible, time),
  normalizeFeature: (d: FireCall): NormalizedFeature => {
    const isLifeThreat = d.call_type_group === "Potentially Life-Threatening";
    return {
      layerId: "fire",
      title: d.call_type,
      time: d.received_dttm,
      badge: isLifeThreat
        ? { text: "Life-Threatening", className: "bg-red-500/20 text-red-400 border border-red-500/40" }
        : d.call_type_group
          ? { text: d.call_type_group, className: "bg-orange-500/20 text-orange-400 border border-orange-500/40" }
          : undefined,
      fields: [
        ...(d.address ? [{ label: "Address", value: d.address }] : []),
        ...(d.neighborhoods_analysis_boundaries ? [{ label: "Neighborhood", value: d.neighborhoods_analysis_boundaries }] : []),
        ...(d.battalion ? [{ label: "Battalion", value: `${d.battalion}${d.station_area ? ` / Station ${d.station_area}` : ""}` }] : []),
      ],
      raw: { ...d } as unknown as Record<string, unknown>,
    };
  },
  getTooltip: (d: FireCall) => ({
    text: `${d.call_type} - ${d.address}`,
    style: { backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "4px" },
  }),
  toLiveFeedItems: (data: FireCall[]): LiveFeedItem[] =>
    data.filter((d) => d.point?.coordinates).slice(0, 10).map((d) => {
      const coords = d.point!.coordinates;
      const normalized = fireLayerDef.normalizeFeature(d);
      const sf: SelectedFeature = { layer: "fire", properties: normalized.raw, normalized };
      const dedupeKey = d.call_number
        ? `fire-${d.call_number}`
        : `fire-${d.call_type}-${d.address}-${d.received_dttm}`;
      return {
        layerId: "fire",
        key: d.call_number || dedupeKey,
        dedupeKey,
        time: d.received_dttm,
        title: d.call_type,
        subtitle: d.address ? `${d.address} - ${d.neighborhoods_analysis_boundaries || ""}` : d.neighborhoods_analysis_boundaries || "",
        location: { longitude: coords[0], latitude: coords[1] },
        selectedFeature: sf,
        badge: { text: "FIRE", className: "bg-orange-500/20 text-orange-400 border border-orange-500/40" },
      };
    }),
};
