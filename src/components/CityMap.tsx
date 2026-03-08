import { useCallback } from "react";
import { Map } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { PickingInfo } from "deck.gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type {
  HeritagePoint,
  PermitPoint,
  Landmark,
  CrimeDispatch,
  ThreeOneOneRequest,
  FireCall,
  LayerVisibility,
  SelectedFeature,
} from "../types";
import { createHeritageLayer } from "../layers/heritageLayer";
import { createPermitsLayer } from "../layers/permitsLayer";
import { createLandmarksLayer } from "../layers/landmarksLayer";
import { createCrimeLayer } from "../layers/crimeLayer";
import { createThreeOneOneLayer } from "../layers/threeOneOneLayer";
import { createFireLayer } from "../layers/fireLayer";

const INITIAL_VIEW = {
  longitude: -122.44,
  latitude: 37.76,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface CityMapProps {
  heritage: HeritagePoint[];
  permits: PermitPoint[];
  landmarks: Landmark[];
  crime: CrimeDispatch[];
  threeOneOne: ThreeOneOneRequest[];
  fire: FireCall[];
  visibility: LayerVisibility;
  onSelect: (feature: SelectedFeature | null) => void;
}

export function CityMap({
  heritage,
  permits,
  landmarks,
  crime,
  threeOneOne,
  fire,
  visibility,
  onSelect,
}: CityMapProps) {
  const layers = [
    createHeritageLayer(heritage, visibility.heritage),
    createPermitsLayer(permits, visibility.permits),
    createLandmarksLayer(landmarks, visibility.landmarks),
    createCrimeLayer(crime, visibility.crime),
    createThreeOneOneLayer(threeOneOne, visibility.threeOneOne),
    createFireLayer(fire, visibility.fire),
  ];

  const onClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        onSelect(null);
        return;
      }
      const layerId = info.layer?.id ?? "unknown";
      let properties: Record<string, unknown>;

      // Convert array-based data to named properties
      if (layerId === "heritage") {
        const d = info.object as HeritagePoint;
        const cats = ["Unknown", "Category A - Known Historic", "Category B - Potential", "Category C - Not Historic"];
        properties = {
          name: d[3],
          category: cats[d[2]] ?? "Unknown",
          longitude: d[0],
          latitude: d[1],
        };
      } else if (layerId === "permits") {
        const d = info.object as PermitPoint;
        const types = ["Other", "Demolition", "Renovation/Alteration", "New Construction"];
        properties = {
          address: d[3],
          type: types[d[2]] ?? "Other",
          year: d[4],
          description: d[5],
        };
      } else {
        properties = { ...info.object } as Record<string, unknown>;
      }

      onSelect({ layer: layerId, properties });
    },
    [onSelect]
  );

  const getTooltip = useCallback((info: PickingInfo) => {
    if (!info.object) return null;
    const layerId = info.layer?.id;

    if (layerId === "heritage") {
      const d = info.object as HeritagePoint;
      return { text: d[3] || "Heritage site", style: { backgroundColor: "#1a1a2e", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "6px" } };
    }
    if (layerId === "permits") {
      const d = info.object as PermitPoint;
      return { text: `${d[3]} (${d[4] ?? "?"})`, style: { backgroundColor: "#1a1a2e", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "6px" } };
    }
    if (layerId === "crime") {
      const d = info.object as CrimeDispatch;
      return { text: `${d.call_type_original_desc || d.call_type_original} [${d.priority_final || d.priority_original}] - ${d.intersection_name || ""}`, style: { backgroundColor: "#1a1a2e", color: "#ff6666", fontSize: "12px", padding: "6px 10px", borderRadius: "6px" } };
    }
    if (layerId === "landmarks") {
      const d = info.object as Landmark;
      return { text: d.name, style: { backgroundColor: "#1a1a2e", color: "#ffd700", fontSize: "13px", padding: "6px 10px", borderRadius: "6px", fontWeight: "bold" } };
    }
    if (layerId === "311") {
      const d = info.object as ThreeOneOneRequest;
      return { text: `${d.service_name}: ${d.service_subtype || ""}`, style: { backgroundColor: "#1a1a2e", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "6px" } };
    }
    if (layerId === "fire") {
      const d = info.object as FireCall;
      return { text: `${d.call_type} - ${d.address}`, style: { backgroundColor: "#1a1a2e", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "6px" } };
    }
    return null;
  }, []);

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW}
      controller={true}
      layers={layers}
      onClick={onClick}
      getTooltip={getTooltip}
      style={{ position: "absolute", top: "48px", bottom: "144px", left: "0", right: "0" }}
    >
      <Map mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
