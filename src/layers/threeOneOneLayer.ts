import { createElement } from "react";
import { ScatterplotLayer } from "deck.gl";
import { PhoneCall } from "lucide-react";
import type { ThreeOneOneRequest, LayerDefinition, NormalizedFeature, LiveFeedItem, SelectedFeature } from "../types";

export function createThreeOneOneLayer(data: ThreeOneOneRequest[], visible: boolean) {
  return new ScatterplotLayer<ThreeOneOneRequest>({
    id: "threeOneOne", data: data.filter((d) => d.lat && d.long), visible,
    getPosition: (d) => [parseFloat(d.long), parseFloat(d.lat)],
    getFillColor: [50, 200, 180],
    getRadius: 30, radiusMinPixels: 3, radiusMaxPixels: 15, opacity: 0.75,
    pickable: true, autoHighlight: true, highlightColor: [100, 255, 230, 200],
  });
}

export const threeOneOneLayerDef: LayerDefinition<ThreeOneOneRequest> = {
  id: "threeOneOne",
  group: "Urban Life",
  label: "311 Reports",
  icon: createElement(PhoneCall, { size: 18 }),
  color: "#32c8b4",
  borderClass: "border-l-teal-500",
  description: "Service requests + photos",
  defaultVisible: true,
  isLive: true,
  fetchConfig: {
    type: "soda",
    dataset: "vw6y-z8j6",
    limit: 200,
    order: "requested_datetime DESC",
    where: "requested_datetime > '" + new Date(Date.now() - 86400000).toISOString().slice(0, 19) + "'",
  },
  createLayer: (data, visible) => createThreeOneOneLayer(data, visible),
  normalizeFeature: (d: ThreeOneOneRequest): NormalizedFeature => ({
    layerId: "threeOneOne",
    title: d.service_name,
    subtitle: d.service_subtype || undefined,
    time: d.requested_datetime,
    mediaUrl: d.media_url || undefined,
    badge: d.status_description ? { text: d.status_description, className: "bg-teal-500/20 text-teal-400 border border-teal-500/40" } : undefined,
    fields: [
      ...(d.address ? [{ label: "Address", value: d.address }] : []),
      ...(d.neighborhoods_sffind_boundaries ? [{ label: "Neighborhood", value: d.neighborhoods_sffind_boundaries }] : []),
    ],
    raw: { ...d } as unknown as Record<string, unknown>,
  }),
  getTooltip: (d: ThreeOneOneRequest) => ({
    text: `${d.service_name}: ${d.service_subtype || ""}`,
    style: { backgroundColor: "rgba(0,0,0,0.85)", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "4px" },
  }),
  toLiveFeedItems: (data: ThreeOneOneRequest[]): LiveFeedItem[] =>
    data.filter((d) => d.lat && d.long).slice(0, 10).map((d) => {
      const normalized = threeOneOneLayerDef.normalizeFeature(d);
      const sf: SelectedFeature = { layer: "threeOneOne", properties: normalized.raw, normalized };
      return {
        layerId: "threeOneOne",
        key: d.service_request_id,
        dedupeKey: `threeOneOne-${d.service_request_id}`,
        time: d.requested_datetime,
        title: d.service_name,
        subtitle: d.neighborhoods_sffind_boundaries || d.address,
        location: { longitude: parseFloat(d.long), latitude: parseFloat(d.lat) },
        selectedFeature: sf,
        badge: { text: "311", className: "bg-teal-500/20 text-teal-400 border border-teal-500/40" },
      };
    }),
};
