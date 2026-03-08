import type { LayerVisibility } from "../types";

interface LayerPanelProps {
  visibility: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
  counts: Record<keyof LayerVisibility, number>;
}

const LAYER_CONFIG: {
  key: keyof LayerVisibility;
  label: string;
  color: string;
  description: string;
}[] = [
  {
    key: "heritage",
    label: "Heritage Sites",
    color: "#ffc832",
    description: "145K parcels by CEQA category",
  },
  {
    key: "landmarks",
    label: "Landmarks",
    color: "#ffd700",
    description: "NRHP + OSM historic sites",
  },
  {
    key: "permits",
    label: "Building Permits",
    color: "#46dc64",
    description: "Active construction/demo",
  },
  {
    key: "crime",
    label: "Police Dispatch",
    color: "#ff3232",
    description: "Live calls by priority",
  },
  {
    key: "fire",
    label: "Fire & EMS",
    color: "#ff8232",
    description: "Live emergency calls",
  },
  {
    key: "threeOneOne",
    label: "311 Reports",
    color: "#32c8b4",
    description: "Service requests + photos",
  },
];

export function LayerPanel({ visibility, onToggle, counts }: LayerPanelProps) {
  return (
    <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 w-64 shadow-2xl border border-gray-700/50 z-10">
      <h2 className="text-white font-bold text-sm tracking-wider uppercase mb-3">
        Layers
      </h2>
      <div className="space-y-1">
        {LAYER_CONFIG.map(({ key, label, color, description }) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
              visibility[key]
                ? "bg-gray-800/80 hover:bg-gray-700/80"
                : "bg-gray-800/30 hover:bg-gray-800/50 opacity-50"
            }`}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
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
