import type { CrimeDispatch, ThreeOneOneRequest } from "../types";

interface LiveFeedProps {
  crimeData: CrimeDispatch[];
  threeOneOneData: ThreeOneOneRequest[];
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

export function LiveFeed({ crimeData, threeOneOneData }: LiveFeedProps) {
  // Merge and sort by time, limit to 30
  const items = [
    ...crimeData.slice(0, 15).map((d) => ({
      type: "crime" as const,
      time: d.received_datetime,
      title: d.call_type_original || d.call_type,
      subtitle: d.analysis_neighborhood,
      priority: d.priority,
    })),
    ...threeOneOneData.slice(0, 15).map((d) => ({
      type: "311" as const,
      time: d.requested_datetime,
      title: d.service_name,
      subtitle: d.neighborhoods_sffind_boundaries || d.address,
      priority: null as string | null,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="absolute bottom-0 left-0 right-0 h-36 bg-gray-950/85 backdrop-blur-sm border-t border-gray-800/50 z-20 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">
          Live Feed
        </span>
      </div>
      <div className="overflow-y-auto h-[calc(100%-2rem)] px-4 py-1 space-y-1">
        {items.map((item, i) => (
          <div
            key={`${item.type}-${i}`}
            className="flex items-center gap-3 py-1.5 text-sm"
          >
            <span className="text-gray-500 text-xs font-mono w-14 shrink-0 text-right">
              {timeAgo(item.time)}
            </span>
            {item.type === "crime" && item.priority && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded border font-mono ${
                  PRIORITY_BADGE[item.priority] ?? "text-gray-400"
                }`}
              >
                {item.priority}
              </span>
            )}
            {item.type === "311" && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-teal-500/30 bg-teal-500/20 text-teal-400 font-mono">
                311
              </span>
            )}
            <span className="text-white truncate">{item.title}</span>
            <span className="text-gray-500 text-xs truncate">
              {item.subtitle}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
