import type { SelectedFeature } from "../types";

interface DetailPanelProps {
  feature: SelectedFeature | null;
  onClose: () => void;
}

const LAYER_COLORS: Record<string, string> = {
  heritage: "border-l-amber-500",
  permits: "border-l-green-500",
  landmarks: "border-l-yellow-400",
  crime: "border-l-red-500",
  "311": "border-l-teal-500",
  fire: "border-l-orange-500",
};

const LAYER_TITLES: Record<string, string> = {
  heritage: "Heritage Site",
  permits: "Building Permit",
  landmarks: "Historic Landmark",
  crime: "Police Dispatch",
  "311": "311 Report",
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
      <div className="text-white text-lg font-semibold leading-tight">{desc}</div>
      <div className="flex items-center gap-2">
        {priority ? (
          <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${PRIORITY_STYLES[priority] ?? "text-gray-400"}`}>
            Priority {priority}
          </span>
        ) : null}
        {time ? <span className="text-gray-400 text-xs">{timeAgo(time)}</span> : null}
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
      <div className="text-white text-lg font-semibold leading-tight">{str(p.call_type)}</div>
      <div className="flex items-center gap-2">
        {isLifeThreat ? (
          <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/40">
            Life-Threatening
          </span>
        ) : has(p.call_type_group) ? (
          <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40">
            {str(p.call_type_group)}
          </span>
        ) : null}
        {time ? <span className="text-gray-400 text-xs">{timeAgo(time)}</span> : null}
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
      <div className="text-white text-lg font-semibold leading-tight">{str(p.service_name)}</div>
      {has(p.service_subtype) ? <div className="text-gray-400 text-sm">{str(p.service_subtype)}</div> : null}
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt="311 Report"
          className="w-full rounded-lg max-h-52 object-cover border border-gray-700/50"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : null}
      {has(p.status_description) ? (
        <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/40">
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
      {has(p.name) ? <div className="text-white text-lg font-semibold leading-tight">{str(p.name)}</div> : null}
      {category ? (
        <div>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-medium">
            {category}
          </span>
          {HERITAGE_CATEGORY_INFO[category] ? (
            <div className="text-gray-400 text-xs mt-1.5 leading-relaxed">{HERITAGE_CATEGORY_INFO[category]}</div>
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
      {has(p.address) ? <div className="text-white text-lg font-semibold leading-tight">{str(p.address)}</div> : null}
      <div className="flex items-center gap-2">
        {type ? (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${PERMIT_BADGE[type] ?? PERMIT_BADGE.Other}`}>
            {type}
          </span>
        ) : null}
        {has(p.year) ? <span className="text-gray-400 text-xs">{str(p.year)}</span> : null}
      </div>
      {has(p.description) ? <Field label="Description" value={str(p.description)} /> : null}
    </div>
  );
}

function LandmarkCard({ p }: { p: Record<string, unknown> }) {
  const source = str(p.source);
  return (
    <div className="space-y-3">
      <div className="text-white text-lg font-semibold leading-tight">{str(p.name)}</div>
      <div className="flex items-center gap-2">
        {source ? (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
            {source === "nrhp" ? "National Register" : "OpenStreetMap"}
          </span>
        ) : null}
        {has(p.year) ? <span className="text-gray-400 text-xs">Est. {str(p.year)}</span> : null}
      </div>
      {has(p.description) ? <Field label="" value={str(p.description)} /> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      {label ? <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div> : null}
      <div className="text-gray-200 text-sm">{value}</div>
    </div>
  );
}

export function DetailPanel({ feature, onClose }: DetailPanelProps) {
  if (!feature) return null;

  const { layer, properties: p } = feature;
  const mediaUrl = p.media_url as string | undefined;
  const borderColor = LAYER_COLORS[layer] ?? "border-l-gray-500";

  let card: React.ReactNode;
  switch (layer) {
    case "crime":
      card = <CrimeCard p={p} />;
      break;
    case "fire":
      card = <FireCard p={p} />;
      break;
    case "311":
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
            .filter(([k, v]) => v != null && v !== "" && !k.startsWith(":@") && k !== "intersection_point" && k !== "point" && k !== "media_url")
            .map(([key, value]) => (
              <Field key={key} label={key.replace(/_/g, " ")} value={String(value)} />
            ))}
        </div>
      );
  }

  return (
    <div className={`absolute top-14 right-4 bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 w-80 max-h-[75vh] overflow-y-auto shadow-2xl border border-gray-700/50 border-l-4 ${borderColor} z-10`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-400 font-bold text-xs tracking-wider uppercase">
          {LAYER_TITLES[layer] ?? layer}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700/50"
        >
          &times;
        </button>
      </div>
      {card}
    </div>
  );
}
