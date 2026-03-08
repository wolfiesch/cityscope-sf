import { useRef } from "react";
import { Map } from "lucide-react";
import { LAYER_REGISTRY } from "../lib/layerRegistry";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface LayerPanelProps {
  visibility: Record<string, boolean>;
  onToggle: (id: string) => void;
  counts: Record<string, number>;
  historicMapVisible: boolean;
  onToggleHistoricMap: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export function LayerPanel({
  visibility,
  onToggle,
  counts,
  historicMapVisible,
  onToggleHistoricMap,
  mobileOpen,
  onClose,
}: LayerPanelProps) {
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(mobileOpen, mobilePanelRef, onClose);

  const panelContent = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Layers</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-700/50 hover:text-white lg:hidden"
          aria-label="Close layers"
        >
          &times;
        </button>
      </div>

      <div className="space-y-1.5">
        <button
          onClick={onToggleHistoricMap}
          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
            historicMapVisible
              ? "border-amber-500/30 bg-amber-900/30 hover:bg-amber-800/40"
              : "border-gray-800/60 bg-gray-800/30 hover:bg-gray-800/50"
          }`}
          aria-pressed={historicMapVisible}
        >
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-gray-300">
              <Map size={18} />
            </span>
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: historicMapVisible ? "#d4a017" : "#444",
                boxShadow: historicMapVisible ? "0 0 8px #d4a01760" : "none",
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">Historic Maps</div>
              <div className="truncate text-xs text-gray-400">Georeferenced Rumsey Collection</div>
            </div>
            <span className="text-xs font-mono text-amber-400/60">2,257</span>
          </div>
        </button>

        <div className="my-2 border-t border-gray-700/30" />

        {LAYER_REGISTRY.map((def) => {
          const isVisible = visibility[def.id] ?? false;

          return (
            <button
              key={def.id}
              onClick={() => onToggle(def.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                isVisible
                  ? "border-gray-700/70 bg-gray-800/80 hover:bg-gray-700/80"
                  : "border-gray-800/60 bg-gray-800/30 hover:bg-gray-800/50"
              }`}
              aria-pressed={isVisible}
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-gray-300">
                  {def.icon}
                </span>
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: isVisible ? def.color : "#444",
                    boxShadow: isVisible ? `0 0 8px ${def.color}60` : "none",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white">{def.label}</div>
                  <div className="truncate text-xs text-gray-400">{def.description}</div>
                </div>
                <span className="text-xs font-mono tabular-nums text-gray-400">
                  {counts[def.id]?.toLocaleString() ?? "-"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      <div className="absolute left-4 top-16 z-20 hidden max-h-[calc(100vh-7rem)] w-64 overflow-y-auto rounded-2xl border border-gray-700/50 bg-gray-900/90 p-4 shadow-2xl backdrop-blur-sm lg:block">
        {panelContent}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" />
          <div
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Map layers"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-y-3 left-3 flex w-[min(92vw,22rem)] flex-col overflow-hidden rounded-3xl border border-gray-700/60 bg-gray-900/96 p-4 shadow-2xl"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">{panelContent}</div>
          </div>
        </div>
      )}
    </>
  );
}
