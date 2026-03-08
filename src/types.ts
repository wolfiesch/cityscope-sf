import type { Layer } from "deck.gl";
import type { ComponentType } from "react";

// Heritage: [lng, lat, category_code, name]
// category_code: 0=unknown, 1=Category A (Known Historic), 2=Category B (Potential), 3=Category C (Not Historic)
export type HeritagePoint = [number, number, number, string];

// Permits: [lng, lat, type_code, address, year, description]
// type_code: 0=other, 1=demolition, 2=renovation, 3=new construction
export type PermitPoint = [number, number, number, string, number | null, string];

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  source: "osm" | "nrhp";
  description: string;
  year: number | null;
  nrhp_id: string | null;
  wikidata_id: string | null;
}

// SODA API types
export interface CrimeDispatch {
  cad_number: string;
  call_type_original: string;
  call_type_original_desc: string;
  call_type_final: string;
  call_type_final_desc: string;
  priority_original: string;
  priority_final: string;
  received_datetime: string;
  onscene_datetime: string | null;
  intersection_point: { type: string; coordinates: [number, number] } | null;
  intersection_name: string;
  analysis_neighborhood: string;
  police_district: string;
  sensitive_call: boolean;
}

export interface ThreeOneOneRequest {
  service_request_id: string;
  service_name: string;
  service_subtype: string;
  lat: string;
  long: string;
  media_url: string | null;
  requested_datetime: string;
  status_description: string;
  address: string;
  neighborhoods_sffind_boundaries: string;
}

export interface FireCall {
  call_number: string;
  call_type: string;
  call_type_group: string;
  received_dttm: string;
  address: string;
  city: string;
  zipcode_of_incident: string;
  battalion: string;
  station_area: string;
  call_final_disposition: string;
  als_unit: boolean;
  point: { type: string; coordinates: [number, number] } | null;
  neighborhoods_analysis_boundaries: string;
}

// --- Layer Registry Types ---

export type LayerVisibility = Record<string, boolean>;

export type LayerGroup =
  | "Historic"
  | "Public Safety"
  | "Transportation"
  | "Urban Life"
  | "Environment"
  | "Infrastructure"
  | "Hazard Zones";

export type FetchConfig =
  | { type: "soda"; dataset: string; limit?: number; where?: string; order?: string; select?: string; interval?: number }
  | { type: "external"; url: string | (() => string); interval?: number; transform: (raw: unknown) => unknown[] }
  | { type: "static"; url: string }
  | { type: "none" };

export interface NormalizedFeature {
  layerId: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; className: string };
  time?: string;
  fields: { label: string; value: string }[];
  mediaUrl?: string;
  raw: Record<string, unknown>;
}

export interface LiveFeedItem {
  layerId: string;
  key: string;
  dedupeKey: string;
  time: string;
  title: string;
  subtitle: string;
  location?: { longitude: number; latitude: number };
  selectedFeature?: SelectedFeature;
  duplicateCount?: number;
  badge?: { text: string; className: string };
}

export interface LayerDataState {
  data: unknown[];
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
  lastUpdated: number | null;
}

export interface LayerDefinition<T = unknown> {
  id: string;
  group: LayerGroup;
  label: string;
  icon: string;
  color: string;
  borderClass: string;
  description: string;
  defaultVisible: boolean;
  isLive: boolean;
  fetchConfig: FetchConfig;
  createLayer: (data: T[], visible: boolean, time?: number) => Layer | null;
  normalizeFeature: (picked: T) => NormalizedFeature;
  getTooltip: (object: T) => { text: string; style: Record<string, string> } | null;
  detailCard?: ComponentType<{ feature: NormalizedFeature }>;
  toLiveFeedItems?: (data: T[]) => LiveFeedItem[];
}

export interface SelectedFeature {
  layer: string;
  properties: Record<string, unknown>;
  normalized?: NormalizedFeature;
}
