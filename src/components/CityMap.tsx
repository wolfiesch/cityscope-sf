import { useCallback, useState, useEffect, useRef } from "react";
import { Map } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { PickingInfo, MapViewState } from "deck.gl";
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
  viewState: MapViewState;
  onViewStateChange: (vs: MapViewState) => void;
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
  viewState,
  onViewStateChange,
}: CityMapProps) {
  // Animation time for pulsing points
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let last = 0;
    function tick(now: number) {
      // Throttle to ~3fps for update triggers
      if (now - last > 300) {
        setTime(now);
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const layers = [
    createHeritageLayer(heritage, visibility.heritage),
    createPermitsLayer(permits, visibility.permits),
    createLandmarksLayer(landmarks, visibility.landmarks),
    createCrimeLayer(crime, visibility.crime, time),
    createThreeOneOneLayer(threeOneOne, visibility.threeOneOne),
    createFireLayer(fire, visibility.fire, time),
  ];

  const onClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        onSelect(null);
        return;
      }
      const layerId = info.layer?.id ?? "unknown";
      let properties: Record<string, unknown>;

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
    const style = { backgroundColor: "#1a1a2e", color: "#fff", fontSize: "12px", padding: "6px 10px", borderRadius: "6px" };

    if (layerId === "heritage") {
      const d = info.object as HeritagePoint;
      return { text: d[3] || "Heritage site", style };
    }
    if (layerId === "permits") {
      const d = info.object as PermitPoint;
      return { text: `${d[3]} (${d[4] ?? "?"})`, style };
    }
    if (layerId === "crime") {
      const d = info.object as CrimeDispatch;
      return { text: `${d.call_type_original_desc || d.call_type_original} [${d.priority_final || d.priority_original}]`, style: { ...style, color: "#ff6666" } };
    }
    if (layerId === "landmarks") {
      const d = info.object as Landmark;
      return { text: d.name, style: { ...style, color: "#ffd700", fontSize: "13px", fontWeight: "bold" } };
    }
    if (layerId === "311") {
      const d = info.object as ThreeOneOneRequest;
      return { text: `${d.service_name}: ${d.service_subtype || ""}`, style };
    }
    if (layerId === "fire") {
      const d = info.object as FireCall;
      return { text: `${d.call_type} - ${d.address}`, style };
    }
    return null;
  }, []);

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) => onViewStateChange(vs as MapViewState)}
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
