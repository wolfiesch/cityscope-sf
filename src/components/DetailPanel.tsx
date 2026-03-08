import { useRef } from "react";
import type { ReactNode } from "react";
import type { SelectedFeature } from "../types";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface DetailPanelProps {
  feature: SelectedFeature | null;
  onClose: () => void;
  variant?: "mobile";
}

const LAYER_COLORS: Record<string, string> = {
  heritage: "border-l-amber-500",
  permits: "border-l-green-500",
  landmarks: "border-l-yellow-400",
  crime: "border-l-red-500",
  threeOneOne: "border-l-teal-500",
  fire: "border-l-orange-500",
};

const LAYER_TITLES: Record<string, string> = {
  heritage: "Heritage Site",
  permits: "Building Permit",
  landmarks: "Historic Landmark",
  crime: "Police Dispatch",
  threeOneOne: "311 Report",
  fire: "Fire/EMS Call",
};

const PRIORITY_STYLES: Record<string, string> = {
  A: "bg-red-500/20 text-red-400 border border-red-500/40",
  B: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
  C: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
};

const HERITAGE_CATEGORY_INFO: Record<string, string> = {
  "Category A - Known Historic": "Confirmed historic resource eligible for preservation",
  "Category B - Potential": "Requires further review for historic significance",
  "Category C - Not Historic": "Determined not to be a historic resource",
};

const PERMIT_BADGE: Record<string, string> = {
  Demolition: "bg-red-500/20 text-red-400 border border-red-500/40",
  "Renovation/Alteration": "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  "New Construction": "bg-green-500/20 text-green-400 border border-green-500/40",
  Other: "bg-gray-500/20 text-gray-400 border border-gray-500/40",
};

function str(val: unknown): string {
  return val != null ? String(val) : "";
}

function has(val: unknown): boolean {
  return val != null && val !== "";
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

function CrimeCard({ p }: { p: Record<string, unknown> }) {
  const priority = str(p.priority_final || p.priority_original);
  const desc = str(p.call_type_original_desc || p.call_type_final_desc || p.call_type_original);
  const time = str(p.received_datetime);
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-tight text-white">{desc}</div>
      <div className="flex items-center gap-2">
        {priority ? (
          <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${PRIORITY_STYLES[priority] ?? "text-gray-400"}`}>
            Priority {priority}
          </span>
        ) : null}
        {time ? <span className="text-xs text-gray-400">{timeAgo(time)}</span> : null}
      </div>
      {has(p.intersection_name) ? <Field label="Location" value={str(p.intersection_name)} /> : null}
      {has(p.analysis_neighborhood) ? <Field label="Neighborhood" value={str(p.analysis_neighborhood)} /> : null}
      {has(p.police_district) ? <Field label="District" value={str(p.police_district)} /> : null}
    </div>
  );
}

function FireCard({ p }: { p: Record<string, unknown> }) {
  const isLifeThreat = p.call_type_group === "Potentially Life-Threatening";
  const time = str(p.received_dttm);
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-tight text-white">{str(p.call_type)}</div>
      <div className="flex items-center gap-2">
        {isLifeThreat ? (
          <span className="rounded border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
            Life-Threatening
          </span>
        ) : has(p.call_type_group) ? (
          <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400 border border-orange-500/40">
            {str(p.call_type_group)}
          </span>
        ) : null}
        {time ? <span className="text-xs text-gray-400">{timeAgo(time)}</span> : null}
      </div>
      {has(p.address) ? <Field label="Address" value={str(p.address)} /> : null}
      {has(p.neighborhoods_analysis_boundaries) ? <Field label="Neighborhood" value={str(p.neighborhoods_analysis_boundaries)} /> : null}
      {has(p.battalion) ? <Field label="Battalion" value={`${str(p.battalion)}${has(p.station_area) ? ` / Station ${str(p.station_area)}` : ""}`} /> : null}
    </div>
  );
}

function ThreeOneOneCard({ p, mediaUrl }: { p: Record<string, unknown>; mediaUrl?: string }) {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-tight text-white">{str(p.service_name)}</div>
      {has(p.service_subtype) ? <div className="text-sm text-gray-400">{str(p.service_subtype)}</div> : null}
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt="311 Report"
          className="max-h-52 w-full rounded-lg border border-gray-700/50 object-cover"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
      {has(p.status_description) ? (
        <span className="rounded border border-teal-500/40 bg-teal-500/20 px-2 py-0.5 text-xs text-teal-400">
          {str(p.status_description)}
        </span>
      ) : null}
      {has(p.address) ? <Field label="Address" value={str(p.address)} /> : null}
      {has(p.neighborhoods_sffind_boundaries) ? <Field label="Neighborhood" value={str(p.neighborhoods_sffind_boundaries)} /> : null}
    </div>
  );
}

function HeritageCard({ p }: { p: Record<string, unknown> }) {
  const category = str(p.category);
  return (
    <div className="space-y-3">
      {has(p.name) ? <div className="text-lg font-semibold leading-tight text-white">{str(p.name)}</div> : null}
      {category ? (
        <div>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/40">
            {category}
          </span>
          {HERITAGE_CATEGORY_INFO[category] ? (
            <div className="mt-1.5 text-xs leading-relaxed text-gray-400">{HERITAGE_CATEGORY_INFO[category]}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PermitCard({ p }: { p: Record<string, unknown> }) {
  const type = str(p.type);
  return (
    <div className="space-y-3">
      {has(p.address) ? <div className="text-lg font-semibold leading-tight text-white">{str(p.address)}</div> : null}
      <div className="flex items-center gap-2">
        {type ? (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${PERMIT_BADGE[type] ?? PERMIT_BADGE.Other}`}>
            {type}
          </span>
        ) : null}
        {has(p.year) ? <span className="text-xs text-gray-400">{str(p.year)}</span> : null}
      </div>
      {has(p.description) ? <Field label="Description" value={str(p.description)} /> : null}
    </div>
  );
}

function LandmarkCard({ p }: { p: Record<string, unknown> }) {
  const source = str(p.source);
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold leading-tight text-white">{str(p.name)}</div>
      <div className="flex items-center gap-2">
        {source ? (
          <span className="rounded border border-yellow-500/40 bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
            {source === "nrhp" ? "National Register" : "OpenStreetMap"}
          </span>
        ) : null}
        {has(p.year) ? <span className="text-xs text-gray-400">Est. {str(p.year)}</span> : null}
      </div>
      {has(p.description) ? <Field label="" value={str(p.description)} /> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      {label ? <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div> : null}
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  );
}

export function DetailPanel({ feature, onClose, variant }: DetailPanelProps) {
  if (!feature) return null;

  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = variant === "mobile";

  useFocusTrap(isMobile, panelRef, onClose);

  const layer = feature.layer === "311" ? "threeOneOne" : feature.layer;
  const { properties: p } = feature;
  const mediaUrl = p.media_url as string | undefined;
  const borderColor = LAYER_COLORS[layer] ?? "border-l-gray-500";

  let card: ReactNode;
  switch (layer) {
    case "crime":
      card = <CrimeCard p={p} />;
      break;
    case "fire":
      card = <FireCard p={p} />;
      break;
    case "threeOneOne":
      card = <ThreeOneOneCard p={p} mediaUrl={mediaUrl} />;
      break;
    case "heritage":
      card = <HeritageCard p={p} />;
      break;
    case "permits":
      card = <PermitCard p={p} />;
      break;
    case "landmarks":
      card = <LandmarkCard p={p} />;
      break;
    default:
      card = (
        <div className="space-y-2">
          {Object.entries(p)
            .filter(([key, value]) => value != null && value !== "" && !key.startsWith(":@") && key !== "intersection_point" && key !== "point" && key !== "media_url")
            .map(([key, value]) => (
              <Field key={key} label={key.replace(/_/g, " ")} value={String(value)} />
            ))}
        </div>
      );
  }

  const panelContent = (
    <div
      ref={panelRef}
      tabIndex={-1}
      role={isMobile ? "dialog" : undefined}
      aria-modal={isMobile ? "true" : undefined}
      aria-label={LAYER_TITLES[layer] ?? layer}
      className={`overflow-y-auto border border-gray-700/50 border-l-4 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-sm ${borderColor}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {LAYER_TITLES[layer] ?? layer}
        </h2>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-700/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Close details"
        >
          &times;
        </button>
      </div>
      {card}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
        <div className="absolute inset-x-3 bottom-24 max-h-[55vh]" onClick={(event) => event.stopPropagation()}>
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-16 z-20 hidden max-h-[75vh] w-80 lg:block">
      {panelContent}
    </div>
  );
}
