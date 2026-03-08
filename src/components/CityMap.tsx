import { useCallback, useEffect, useRef, useState } from "react";
import { Map, Layer as MapLayer, Source } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { PickingInfo, MapViewState } from "deck.gl";
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { LAYER_MAP, LAYER_REGISTRY } from "../lib/layerRegistry";
import { heritageLayerDef } from "../layers/heritageLayer";
import { permitsLayerDef } from "../layers/permitsLayer";
import type { HeritagePoint, LayerDataState, PermitPoint, SelectedFeature } from "../types";
import { HistoricMapOverlay } from "./HistoricMapOverlay";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const STATIC_INTERACTIVE_LAYER_IDS = ["heritage-pick-points", "permits-circles"];

const pmtilesProtocol = new Protocol();
maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);

interface StaticMapFeature {
  layer?: { id?: string };
  properties?: Record<string, unknown>;
  geometry?: { type?: string; coordinates?: unknown };
}

interface CityMapProps {
  dataMap: Record<string, LayerDataState>;
  visibility: Record<string, boolean>;
  onSelect: (feature: SelectedFeature | null) => void;
  viewState: MapViewState;
  onViewStateChange: (vs: MapViewState) => void;
  historicMapVisible: boolean;
}

function isLngLatPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CityMap({
  dataMap,
  visibility,
  onSelect,
  viewState,
  onViewStateChange,
  historicMapVisible,
}: CityMapProps) {
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let last = 0;
    function tick(now: number) {
      if (now - last > 300) {
        setTime(now);
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const layers = LAYER_REGISTRY.map((definition) =>
    definition.createLayer(dataMap[definition.id]?.data ?? [], visibility[definition.id] ?? false, time),
  ).filter(Boolean);

  const onDeckClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        onSelect(null);
        return;
      }

      const layerId = info.layer?.id ?? "unknown";
      const definition = LAYER_MAP.get(layerId);

      if (definition) {
        const normalized = definition.normalizeFeature(info.object);
        onSelect({ layer: layerId, properties: normalized.raw, normalized });
        return;
      }

      onSelect({ layer: layerId, properties: { ...info.object } as Record<string, unknown> });
    },
    [onSelect],
  );

  const getTooltip = useCallback((info: PickingInfo) => {
    if (!info.object) return null;

    const layerId = info.layer?.id;
    if (!layerId) return null;

    const definition = LAYER_MAP.get(layerId);
    return definition?.getTooltip(info.object) ?? null;
  }, []);

  const handleStaticMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0] as StaticMapFeature | undefined;
    if (!feature?.layer?.id || !feature.geometry || feature.geometry.type !== "Point") return;

    const coordinates = feature.geometry.coordinates;
    if (!isLngLatPair(coordinates)) return;

    const properties = feature.properties ?? {};

    if (feature.layer.id === "heritage-pick-points") {
      const heritageFeature: HeritagePoint = [
        coordinates[0],
        coordinates[1],
        toNumber(properties.category_code),
        String(properties.name ?? "Heritage site"),
      ];
      const normalized = heritageLayerDef.normalizeFeature(heritageFeature);
      onSelect({ layer: "heritage", properties: normalized.raw, normalized });
      return;
    }

    if (feature.layer.id === "permits-circles") {
      const permitFeature: PermitPoint = [
        coordinates[0],
        coordinates[1],
        toNumber(properties.type_code),
        String(properties.address ?? ""),
        properties.year != null ? toNumber(properties.year) : null,
        String(properties.description ?? ""),
      ];
      const normalized = permitsLayerDef.normalizeFeature(permitFeature);
      onSelect({ layer: "permits", properties: normalized.raw, normalized });
    }
  }, [onSelect]);

  const hasGoogleApiKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="absolute inset-x-0 top-14 bottom-24 lg:top-12 lg:bottom-36">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: nextView }) => onViewStateChange(nextView as MapViewState)}
        controller={true}
        layers={layers}
        onClick={onDeckClick}
        getTooltip={getTooltip}
        style={{ position: "absolute", top: "0", right: "0", bottom: "0", left: "0" }}
      >
        <Map
          id="citymap"
          mapStyle={MAP_STYLE}
          reuseMaps
          interactiveLayerIds={STATIC_INTERACTIVE_LAYER_IDS}
          onClick={handleStaticMapClick}
        >
          <HistoricMapOverlay visible={historicMapVisible} />

          {visibility.buildings3d && (
            <MapLayer
              id="3d-buildings-extrusion"
              source="carto"
              source-layer="building"
              type="fill-extrusion"
              minzoom={13}
              paint={{
                "fill-extrusion-color": "#1a1a2e",
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 12],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.7,
              }}
            />
          )}

          <Source id="heritage-pmtiles" type="vector" url="pmtiles:///data/heritage.pmtiles">
            {visibility.heritage && (
              <>
                <MapLayer
                  id="heritage-heatmap"
                  source-layer="heritage"
                  type="heatmap"
                  paint={{
                    "heatmap-weight": [
                      "match", ["get", "category_code"],
                      1, 3, 2, 2, 3, 1,
                      1,
                    ],
                    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 2],
                    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 15, 30],
                    "heatmap-color": [
                      "interpolate", ["linear"], ["heatmap-density"],
                      0, "transparent",
                      0.2, "#ffc832",
                      0.4, "#ff9832",
                      0.6, "#ff6432",
                      0.8, "#ff3232",
                      1, "#cc0000",
                    ],
                    "heatmap-opacity": 0.7,
                  }}
                />
                <MapLayer
                  id="heritage-pick-points"
                  source-layer="heritage"
                  type="circle"
                  paint={{
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 9],
                    "circle-color": "rgba(255,255,255,0)",
                    "circle-opacity": 0,
                    "circle-stroke-opacity": 0,
                  }}
                />
              </>
            )}
          </Source>

          <Source id="permits-pmtiles" type="vector" url="pmtiles:///data/permits.pmtiles">
            {visibility.permits && (
              <MapLayer
                id="permits-circles"
                source-layer="permits"
                type="circle"
                paint={{
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 16, 8],
                  "circle-color": [
                    "match", ["get", "type_code"],
                    1, "#ff4646",
                    2, "#468cff",
                    3, "#46dc64",
                    "#787878",
                  ],
                  "circle-opacity": 0.7,
                }}
              />
            )}
          </Source>
        </Map>

        {visibility.google3d && hasGoogleApiKey && (
          <div className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            Google 3D Tiles
          </div>
        )}
      </DeckGL>
    </div>
  );
}
