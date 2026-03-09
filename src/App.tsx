import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FlyToInterpolator } from "deck.gl";
import type { MapViewState } from "deck.gl";
import { CityMap } from "./components/CityMap";
import { LayerPanel } from "./components/LayerPanel";
import { DetailPanel } from "./components/DetailPanel";
import { StatsBar } from "./components/StatsBar";
import { LiveFeed } from "./components/LiveFeed";
import { ExploreBar } from "./components/ExploreBar";
import { useLayerDataManager } from "./hooks/useLayerDataManager";
import { LAYER_REGISTRY, getDefaultVisibility } from "./lib/layerRegistry";
import type { LiveFeedItem, SelectedFeature } from "./types";
import type { HistoricMapData } from "./components/HistoricMapOverlay";

const START_VIEW: MapViewState = {
  longitude: -122.44,
  latitude: 37.76,
  zoom: 10.5,
  pitch: 60,
  bearing: -30,
};

const LANDING_VIEW: MapViewState = {
  longitude: -122.44,
  latitude: 37.76,
  zoom: 13.5,
  pitch: 45,
  bearing: 0,
  transitionDuration: 3000,
  transitionInterpolator: new FlyToInterpolator(),
};

const STATIC_COUNT_FALLBACKS: Record<string, number> = {
  heritage: 145_000,
  permits: 30_000,
};

function App() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(getDefaultVisibility());
  const dataMap = useLayerDataManager(visibility);

  const counts = useMemo(
    () => Object.fromEntries(
      LAYER_REGISTRY.map((definition) => [
        definition.id,
        dataMap[definition.id]?.data.length || STATIC_COUNT_FALLBACKS[definition.id] || 0,
      ]),
    ),
    [dataMap],
  );

  const loaded = LAYER_REGISTRY
    .filter((definition) => definition.defaultVisible && definition.fetchConfig.type === "static")
    .every((definition) => (dataMap[definition.id]?.data.length ?? 0) > 0);

  const [viewState, setViewState] = useState<MapViewState>(START_VIEW);
  const flyoverTriggeredRef = useRef(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [loadingFadeOut, setLoadingFadeOut] = useState(false);

  useEffect(() => {
    if (loaded && !flyoverTriggeredRef.current) {
      flyoverTriggeredRef.current = true;
      setLoadingFadeOut(true);
      const viewTimer = window.setTimeout(() => setViewState(LANDING_VIEW), 800);
      const overlayTimer = window.setTimeout(() => setShowLoadingOverlay(false), 1200);
      return () => {
        clearTimeout(viewTimer);
        clearTimeout(overlayTimer);
      };
    }
  }, [loaded]);

  const [historicMapVisible, setHistoricMapVisible] = useState(false);
  const [historicMapData, setHistoricMapData] = useState<HistoricMapData | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isLayerDrawerOpen, setIsLayerDrawerOpen] = useState(false);
  const [isFeedExpanded, setIsFeedExpanded] = useState(false);
  const [selected, setSelected] = useState<SelectedFeature | null>(null);

  const toggleLayer = useCallback((layer: string) => {
    setActivePresetId(null);
    setVisibility((prev) => {
      const next = { ...prev, [layer]: !prev[layer] };

      if (layer === "buildings3d" && next.buildings3d) next.google3d = false;
      if (layer === "google3d" && next.google3d) next.buildings3d = false;

      return next;
    });
  }, []);

  const liveFeedItems = useMemo(() => {
    const grouped = new Map<string, { item: LiveFeedItem; count: number }>();

    for (const definition of LAYER_REGISTRY) {
      if (!definition.toLiveFeedItems) continue;

      const layerData = dataMap[definition.id]?.data;
      if (!layerData || layerData.length === 0) continue;

      for (const item of definition.toLiveFeedItems(layerData)) {
        const existing = grouped.get(item.dedupeKey);
        if (!existing) {
          grouped.set(item.dedupeKey, { item, count: 1 });
          continue;
        }

        const latestItem =
          new Date(item.time).getTime() > new Date(existing.item.time).getTime()
            ? item
            : existing.item;

        grouped.set(item.dedupeKey, {
          item: latestItem,
          count: existing.count + 1,
        });
      }
    }

    return Array.from(grouped.values())
      .map(({ item, count }) => ({
        ...item,
        duplicateCount: count > 1 ? count : undefined,
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [dataMap]);

  const liveUpdatedAt = useMemo(() => {
    let max: number | null = null;

    for (const definition of LAYER_REGISTRY) {
      if (!definition.isLive) continue;

      const lastUpdated = dataMap[definition.id]?.lastUpdated;
      if (lastUpdated != null && (max == null || lastUpdated > max)) {
        max = lastUpdated;
      }
    }

    return max != null ? new Date(max) : null;
  }, [dataMap]);

  const handlePreset = useCallback(
    (
      presetId: string,
      targetView: { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number },
      layers: Record<string, boolean>,
    ) => {
      setViewState({
        ...targetView,
        transitionDuration: 2000,
        transitionInterpolator: new FlyToInterpolator(),
      });
      setVisibility(() => ({
        ...Object.fromEntries(LAYER_REGISTRY.map((definition) => [definition.id, false])),
        ...layers,
      }));
      setHistoricMapVisible(false);
      setHistoricMapData(null);
      setActivePresetId(presetId);
      setIsLayerDrawerOpen(false);
      setIsFeedExpanded(false);
      setSelected(null);
    },
    [],
  );

  const handleSelect = useCallback((feature: SelectedFeature | null) => {
    setSelected(feature);
    if (!feature) return;
    setIsLayerDrawerOpen(false);
    setIsFeedExpanded(false);
  }, []);

  const handleLiveFeedSelect = useCallback((item: LiveFeedItem) => {
    setActivePresetId(null);
    setIsLayerDrawerOpen(false);
    setIsFeedExpanded(false);

    if (item.selectedFeature) {
      setSelected(item.selectedFeature);
    }

    if (!item.location) return;

    const { longitude, latitude } = item.location;
    setViewState((prev) => ({
      ...prev,
      longitude,
      latitude,
      zoom: Math.max(prev.zoom, 14.25),
      pitch: Math.max(prev.pitch ?? 0, 28),
      transitionDuration: 1100,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  }, []);

  const activeLayerCount = useMemo(() => {
    const visibleLayers = Object.values(visibility).filter(Boolean).length;
    return visibleLayers + (historicMapVisible ? 1 : 0);
  }, [historicMapVisible, visibility]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-950">
      {showLoadingOverlay && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 transition-all duration-1000 ${loadingFadeOut ? "opacity-0 scale-105" : "opacity-100 scale-100"}`}>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">
            CityScope <span className="font-light text-gray-400">SF</span>
          </h1>
          <p className="mb-8 text-lg text-gray-400">Real-time urban intelligence</p>
          <div className="h-1 w-64 overflow-hidden rounded-full bg-gray-800">
            <div className="loading-shimmer h-full rounded-full" style={{ width: "100%" }} />
          </div>
          <p className="mt-4 text-sm text-gray-500">Initializing map layers...</p>
        </div>
      )}

      <StatsBar
        counts={counts}
        liveUpdatedAt={liveUpdatedAt}
        activeLayerCount={activeLayerCount}
        onOpenLayers={() => {
          setSelected(null);
          setIsLayerDrawerOpen(true);
        }}
      />

      <LayerPanel
        visibility={visibility}
        onToggle={toggleLayer}
        counts={counts}
        historicMapVisible={historicMapVisible}
        onToggleHistoricMap={() => {
          setActivePresetId(null);
          setHistoricMapVisible((visible) => !visible);
        }}
        mobileOpen={isLayerDrawerOpen}
        onClose={() => setIsLayerDrawerOpen(false)}
      />

      <ExploreBar activePresetId={activePresetId} onPreset={handlePreset} />

      <DetailPanel feature={selected} onClose={() => setSelected(null)} />
      <DetailPanel variant="mobile" feature={selected} onClose={() => setSelected(null)} />

      <LiveFeed
        items={liveFeedItems}
        expanded={isFeedExpanded}
        onToggleExpanded={() => setIsFeedExpanded((expanded) => !expanded)}
        onSelectItem={handleLiveFeedSelect}
      />

      <CityMap
        dataMap={dataMap}
        visibility={visibility}
        onSelect={handleSelect}
        viewState={viewState}
        onViewStateChange={setViewState}
        historicMapVisible={historicMapVisible}
        historicMapData={historicMapData}
        onHistoricMapSelect={setHistoricMapData}
      />
    </div>
  );
}

export default App;
