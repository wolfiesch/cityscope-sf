import { useState, useEffect, useCallback } from "react";
import { FlyToInterpolator } from "deck.gl";
import type { MapViewState } from "deck.gl";
import { CityMap } from "./components/CityMap";
import { LayerPanel } from "./components/LayerPanel";
import { DetailPanel } from "./components/DetailPanel";
import { StatsBar } from "./components/StatsBar";
import { LiveFeed } from "./components/LiveFeed";
import { ExploreBar } from "./components/ExploreBar";
import { useSodaApi } from "./hooks/useSodaApi";
import { DATASETS } from "./lib/soda";
import type {
  HeritagePoint,
  PermitPoint,
  Landmark,
  CrimeDispatch,
  ThreeOneOneRequest,
  FireCall,
  LayerVisibility,
  SelectedFeature,
} from "./types";

// Cinematic intro: start zoomed out and tilted, then fly in
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

function App() {
  // Static data
  const [heritage, setHeritage] = useState<HeritagePoint[]>([]);
  const [permits, setPermits] = useState<PermitPoint[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  // Loading state
  const [loaded, setLoaded] = useState(false);

  // Controlled view state for cinematic flyover + presets
  const [viewState, setViewState] = useState<MapViewState>(START_VIEW);

  // Load static data on mount
  useEffect(() => {
    Promise.all([
      fetch("/data/heritage.json").then((r) => r.json()),
      fetch("/data/permits.json").then((r) => r.json()),
      fetch("/data/landmarks.json").then((r) => r.json()),
    ]).then(([h, p, l]) => {
      setHeritage(h);
      setPermits(p);
      setLandmarks(l);
      setLoaded(true);

      // Trigger cinematic flyover after brief pause
      setTimeout(() => {
        setViewState(LANDING_VIEW);
      }, 800);
    });
  }, []);

  // Live SODA data
  const { data: crimeData } = useSodaApi<CrimeDispatch>(
    {
      dataset: DATASETS.POLICE_DISPATCH,
      limit: 200,
      order: "received_datetime DESC",
    },
    60000
  );

  const { data: threeOneOneData } = useSodaApi<ThreeOneOneRequest>(
    {
      dataset: DATASETS.THREE_ONE_ONE,
      limit: 100,
      order: "requested_datetime DESC",
    },
    60000
  );

  const { data: fireData } = useSodaApi<FireCall>(
    {
      dataset: DATASETS.FIRE_EMS,
      limit: 100,
      order: "received_dttm DESC",
    },
    60000
  );

  // Layer visibility
  const [visibility, setVisibility] = useState<LayerVisibility>({
    heritage: true,
    permits: false,
    landmarks: true,
    crime: true,
    threeOneOne: true,
    fire: true,
  });

  // Historic map overlay toggle (separate from deck.gl layers)
  const [historicMapVisible, setHistoricMapVisible] = useState(false);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  // Selection
  const [selected, setSelected] = useState<SelectedFeature | null>(null);

  // Counts
  const counts: Record<keyof LayerVisibility, number> = {
    heritage: heritage.length,
    permits: permits.length,
    landmarks: landmarks.length,
    crime: crimeData.length,
    threeOneOne: threeOneOneData.length,
    fire: fireData.length,
  };

  const liveUpdatedAt = crimeData.length > 0 ? new Date() : null;

  // Explore presets handler
  const handlePreset = useCallback(
    (
      targetView: { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number },
      layers: Partial<Record<keyof LayerVisibility, boolean>>
    ) => {
      setViewState({
        ...targetView,
        transitionDuration: 2000,
        transitionInterpolator: new FlyToInterpolator(),
      });
      setVisibility((prev) => ({ ...prev, ...layers }));
      setSelected(null);
    },
    []
  );

  return (
    <div className="w-screen h-screen bg-gray-950 overflow-hidden relative">
      {/* Loading screen overlay */}
      {!loaded && (
        <div className="absolute inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center transition-opacity duration-1000">
          <h1 className="text-white text-4xl font-bold tracking-tight mb-2">
            CityScope <span className="text-gray-400 font-light">SF</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">Real-time urban intelligence</p>
          <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full loading-shimmer rounded-full" style={{ width: "100%" }} />
          </div>
          <p className="text-gray-500 text-sm mt-4">Loading 176,000 urban data points...</p>
        </div>
      )}

      <StatsBar counts={counts} liveUpdatedAt={liveUpdatedAt} />

      <CityMap
        heritage={heritage}
        permits={permits}
        landmarks={landmarks}
        crime={crimeData}
        threeOneOne={threeOneOneData}
        fire={fireData}
        visibility={visibility}
        onSelect={setSelected}
        viewState={viewState}
        onViewStateChange={setViewState}
        historicMapVisible={historicMapVisible}
      />

      <LayerPanel
        visibility={visibility}
        onToggle={toggleLayer}
        counts={counts}
        historicMapVisible={historicMapVisible}
        onToggleHistoricMap={() => setHistoricMapVisible((v) => !v)}
      />

      <DetailPanel feature={selected} onClose={() => setSelected(null)} />

      <ExploreBar onPreset={handlePreset} />

      <LiveFeed crimeData={crimeData} threeOneOneData={threeOneOneData} fireData={fireData} />
    </div>
  );
}

export default App;
