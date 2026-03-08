import { useState, useEffect, useRef, useCallback } from "react";
import { LAYER_REGISTRY } from "../lib/layerRegistry";
import { fetchSoda } from "../lib/soda";
import type { LayerDataState, FetchConfig } from "../types";

type DataMap = Record<string, LayerDataState>;

const EMPTY_STATE: LayerDataState = {
  data: [],
  loading: false,
  error: null,
  status: "idle",
  lastUpdated: null,
};

async function fetchForConfig(config: FetchConfig): Promise<unknown[]> {
  switch (config.type) {
    case "soda":
      return fetchSoda({
        dataset: config.dataset,
        limit: config.limit,
        where: config.where,
        order: config.order,
        select: config.select,
      });
    case "static": {
      const res = await fetch(config.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    }
    case "external": {
      const url = typeof config.url === "function" ? config.url() : config.url;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const raw = await res.json();
      return config.transform(raw);
    }
    case "none":
      return [];
  }
}

export function useLayerDataManager(visibility: Record<string, boolean>): DataMap {
  const [dataMap, setDataMap] = useState<DataMap>(() => {
    const initial: DataMap = {};
    for (const def of LAYER_REGISTRY) {
      initial[def.id] = { ...EMPTY_STATE };
    }
    return initial;
  });

  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const fetchedStaticRef = useRef<Set<string>>(new Set());

  const fetchLayer = useCallback(async (id: string, config: FetchConfig) => {
    setDataMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], loading: true, status: "loading", error: null },
    }));

    try {
      const data = await fetchForConfig(config);
      setDataMap((prev) => ({
        ...prev,
        [id]: { data, loading: false, error: null, status: "ready", lastUpdated: Date.now() },
      }));
    } catch (e) {
      setDataMap((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          loading: false,
          error: e instanceof Error ? e.message : "Unknown error",
          status: "error",
        },
      }));
    }
  }, []);

  useEffect(() => {
    for (const def of LAYER_REGISTRY) {
      const isVisible = visibility[def.id] ?? false;
      const hasInterval = def.id in intervalsRef.current;

      if (isVisible) {
        const config = def.fetchConfig;
        if (config.type === "none") continue;

        if (config.type === "static") {
          if (!fetchedStaticRef.current.has(def.id)) {
            fetchedStaticRef.current.add(def.id);
            fetchLayer(def.id, config);
          }
          continue;
        }

        if (!hasInterval) {
          fetchLayer(def.id, config);
          const interval = "interval" in config && config.interval
            ? config.interval
            : 60000;
          intervalsRef.current[def.id] = setInterval(
            () => fetchLayer(def.id, config),
            interval
          );
        }
      } else {
        if (hasInterval) {
          clearInterval(intervalsRef.current[def.id]);
          delete intervalsRef.current[def.id];
        }
      }
    }

    return () => {
      for (const id of Object.keys(intervalsRef.current)) {
        clearInterval(intervalsRef.current[id]);
      }
      intervalsRef.current = {};
    };
  }, [visibility, fetchLayer]);

  return dataMap;
}
