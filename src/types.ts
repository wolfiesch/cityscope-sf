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
  call_type: string;
  call_type_original: string;
  priority: string;
  received_datetime: string;
  onscene_datetime: string | null;
  intersection_point: { type: string; coordinates: [number, number] } | null;
  analysis_neighborhood: string;
  disposition: string;
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

export interface LayerVisibility {
  heritage: boolean;
  permits: boolean;
  landmarks: boolean;
  crime: boolean;
  threeOneOne: boolean;
  fire: boolean;
}

export interface SelectedFeature {
  layer: string;
  properties: Record<string, unknown>;
}
