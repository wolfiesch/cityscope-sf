import { createElement } from "react";
import { ScatterplotLayer } from "deck.gl";
import { ShieldAlert } from "lucide-react";
import type { CrimeDispatch, LayerDefinition, NormalizedFeature, LiveFeedItem, SelectedFeature } from "../types";

const PRIORITY_COLORS: Record<string, [number, number, number]> = {
  A: [255, 50, 50], B: [255, 140, 30], C: [255, 220, 50],
};

const PRIORITY_BADGE: Record<string, string> = {
  A: "bg-red-500/20 text-red-400 border border-red-500/40",
  B: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
  C: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
};

export function createCrimeLayer(data: CrimeDispatch[], visible: boolean, time?: number) {
  const pulse = time !== undefined ? Math.sin(time / 300) : 0;
  return new ScatterplotLayer<CrimeDispatch>({
    id: "crime",
    data: data.filter((d) => d.intersection_point?.coordinates),
    visible,
    getPosition: (d) => d.intersection_point!.coordinates as [number, number],
    getFillColor: (d) => PRIORITY_COLORS[d.priority_final] ?? PRIORITY_COLORS[d.priority_original] ?? [200, 200, 200],
    getRadius: (d) => {
      const priority = d.priority_final || d.priority_original;
      if (priority === "A" && time !== undefined) return 40 + pulse * 15;
      return 40;
    },
    radiusMinPixels: 4, radiusMaxPixels: 20, opacity: 0.8,
    pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 200],
    radiusScale: 1,
    updateTriggers: { getRadius: time !== undefined ? [Math.floor(time / 300)] : undefined },
  });
}

export const crimeLayerDef: LayerDefinition<CrimeDispatch> = {
  id: "crime",
  group: "Public Safety",
  label: "Police Dispatch",
  icon: createElement(ShieldAlert, { size: 18 }),
  color: "#ff3232",
  borderClass: "border-l-red-500",
  description: "Live calls by priority",
  defaultVisible: true,
  isLive: true,
  fetchConfig: {
    type: "soda",
    dataset: "gnap-fj3t",
    limit: 200,
    order: "received_datetime DESC",
    where: "received_datetime > '" + new Date(Date.now() - 86400000).toISOString().slice(0, 19) + "'",
  },
  createLayer: (data, visible, time) => createCrimeLayer(data, visible, time),
  normalizeFeature: (d: CrimeDispatch): NormalizedFeature => {
    const priority = d.priority_final || d.priority_original;
    return {
      layerId: "crime",
      title: d.call_type_original_desc || d.call_type_final_desc || d.call_type_original,
      time: d.received_datetime,
      badge: priority ? { text: `Priority ${priority}`, className: PRIORITY_BADGE[priority] ?? "text-gray-400" } : undefined,
      fields: [
        ...(d.intersection_name ? [{ label: "Location", value: d.intersection_name }] : []),
        ...(d.analysis_neighborhood ? [{ label: "Neighborhood", value: d.analysis_neighborhood }] : []),
        ...(d.police_district ? [{ label: "District", value: d.police_district }] : []),
      ],
      raw: { ...d } as unknown as Record<string, unknown>,
    };
  },
  getTooltip: (d: CrimeDispatch) => ({
    text: `${d.call_type_original_desc || d.call_type_original} [${d.priority_final || d.priority_original}]`,
    style: { backgroundColor: "rgba(0,0,0,0.85)", color: "#ff6666", fontSize: "12px", padding: "6px 10px", borderRadius: "4px" },
  }),
  toLiveFeedItems: (data: CrimeDispatch[]): LiveFeedItem[] =>
    data.filter((d) => d.intersection_point?.coordinates).slice(0, 12).map((d) => {
      const priority = d.priority_final || d.priority_original;
      const coords = d.intersection_point!.coordinates;
      const normalized = crimeLayerDef.normalizeFeature(d);
      const sf: SelectedFeature = { layer: "crime", properties: normalized.raw, normalized };
      const dedupeKey = d.cad_number
        ? `crime-${d.cad_number}`
        : `crime-${d.call_type_original_desc || d.call_type_final_desc || d.call_type_original}-${d.intersection_name}-${d.received_datetime}`;
      return {
        layerId: "crime",
        key: d.cad_number || dedupeKey,
        dedupeKey,
        time: d.received_datetime,
        title: d.call_type_original_desc || d.call_type_final_desc || d.call_type_original,
        subtitle: d.intersection_name ? `${d.intersection_name} - ${d.analysis_neighborhood}` : d.analysis_neighborhood,
        location: { longitude: coords[0], latitude: coords[1] },
        selectedFeature: sf,
        badge: priority ? { text: priority, className: PRIORITY_BADGE[priority] ?? "text-gray-400" } : undefined,
      };
    }),
};
