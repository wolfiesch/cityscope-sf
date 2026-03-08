import type { SelectedFeature } from "../types";

interface DetailPanelProps {
  feature: SelectedFeature | null;
  onClose: () => void;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (key.includes("datetime") || key.includes("dttm")) {
    try {
      return new Date(String(value)).toLocaleString();
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const LAYER_TITLES: Record<string, string> = {
  heritage: "Heritage Site",
  permits: "Building Permit",
  landmarks: "Historic Landmark",
  crime: "Police Dispatch",
  "311": "311 Report",
  fire: "Fire/EMS Call",
};

export function DetailPanel({ feature, onClose }: DetailPanelProps) {
  if (!feature) return null;

  const { layer, properties } = feature;
  const mediaUrl = properties.media_url as string | undefined;

  return (
    <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 w-80 max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-700/50 z-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase">
          {LAYER_TITLES[layer] ?? layer}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
        >
          x
        </button>
      </div>

      {mediaUrl && (
        <img
          src={mediaUrl}
          alt="311 Report"
          className="w-full rounded-lg mb-3 max-h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      <div className="space-y-2">
        {Object.entries(properties)
          .filter(
            ([k, v]) =>
              v !== null &&
              v !== undefined &&
              v !== "" &&
              !k.startsWith(":@") &&
              k !== "intersection_point" &&
              k !== "point" &&
              k !== "media_url"
          )
          .map(([key, value]) => (
            <div key={key}>
              <div className="text-gray-400 text-xs uppercase tracking-wide">
                {key.replace(/_/g, " ")}
              </div>
              <div className="text-white text-sm">
                {formatValue(key, value)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
