const SODA_BASE = "https://data.sfgov.org/resource";

export interface SodaQuery {
  dataset: string;
  limit?: number;
  where?: string;
  order?: string;
  select?: string;
}

export async function fetchSoda<T>(query: SodaQuery): Promise<T[]> {
  const params = new URLSearchParams();
  params.set("$limit", String(query.limit ?? 200));
  if (query.where) params.set("$where", query.where);
  if (query.order) params.set("$order", query.order);
  if (query.select) params.set("$select", query.select);

  const url = `${SODA_BASE}/${query.dataset}.json?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SODA ${res.status}: ${res.statusText}`);
  return res.json();
}

// Dataset IDs
export const DATASETS = {
  POLICE_DISPATCH: "gnap-fj3t",
  INCIDENT_REPORTS: "wg3w-h783",
  THREE_ONE_ONE: "vw6y-z8j6",
  FIRE_EMS: "nuek-vuh3",
} as const;
