import type { LayerVisibility } from "../types";

interface Preset {
  label: string;
  icon: string;
  description: string;
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  layers: Partial<Record<keyof LayerVisibility, boolean>>;
}

const PRESETS: Preset[] = [
  {
    label: "Heritage Hotspots",
    icon: "\u{1F525}",
    description: "Where SF's history lives",
    viewState: { longitude: -122.41, latitude: 37.788, zoom: 14, pitch: 50, bearing: -10 },
    layers: { heritage: true, landmarks: true, permits: false, crime: false, threeOneOne: false, fire: false },
  },
  {
    label: "Live Emergencies",
    icon: "\u{1F6A8}",
    description: "Active 911 calls right now",
    viewState: { longitude: -122.42, latitude: 37.77, zoom: 13, pitch: 40, bearing: 0 },
    layers: { heritage: false, landmarks: false, permits: false, crime: true, threeOneOne: false, fire: true },
  },
  {
    label: "Street Reports",
    icon: "\u{1F4CB}",
    description: "311 + crime in the Mission",
    viewState: { longitude: -122.418, latitude: 37.76, zoom: 14.5, pitch: 35, bearing: 15 },
    layers: { heritage: false, landmarks: false, permits: false, crime: true, threeOneOne: true, fire: false },
  },
  {
    label: "Dev vs History",
    icon: "\u{2694}\u{FE0F}",
    description: "Construction meets heritage",
    viewState: { longitude: -122.398, latitude: 37.778, zoom: 14.5, pitch: 45, bearing: -20 },
    layers: { heritage: true, landmarks: true, permits: true, crime: false, threeOneOne: false, fire: false },
  },
];

interface ExploreBarProps {
  onPreset: (viewState: Preset["viewState"], layers: Preset["layers"]) => void;
}

export function ExploreBar({ onPreset }: ExploreBarProps) {
  return (
    <div className="absolute bottom-[9.5rem] left-1/2 -translate-x-1/2 flex gap-2 z-20">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onPreset(preset.viewState, preset.layers)}
          title={preset.description}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:bg-gray-800/90 hover:border-gray-600/60 transition-all shadow-lg whitespace-nowrap"
        >
          <span>{preset.icon}</span>
          <span className="font-medium">{preset.label}</span>
        </button>
      ))}
    </div>
  );
}
