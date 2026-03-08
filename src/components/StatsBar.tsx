interface StatsBarProps {
  counts: Record<string, number>;
  liveUpdatedAt: Date | null;
  activeLayerCount: number;
  onOpenLayers: () => void;
}

const LIVE_LAYER_IDS = ["crime", "fire", "threeOneOne"];
const COMPACT_NUMBER = new Intl.NumberFormat("en-US", { notation: "compact" });

export function StatsBar({ counts, liveUpdatedAt, activeLayerCount, onOpenLayers }: StatsBarProps) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const liveCount = LIVE_LAYER_IDS.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const updatedAtLabel = liveUpdatedAt
    ? liveUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="absolute inset-x-0 top-0 z-30 h-14 border-b border-gray-800/60 bg-gray-950/85 px-4 backdrop-blur-md lg:px-6">
      <div className="flex h-full items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight text-white">CityScope</h1>
          <span className="text-sm font-light text-gray-400">SF</span>
          <span className="hidden text-xs text-gray-500 lg:inline">Real-time urban intelligence</span>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-5 lg:flex">
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5">
            <div className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-xs font-bold tracking-[0.2em] text-red-400">LIVE</span>
          </div>
          <div className="text-sm text-gray-400">
            <span className="font-mono text-base font-semibold text-white">{total.toLocaleString()}</span> features
          </div>
          <div className="text-sm text-gray-400">
            <span className="font-mono text-white">{liveCount.toLocaleString()}</span> live feeds
          </div>
          <div className="text-sm text-gray-400">
            <span className="font-mono text-white">{activeLayerCount}</span> layers
          </div>
          {updatedAtLabel ? <div className="text-xs text-gray-500">Updated {updatedAtLabel}</div> : null}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5">
            <div className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold tracking-[0.18em] text-red-400">LIVE</span>
          </div>
          <div className="rounded-full border border-gray-700/60 bg-gray-900/80 px-2.5 py-1 text-xs text-gray-300">
            <span className="font-mono font-semibold text-white">{COMPACT_NUMBER.format(total)}</span> items
          </div>
          <button
            onClick={onOpenLayers}
            className="flex items-center gap-1.5 rounded-xl border border-gray-700/60 bg-gray-900/80 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition-all hover:border-gray-600 hover:bg-gray-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Layers
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {activeLayerCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
