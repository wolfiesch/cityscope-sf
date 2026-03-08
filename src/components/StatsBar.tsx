import { useEffect, useState } from "react";
import type { LayerVisibility } from "../types";

interface StatsBarProps {
  counts: Record<keyof LayerVisibility, number>;
  liveUpdatedAt: Date | null;
}

export function StatsBar({ counts, liveUpdatedAt }: StatsBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Animated count-up
  const [displayTotal, setDisplayTotal] = useState(0);
  useEffect(() => {
    if (total === 0) return;
    const duration = 1500;
    const start = performance.now();
    const from = displayTotal;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayTotal(Math.floor(from + (total - from) * ease));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const liveCount = counts.crime + counts.fire + counts.threeOneOne;

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-gray-950/80 backdrop-blur-sm flex items-center px-6 z-20 border-b border-gray-800/50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h1 className="text-white font-bold text-lg tracking-tight">
          CityScope
        </h1>
        <span className="text-gray-400 text-sm font-light">SF</span>
        <span className="text-gray-600 text-xs ml-1 hidden sm:inline">
          Real-time urban intelligence
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-5 text-sm">
        {/* LIVE badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
          <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
        </div>

        <div className="text-gray-400">
          <span className="text-white font-mono tabular-nums text-base font-semibold">
            {displayTotal.toLocaleString()}
          </span>{" "}
          features
        </div>
        <div className="text-gray-400">
          <span className="text-white font-mono tabular-nums">
            {liveCount}
          </span>{" "}
          live feeds
        </div>
        {liveUpdatedAt && (
          <div className="text-gray-500 text-xs">
            {liveUpdatedAt.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
