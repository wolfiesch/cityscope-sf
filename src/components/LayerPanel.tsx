import type { LayerVisibility } from "../types";

interface LayerPanelProps {
  visibility: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
  counts: Record<keyof LayerVisibility, number>;
  historicMapVisible: boolean;
  onToggleHistoricMap: () => void;
}

const LAYER_CONFIG: {
  key: keyof LayerVisibility;
  label: string;
  icon: string;
  color: string;
  description: string;
}[] = [
  {
    key: "heritage",
    label: "Heritage Sites",
    icon: "\u{1F3DB}",
    color: "#ffc832",
    description: "145K parcels by CEQA category",
  },
  {
    key: "landmarks",
    label: "Landmarks",
    icon: "\u{2B50}",
    color: "#ffd700",
    description: "NRHP + OSM historic sites",
  },
  {
    key: "permits",
    label: "Building Permits",
    icon: "\u{1F3D7}",
    color: "#46dc64",
    description: "Active construction/demo",
  },
  {
    key: "crime",
    label: "Police Dispatch",
    icon: "\u{1F6A8}",
    color: "#ff3232",
    description: "Live calls by priority",
  },
  {
    key: "fire",
    label: "Fire & EMS",
    icon: "\u{1F692}",
    color: "#ff8232",
    description: "Live emergency calls",
  },
  {
    key: "threeOneOne",
    label: "311 Reports",
    icon: "\u{1F4F1}",
    color: "#32c8b4",
    description: "Service requests + photos",
  },
];

export function LayerPanel({ visibility, onToggle, counts, historicMapVisible, onToggleHistoricMap }: LayerPanelProps) {
  return (
    <div className="absolute top-14 left-4 bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 w-64 shadow-2xl border border-gray-700/50 z-10">
      <h2 className="text-white font-bold text-sm tracking-wider uppercase mb-3">
        Layers
      </h2>
      <div className="space-y-1">
        {/* Historic Maps special toggle */}
        <button
          onClick={onToggleHistoricMap}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
            historicMapVisible
              ? "bg-amber-900/30 hover:bg-amber-800/40 border border-amber-500/30"
              : "bg-gray-800/30 hover:bg-gray-800/50 opacity-50"
          }`}
        >
          <span className="text-base shrink-0" role="img">{"\u{1F5FA}"}</span>
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: historicMapVisible ? "#d4a017" : "#444",
              boxShadow: historicMapVisible ? "0 0 8px #d4a01760" : "none",
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium">Historic Maps</div>
            <div className="text-gray-400 text-xs truncate">
              Georeferenced Rumsey Collection
            </div>
          </div>
          <span className="text-amber-400/60 text-xs font-mono">4</span>
        </button>

        <div className="border-t border-gray-700/30 my-1" />

        {LAYER_CONFIG.map(({ key, label, icon, color, description }) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
              visibility[key]
                ? "bg-gray-800/80 hover:bg-gray-700/80"
                : "bg-gray-800/30 hover:bg-gray-800/50 opacity-50"
            }`}
          >
            <span className="text-base shrink-0" role="img">{icon}</span>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: visibility[key] ? color : "#444",
                boxShadow: visibility[key]
                  ? `0 0 8px ${color}60`
                  : "none",
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{label}</div>
              <div className="text-gray-400 text-xs truncate">
                {description}
              </div>
            </div>
            <span className="text-gray-400 text-xs font-mono tabular-nums">
              {counts[key]?.toLocaleString() ?? "-"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
