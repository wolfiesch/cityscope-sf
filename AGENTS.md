# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Vite)
pnpm build        # TypeScript check + Vite build
pnpm lint         # ESLint
pnpm preview      # Preview production build
```

No test framework is configured.

## What This Is

CityScope SF is a real-time urban intelligence dashboard for San Francisco. It renders 6 data layers on a deck.gl/MapLibre map with a dark CARTO basemap.

## Data Architecture

Two distinct data pipelines feed the map:

**Static layers** (loaded from `public/data/*.json` on mount):
- **Heritage** - ~145K parcels as tuple arrays `[lng, lat, category_code, name]` for memory efficiency
- **Permits** - ~30K building permits as tuple arrays `[lng, lat, type_code, address, year, description]`
- **Landmarks** - OSM + NRHP merged, deduplicated by proximity, stored as objects

These are preprocessed from HistoryAPI exports by `scripts/preprocess.py` (reads from `~/Projects/HistoryAPI/data/processed/`).

**Live layers** (polled from SF Open Data SODA API every 60s via `useSodaApi` hook):
- **Crime** - Police dispatch calls (`gnap-fj3t`)
- **311** - Service requests (`vw6y-z8j6`)
- **Fire/EMS** - Fire calls (`nuek-vuh3`)

The SODA client is in `src/lib/soda.ts`. No API key is needed for basic access.

## Key Patterns

- **Tuple types for large datasets**: Heritage and Permits use positional arrays instead of objects to reduce JSON size and memory. The type definitions in `types.ts` document the index positions. When adding properties, update both the tuple type comment and the preprocessing script.
- **Layer factory functions**: Each layer file (`src/layers/*.ts`) exports a `create*Layer()` function that returns a deck.gl layer instance. These are composed in `CityMap.tsx`.
- **Click handling**: `CityMap.onClick` converts tuple-based data back to named properties for the `DetailPanel`. When adding new tuple-based layers, add a conversion branch there.

## Tech Stack

React 19 + TypeScript + Vite 7 + Tailwind CSS v4 (via `@tailwindcss/vite` plugin) + deck.gl 9 + react-map-gl + MapLibre GL
