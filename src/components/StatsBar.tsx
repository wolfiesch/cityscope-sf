import type { LayerVisibility } from "../types";

interface StatsBarProps {
  counts: Record<keyof LayerVisibility, number>;
  liveUpdatedAt: Date | null;
}

export function StatsBar({ counts, liveUpdatedAt }: StatsBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-gray-950/80 backdrop-blur-sm flex items-center px-6 z-20 border-b border-gray-800/50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h1 className="text-white font-bold text-lg tracking-tight">
          CityScope
        </h1>
        <span className="text-gray-400 text-sm font-light">SF</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-6 text-sm">
        <div className="text-gray-400">
          <span className="text-white font-mono tabular-nums">
            {total.toLocaleString()}
          </span>{" "}
          features loaded
        </div>
        <div className="text-gray-400">
          <span className="text-white font-mono tabular-nums">
            {counts.crime + counts.fire + counts.threeOneOne}
          </span>{" "}
          live
        </div>
        {liveUpdatedAt && (
          <div className="text-gray-500 text-xs">
            Updated {liveUpdatedAt.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
