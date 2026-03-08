import { useState, useEffect, useCallback } from "react";
import { CityMap } from "./components/CityMap";
import { LayerPanel } from "./components/LayerPanel";
import { DetailPanel } from "./components/DetailPanel";
import { StatsBar } from "./components/StatsBar";
import { LiveFeed } from "./components/LiveFeed";
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

function App() {
  // Static data
  const [heritage, setHeritage] = useState<HeritagePoint[]>([]);
  const [permits, setPermits] = useState<PermitPoint[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

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

  return (
    <div className="w-screen h-screen bg-gray-950 overflow-hidden relative">
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
      />

      <LayerPanel
        visibility={visibility}
        onToggle={toggleLayer}
        counts={counts}
      />

      <DetailPanel feature={selected} onClose={() => setSelected(null)} />

      <LiveFeed crimeData={crimeData} threeOneOneData={threeOneOneData} />
    </div>
  );
}

export default App;
