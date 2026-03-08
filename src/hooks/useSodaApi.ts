import { useState, useEffect, useCallback, useRef } from "react";
import { fetchSoda, type SodaQuery } from "../lib/soda";

export function useSodaApi<T>(
  query: SodaQuery,
  refreshInterval: number = 60000
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchSoda<T>(query);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [query.dataset, query.limit, query.where, query.order]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load, refreshInterval]);

  return { data, loading, error, refresh: load };
}
