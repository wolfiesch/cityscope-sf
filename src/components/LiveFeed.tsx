import type { CrimeDispatch, ThreeOneOneRequest, FireCall } from "../types";

interface LiveFeedProps {
  crimeData: CrimeDispatch[];
  threeOneOneData: ThreeOneOneRequest[];
  fireData: FireCall[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PRIORITY_BADGE: Record<string, string> = {
  A: "bg-red-500/20 text-red-400 border-red-500/30",
  B: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  C: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

const TYPE_BORDER: Record<string, string> = {
  crime: "border-l-red-500/60",
  "311": "border-l-teal-500/60",
  fire: "border-l-orange-500/60",
};

const TYPE_LABEL: Record<string, { text: string; className: string }> = {
  fire: { text: "FIRE", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

export function LiveFeed({ crimeData, threeOneOneData, fireData }: LiveFeedProps) {
  const items = [
    ...crimeData.slice(0, 12).map((d) => ({
      type: "crime" as const,
      key: d.cad_number,
      time: d.received_datetime,
      title: d.call_type_original_desc || d.call_type_final_desc || d.call_type_original,
      subtitle: d.intersection_name
        ? `${d.intersection_name} - ${d.analysis_neighborhood}`
        : d.analysis_neighborhood,
      priority: d.priority_final || d.priority_original,
    })),
    ...threeOneOneData.slice(0, 10).map((d) => ({
      type: "311" as const,
      key: d.service_request_id,
      time: d.requested_datetime,
      title: d.service_name,
      subtitle: d.neighborhoods_sffind_boundaries || d.address,
      priority: null as string | null,
    })),
    ...fireData.slice(0, 10).map((d) => ({
      type: "fire" as const,
      key: d.call_number,
      time: d.received_dttm,
      title: d.call_type,
      subtitle: d.address
        ? `${d.address} - ${d.neighborhoods_analysis_boundaries || ""}`
        : d.neighborhoods_analysis_boundaries || "",
      priority: null as string | null,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="absolute bottom-0 left-0 right-0 h-36 bg-gray-950/90 backdrop-blur-sm border-t border-gray-800/50 z-20 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">
          Live Feed
        </span>
        <span className="text-gray-600 text-xs ml-1">{items.length} events</span>
      </div>
      <div className="overflow-y-auto h-[calc(100%-2rem)] px-4 py-1 space-y-0.5">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.key}`}
            className={`feed-item flex items-center gap-3 py-1.5 text-sm border-l-2 pl-3 ${TYPE_BORDER[item.type] ?? ""}`}
          >
            <span className="text-gray-500 text-xs font-mono w-14 shrink-0 text-right">
              {timeAgo(item.time)}
            </span>
            {item.type === "crime" && item.priority && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded border font-mono font-bold ${
                  PRIORITY_BADGE[item.priority] ?? "text-gray-400"
                }`}
              >
                {item.priority}
              </span>
            )}
            {item.type === "311" && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-teal-500/30 bg-teal-500/20 text-teal-400 font-mono font-bold">
                311
              </span>
            )}
            {item.type === "fire" && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-mono font-bold ${TYPE_LABEL.fire.className}`}>
                {TYPE_LABEL.fire.text}
              </span>
            )}
            <span className="text-white truncate font-medium">{item.title}</span>
            <span className="text-gray-500 text-xs truncate ml-auto">
              {item.subtitle}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
