import type { ReactNode } from "react";
import { Flame, Siren, ClipboardList, Swords } from "lucide-react";

interface Preset {
  id: string;
  label: string;
  icon: ReactNode;
  description: string;
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  layers: Record<string, boolean>;
}

const PRESETS: Preset[] = [
  {
    id: "heritage-hotspots",
    label: "Heritage Hotspots",
    icon: <Flame size={16} />,
    description: "Where SF's history lives",
    viewState: { longitude: -122.41, latitude: 37.788, zoom: 14, pitch: 50, bearing: -10 },
    layers: { heritage: true, landmarks: true, permits: false, crime: false, threeOneOne: false, fire: false },
  },
  {
    id: "live-emergencies",
    label: "Live Emergencies",
    icon: <Siren size={16} />,
    description: "Active 911 calls right now",
    viewState: { longitude: -122.42, latitude: 37.77, zoom: 13, pitch: 40, bearing: 0 },
    layers: { heritage: false, landmarks: false, permits: false, crime: true, threeOneOne: false, fire: true },
  },
  {
    id: "street-reports",
    label: "Street Reports",
    icon: <ClipboardList size={16} />,
    description: "311 + crime in the Mission",
    viewState: { longitude: -122.418, latitude: 37.76, zoom: 14.5, pitch: 35, bearing: 15 },
    layers: { heritage: false, landmarks: false, permits: false, crime: true, threeOneOne: true, fire: false },
  },
  {
    id: "dev-vs-history",
    label: "Dev vs History",
    icon: <Swords size={16} />,
    description: "Construction meets heritage",
    viewState: { longitude: -122.398, latitude: 37.778, zoom: 14.5, pitch: 45, bearing: -20 },
    layers: { heritage: true, landmarks: true, permits: true, crime: false, threeOneOne: false, fire: false },
  },
];

interface ExploreBarProps {
  activePresetId: string | null;
  onPreset: (
    presetId: string,
    viewState: Preset["viewState"],
    layers: Record<string, boolean>,
  ) => void;
}

export function ExploreBar({ activePresetId, onPreset }: ExploreBarProps) {
  const activePreset = PRESETS.find((preset) => preset.id === activePresetId);

  const renderPresetButton = (preset: Preset) => {
    const isActive = activePresetId === preset.id;

    return (
      <button
        key={preset.id}
        onClick={() => onPreset(preset.id, preset.viewState, preset.layers)}
        className={`snap-start whitespace-nowrap rounded-full border px-3 py-2 text-sm shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
          isActive
            ? "border-white/30 bg-white/15 text-white ring-1 ring-white/20"
            : "border-gray-700/50 bg-gray-900/80 text-gray-300 hover:border-gray-600/60 hover:bg-gray-800/90 hover:text-white"
        }`}
        aria-pressed={isActive}
      >
        <span className="mr-1.5">{preset.icon}</span>
        <span className="font-medium">{preset.label}</span>
      </button>
    );
  };

  return (
    <>
      <div className="absolute inset-x-0 bottom-24 z-20 lg:hidden">
        <div className="overflow-x-auto px-4 pb-2">
          <div className="flex w-max min-w-full gap-2 pr-4">{PRESETS.map(renderPresetButton)}</div>
        </div>
        <p className="px-4 text-xs text-gray-400">
          {activePreset?.description ?? "Jump to a focused city lens."}
        </p>
      </div>

      <div className="absolute bottom-[9.5rem] left-1/2 z-20 hidden -translate-x-1/2 gap-2 lg:flex">
        {PRESETS.map(renderPresetButton)}
      </div>
    </>
  );
}
