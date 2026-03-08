import type { LiveFeedItem } from "../types";

interface LiveFeedProps {
  items: LiveFeedItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectItem: (item: LiveFeedItem) => void;
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

const LAYER_BORDER: Record<string, string> = {
  crime: "border-l-red-500/60",
  threeOneOne: "border-l-teal-500/60",
  fire: "border-l-orange-500/60",
};

export function LiveFeed({ items, expanded, onToggleExpanded, onSelectItem }: LiveFeedProps) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );

  const displayItems = expanded ? sorted : sorted.slice(0, 8);

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 overflow-hidden border-t border-gray-800/50 bg-gray-950/92 backdrop-blur-md transition-[height] duration-300 ${
        expanded ? "h-[55vh] lg:h-72" : "h-24 lg:h-36"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-gray-800/50 px-4 py-2.5">
        <div className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Feed</span>
        <span className="ml-1 text-xs text-gray-600">{items.length} grouped events</span>
        <div className="flex-1" />
        <button
          onClick={onToggleExpanded}
          className="rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-expanded={expanded}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div className="h-[calc(100%-3rem)] overflow-y-auto px-4 py-2">
        <div className="space-y-1.5">
          {displayItems.map((item) => {
            const isRecent = Date.now() - new Date(item.time).getTime() < 60_000;
            return (
            <button
              key={`${item.layerId}-${item.key}`}
              onClick={() => onSelectItem(item)}
              className={`feed-item w-full rounded-xl border-l-2 bg-transparent px-3 py-2 text-left transition-all hover:bg-gray-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                LAYER_BORDER[item.layerId] ?? "border-l-gray-500/60"
              } ${isRecent ? "feed-item-new" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="w-14 shrink-0 pt-0.5 text-right font-mono text-[11px] text-gray-500">
                  {timeAgo(item.time)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold ${item.badge.className}`}
                      >
                        {item.badge.text}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-white">{item.title}</span>
                    {item.duplicateCount && item.duplicateCount > 1 && (
                      <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                        x{item.duplicateCount}
                      </span>
                    )}
                  </div>
                  <div className="truncate pt-1 text-xs text-gray-500">{item.subtitle}</div>
                </div>
              </div>
            </button>
          );
          })}
          {displayItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 px-4 py-5 text-center text-sm text-gray-500">
              Waiting for live incident data.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
