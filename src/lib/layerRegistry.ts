import type { LayerDefinition } from "../types";
import { google3dLayerDef } from "../layers/google3dLayer";
import { buildings3dLayerDef } from "../layers/buildings3dLayer";
import { heritageLayerDef } from "../layers/heritageLayer";
import { permitsLayerDef } from "../layers/permitsLayer";
import { landmarksLayerDef } from "../layers/landmarksLayer";
import { crimeLayerDef } from "../layers/crimeLayer";
import { threeOneOneLayerDef } from "../layers/threeOneOneLayer";
import { fireLayerDef } from "../layers/fireLayer";

// Ordered array - render order matters for deck.gl (first = bottom)
// 3D base layers render behind all data layers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LAYER_REGISTRY: LayerDefinition<any>[] = [
  google3dLayerDef,
  buildings3dLayerDef,
  heritageLayerDef,
  permitsLayerDef,
  landmarksLayerDef,
  crimeLayerDef,
  threeOneOneLayerDef,
  fireLayerDef,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LAYER_MAP = new Map<string, LayerDefinition<any>>(
  LAYER_REGISTRY.map((def) => [def.id, def])
);

export function getDefaultVisibility(): Record<string, boolean> {
  const vis: Record<string, boolean> = {};
  for (const def of LAYER_REGISTRY) {
    vis[def.id] = def.defaultVisible;
  }
  return vis;
}

export function getLayersByGroup(): Map<string, LayerDefinition[]> {
  const groups = new Map<string, LayerDefinition[]>();
  for (const def of LAYER_REGISTRY) {
    const list = groups.get(def.group) ?? [];
    list.push(def);
    groups.set(def.group, list);
  }
  return groups;
}
