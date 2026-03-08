# CityScope SF - New Data Layers Implementation Plan

> Created: 2026-03-08
> Status: **Planning**
> Last revised: 2026-03-08 (addressed architecture review feedback)

---

## Current Architecture Problems

The existing codebase is optimized for exactly 6 manually wired layers. Scaling to 30+ layers requires solving four structural problems first. No new layer should be added until all four prerequisites are complete.

### Problem 1: No Layer Registry (Brittle Fan-Out)
Adding a layer currently requires editing **10+ files**, not 6-7:
- `src/lib/soda.ts` - dataset ID
- `src/types.ts` - response interface + `LayerVisibility` key
- `src/layers/<name>Layer.ts` - layer factory
- `src/App.tsx` - `useSodaApi` call, state, props to CityMap, counts object (lines 74-99, 119-126, 165-176)
- `src/components/CityMap.tsx` - props interface (line 27), `layers[]` array, tooltip switch (line 102), click handler switch (line 75)
- `src/components/LayerPanel.tsx` - `LAYER_CONFIG` entry
- `src/components/StatsBar.tsx` - hardcoded `liveCount` sum (line 29)
- `src/components/LiveFeed.tsx` - hardcoded props and item mapping (lines 1-65)
- `src/components/ExploreBar.tsx` - preset layer sets reference `LayerVisibility` keys (line 17)
- `src/components/DetailPanel.tsx` - per-layer card switch (lines 206-234), `LAYER_COLORS`, `LAYER_TITLES`

### Problem 2: No Lazy Fetching (Bandwidth Waste)
Current architecture fetches ALL live feeds unconditionally, even when layers are toggled off:
- `App.tsx:74` - crime polls every 60s regardless of `visibility.crime`
- `App.tsx:83` - 311 polls every 60s regardless of `visibility.threeOneOne`
- `App.tsx:92` - fire polls every 60s regardless of `visibility.fire`

With 20+ default-off layers, this means 20+ polling intervals burning bandwidth, SODA rate limit, and CPU for data the user never sees.

### Problem 3: No Feature Normalization (Click/Detail Breakage)
Click handling in `CityMap.tsx` only understands two shapes:
- Tuple arrays (heritage, permits) - manually destructured at lines 75-95
- Shallow object spreads (everything else) - `{ ...info.object }` at line 94

This breaks for:
- GeoJSON features (wrapped in `feature.properties`, nested geometry)
- Line geometry layers (pavement condition, street closures)
- Heatmap layers (no individual object picking)

The `DetailPanel` default case (line 225) does flat `Object.entries` on properties, which will dump raw GeoJSON coordinates, nested objects, and geometry blobs as "fields".

### Problem 4: No Proxy/Backend Strategy (CORS + Auth + Mixed Content)
The app is a pure SPA with no backend. Several planned sources need:
- **Custom headers**: PurpleAir (`X-API-Key`), NWS (`User-Agent`), 511.org (API key)
- **HTTPS enforcement**: 511.org endpoint is `http://`, which is mixed content on any HTTPS deployment
- **CORS proxying**: CAL FIRE, some ArcGIS endpoints may not set CORS headers
- **Rate limit pooling**: 511.org allows 60 req/hr/token, making 15s polling impossible (240 req/hr)

Current `vite.config.ts` has no `server.proxy` configuration.

---

## Prerequisites (Sprint 0 - must complete before any new layer)

### P0.1 Layer Registry
- [ ] Design and implement
- **Goal:** Adding a new layer should require touching exactly 2 files: the layer definition file and the registry.
- **Design:**
  - Create `src/lib/layerRegistry.ts` with a `LayerDefinition` type:
    ```
    { id, group, label, icon, color, description, defaultVisible,
      createLayer(data, visible), normalizeFeature(picked),
      getTooltip(object), fetchConfig }
    ```
  - `fetchConfig` discriminated union: `{ type: 'soda', dataset, query, interval }` | `{ type: 'external', url, interval, transform }` | `{ type: 'static', url }` | `{ type: 'none' }` (for locally-loaded data)
  - Each layer file exports a `LayerDefinition` instead of a bare factory function
  - `App.tsx` iterates the registry instead of hardcoding per-layer state/hooks/props
  - `CityMap.tsx` maps registry entries to deck.gl layers, delegates tooltip/click to each definition's methods
  - `LayerPanel.tsx` reads from registry, groups by `group` field
  - `StatsBar.tsx` computes `liveCount` from registry entries tagged `group: 'safety'` (or a `live: true` flag)
  - `LiveFeed.tsx` consumes a generic `LiveFeedItem[]` produced by each live layer's normalizer, instead of hardcoded crime/311/fire props
  - `DetailPanel.tsx` delegates to `normalizeFeature()` from the registry, uses a generic card for layers without a custom one, and filters out geometry/internal fields
  - `ExploreBar.tsx` presets reference layer IDs as strings, not `keyof LayerVisibility`
- **Files:** New `layerRegistry.ts`, refactor all 8 components listed above, migrate existing 6 layers
- **Validation:** After refactoring, the app works identically with the original 6 layers. Adding a 7th layer touches only 1-2 files.

### P0.2 Lazy Fetch / Conditional Polling
- [ ] Design and implement
- **Goal:** Layers only fetch when visible. Toggling a layer off stops its polling. Toggling it on starts (or resumes) fetching.
- **Design:**
  - Modify `useSodaApi` (or the new generic hook) to accept an `enabled: boolean` param
  - When `enabled` is false: clear interval, skip fetch, return last-known data (not empty array - avoids jarring count drops)
  - When `enabled` transitions false-to-true: immediately fetch, then resume interval
  - The registry connects `fetchConfig` to the appropriate hook, passing `visibility[id]` as `enabled`
  - Static layers (Pattern C) load on first enable, then cache
  - Slowly-updating layers (quarterly/annual) fetch once on enable and do not poll
- **Rate limit math after fix:** Only visible layers poll. Default-on layers: heritage (static), landmarks (static), crime (60s), 311 (60s), fire (60s) = 180 req/hr baseline. Each toggled-on SODA layer adds 60 req/hr. Well within limits even without an app token.
- **Files:** `useSodaApi.ts`, new generic hook, `App.tsx` (or registry orchestrator)

### P0.3 Picked Feature Normalization
- [ ] Design and implement
- **Goal:** Any layer's picked object produces a uniform `SelectedFeature` that DetailPanel can render without layer-specific knowledge (while still allowing custom cards for layers that want them).
- **Design:**
  - Each `LayerDefinition` provides `normalizeFeature(pickedObject): NormalizedFeature`
  - `NormalizedFeature`: `{ title, subtitle?, badge?, time?, fields: { label, value }[], mediaUrl?, raw }`
  - `CityMap.onClick` calls the picked layer's `normalizeFeature` instead of the current switch statement
  - `DetailPanel` renders `NormalizedFeature` generically (title, badge, fields list), with optional custom card components registered per layer
  - Geometry fields (`point`, `the_geom`, `intersection_point`, `line`, `shape`), internal SODA fields (`:@computed_*`), and null values are stripped by default
  - GeoJSON features: unwrap `feature.properties` before normalizing
  - Tuple arrays: each layer's normalizer maps indices to named fields (already done for heritage/permits, just formalize it)
- **Files:** `types.ts` (new `NormalizedFeature`), `CityMap.tsx`, `DetailPanel.tsx`, each layer definition

### P0.4 Proxy & External API Strategy
- [ ] Design and implement
- **Goal:** External APIs that need headers, HTTPS, or CORS proxying work in both dev and production.
- **Design:**
  - **Dev:** Add `server.proxy` entries in `vite.config.ts` for problematic endpoints:
    ```
    '/api/511': { target: 'https://api.511.org', changeOrigin: true, rewrite: ... }
    '/api/calfire': { target: 'https://incidents.fire.ca.gov', changeOrigin: true, rewrite: ... }
    '/api/purpleair': { target: 'https://api.purpleair.com', changeOrigin: true, rewrite: ... }
    ```
  - **Production options (decide during Sprint 0):**
    - Option A: Cloudflare Worker as a thin proxy (free tier: 100K req/day)
    - Option B: Vercel Edge Function or serverless function
    - Option C: Only use sources that support CORS directly. Exclude 511/PurpleAir/CAL FIRE unless self-hosting.
  - **511.org specifics:**
    - Fix URL to `https://` (not `http://`)
    - Rate limit: 60 req/hr means minimum 60s polling, not 15s
    - Alternative: Use DataSF `x344-v6h6` (MUNI vehicle location history, no auth, SODA API) with `$where=position_date_time > '${fiveMinutesAgo}'` for pseudo-real-time positions
  - **NWS specifics:** Requires `User-Agent` header with contact info per API terms. Browser fetch cannot set `User-Agent`. Must proxy.
  - **API keys:** Add `.env.example` with placeholders. Document key registration URLs. Use `import.meta.env.VITE_*` prefix.
- **Files:** `vite.config.ts`, new `.env.example`, proxy handler (if Option A/B)

---

## Phase 1: SODA API Layers (Pattern A)

After prerequisites are done, each SODA layer is ~20 min: one file defining the `LayerDefinition`, one registry import.

### 1.1 Street & Sidewalk Cleaning
- [ ] Implementation
- **SODA ID:** `h3eg-w3pj`
- **Why:** Real-time graffiti, needles, feces, illegal dumping. 3.3M rows. The urban "pulse" layer.
- **Group:** Public Safety
- **Poll interval:** 60s (only when visible)
- **Query:** `$order=opened DESC&$limit=200`
- **Position field:** `point` (GeoJSON Point)
- **Color strategy:** By `request_type` (needles=red, feces=brown, graffiti=purple, dumping=orange, debris=gray)
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Live feed eligible:** yes (normalizer produces LiveFeedItems)
- **Priority:** P0

### 1.2 Traffic Crashes (Injuries)
- [ ] Implementation
- **SODA ID:** `ubvf-ztfx`
- **Why:** 64K collision locations with severity.
- **Group:** Public Safety
- **Poll interval:** none (fetch once on enable, quarterly dataset)
- **Query:** `$order=collision_datetime DESC&$limit=500`
- **Position field:** `point` (GeoJSON Point) or `tb_latitude`/`tb_longitude`
- **Color strategy:** By `collision_severity` (fatal=red, severe=orange, visible=yellow, complaint=white)
- **Layer type:** ScatterplotLayer (HeatmapLayer as future option)
- **Default visible:** false
- **Priority:** P0

### 1.3 Eviction Notices
- [ ] Implementation
- **SODA ID:** `5cei-gny5`
- **Why:** Housing displacement patterns. 48K rows since 2013.
- **Group:** Urban Life
- **Poll interval:** none (fetch once on enable, monthly dataset)
- **Query:** `$order=file_date DESC&$limit=300`
- **Position field:** `client_location` (lat/lng object)
- **Color strategy:** By eviction type (Ellis Act=red, owner move-in=orange, non-payment=yellow)
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P0

### 1.4 Food Trucks
- [ ] Implementation
- **SODA ID:** `rqzj-sfat`
- **Why:** 497 rows. Low overhead, fun layer.
- **Group:** Urban Life
- **Poll interval:** none (fetch once on enable, daily dataset)
- **Query:** `$where=status='APPROVED'&$limit=500`
- **Position field:** `latitude`/`longitude`
- **Color strategy:** Bright green
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P1

### 1.5 Tent/Encampment Counts
- [ ] Implementation
- **SODA ID:** `w9ip-yrij`
- **Why:** Quarterly encampment mapping. 1.7K rows.
- **Group:** Urban Life
- **Poll interval:** none (quarterly dataset)
- **Query:** `$order=observed_month DESC&$limit=200`
- **Position field:** `point` (GeoJSON Point)
- **Color strategy:** Radius scaled by count (tents + structures + vehicles)
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P1

### 1.6 Health Inspections
- [ ] Implementation
- **SODA ID:** `tvy3-wexg`
- **Why:** Restaurant safety scores. 20K rows.
- **Group:** Urban Life
- **Poll interval:** none (fetch once on enable)
- **Query:** `$order=inspection_date DESC&$limit=300`
- **Position field:** `point` (GeoJSON Point)
- **Color strategy:** Score gradient green (good) to red (poor)
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P1

### 1.7 Street Trees
- [ ] Implementation
- **SODA ID:** `tkzw-k3nq`
- **Why:** 198K trees. Beautiful canopy visualization.
- **Group:** Environment
- **Poll interval:** none (static)
- **Query:** `$limit=5000&$select=treeid,qspecies,latitude,longitude`
- **Position field:** `latitude`/`longitude`
- **Color strategy:** Solid green, vary opacity by species
- **Layer type:** ScatterplotLayer with small radius
- **Default visible:** false
- **Consideration:** 198K points is too large for SODA polling. Pre-process via `scripts/preprocess.py` into compact tuple format like heritage data. Serve from `public/data/trees.json`.
- **Priority:** P2

### 1.8 Pavement Condition
- [ ] Implementation
- **SODA ID:** `5aye-4rtt`
- **Why:** Road quality by segment. 19K rows with line geometry.
- **Group:** Infrastructure
- **Poll interval:** none (static)
- **Query:** `$limit=2000&$select=street_name,pci_score,line`
- **Position field:** `line` (GeoJSON LineString)
- **Color strategy:** PCI score gradient (red < 25, orange 25-50, yellow 50-75, green > 75)
- **Layer type:** GeoJsonLayer (LineString) - requires P0.3 normalization to handle line picks
- **Default visible:** false
- **Priority:** P2

### 1.9 Places of Entertainment
- [ ] Implementation
- **SODA ID:** `76g9-59eq`
- **Why:** Nightlife/venues. 331 rows.
- **Group:** Urban Life
- **Poll interval:** none (fetch once)
- **Query:** `$where=permit_status='Active'&$limit=500`
- **Position field:** `point` (GeoJSON Point)
- **Color strategy:** Purple/magenta
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P2

### 1.10 Active Businesses
- [ ] Implementation
- **SODA ID:** `kvj8-g7jh`
- **Why:** 127K registered businesses.
- **Group:** Urban Life
- **Poll interval:** none (fetch once)
- **Query:** `$limit=500&$order=location_start_date DESC`
- **Position field:** `location` (GeoJSON Point)
- **Color strategy:** By NAICS category
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Consideration:** Filter to specific NAICS codes (restaurants, cannabis, bars) or show only recent openings (last 90 days).
- **Priority:** P2

### 1.11 Parking Citations
- [ ] Implementation
- **SODA ID:** `ab4h-6ztd`
- **Why:** 23M rows total; filter to today only.
- **Group:** Transportation
- **Poll interval:** 3600s (only when visible)
- **Query:** `$where=citation_issued_datetime > '${todayISO}'&$order=citation_issued_datetime DESC&$limit=200`
- **Position field:** `the_geom` (GeoJSON Point)
- **Color strategy:** By `fine_amount` or `violation`
- **Layer type:** ScatterplotLayer (HeatmapLayer requires no picking - note in normalizer)
- **Default visible:** false
- **Priority:** P3

### 1.12 Street-Use Permits (Events/Film/Construction)
- [ ] Implementation
- **SODA ID:** `b6tj-gt35`
- **Why:** Active construction, film shoots, street events.
- **Group:** Infrastructure
- **Poll interval:** none (fetch once, daily dataset)
- **Query:** `$where=permit_start_date <= '${todayISO}' AND permit_end_date >= '${todayISO}' AND status='APPROVED'&$limit=200`
- **Position field:** `the_geom` (GeoJSON Point)
- **Color strategy:** By `permit_type` (construction=orange, film=purple, event=blue)
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P2

### 1.13 SFO Aircraft Noise
- [ ] Implementation
- **SODA ID:** `qxw2-ncq3`
- **Why:** 30 monitoring stations, daily noise levels.
- **Group:** Environment
- **Poll interval:** none (fetch once, daily dataset)
- **Query:** `$order=measurement_date DESC&$limit=30&$select=location_name,total_cnel,latitude,longitude,point`
- **Position field:** `point` (GeoJSON Point)
- **Color strategy:** CNEL gradient (green < 55dB, yellow 55-65, orange 65-75, red > 75)
- **Layer type:** ScatterplotLayer with radius scaled by dB
- **Default visible:** false
- **Priority:** P3

### 1.14 Storefront Vacancy
- [ ] Implementation
- **SODA ID:** `rzkk-54yv`
- **Why:** 19K commercial spaces with vacancy status.
- **Group:** Urban Life
- **Poll interval:** none (annual dataset)
- **Query:** `$where=vacant='YES'&$limit=2000`
- **Position field:** `latitude`/`longitude`
- **Color strategy:** Red dots
- **Layer type:** ScatterplotLayer
- **Default visible:** false
- **Priority:** P3

---

## Phase 2: External Real-Time APIs (Pattern B)

Each requires a fetch function in `src/lib/` and a `LayerDefinition` with `fetchConfig: { type: 'external' }`. Estimated ~1-2 hours each.

### 2.1 Bay Wheels Bike Stations
- [ ] Implementation
- **Endpoints:**
  - Stations: `https://gbfs.lyft.com/gbfs/2.3/bay/en/station_information.json`
  - Status: `https://gbfs.lyft.com/gbfs/2.3/bay/en/station_status.json`
- **Auth:** None
- **CORS:** GBFS endpoints support CORS. No proxy needed.
- **Poll interval:** 60s (only when visible)
- **Position field:** `lat`/`lon` from station_information (join by `station_id`)
- **Color strategy:** Green (bikes available) to red (empty)
- **Layer type:** ScatterplotLayer with radius = dock count
- **New code:** `src/lib/gbfs.ts` - fetch + join station_information + station_status
- **Group:** Transportation
- **Priority:** P0

### 2.2 Lime Scooters
- [ ] Implementation
- **Endpoint:** `https://data.lime.bike/api/partners/v2/gbfs/san_francisco/free_bike_status`
- **Auth:** None
- **CORS:** Typically yes for GBFS. Test early.
- **Poll interval:** 60s (only when visible)
- **Position field:** `lat`/`lon` per bike
- **Color strategy:** Lime green, size by `current_range_meters`
- **Layer type:** ScatterplotLayer
- **Volume:** ~3K scooters
- **Group:** Transportation
- **Priority:** P1

### 2.3 USGS Earthquakes
- [ ] Implementation
- **Endpoint:** `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=37.5&maxlatitude=38.0&minlongitude=-122.6&maxlongitude=-122.2&starttime=${30daysAgo}`
- **Auth:** None
- **CORS:** Yes. USGS explicitly supports CORS.
- **Poll interval:** 300s (only when visible)
- **Position field:** Native GeoJSON `coordinates` in each feature
- **Color strategy:** By magnitude (green < 2, yellow 2-3, orange 3-4, red > 4)
- **Layer type:** ScatterplotLayer with radius scaled by magnitude
- **Feature normalization:** Unwrap GeoJSON `feature.properties` - extract `mag`, `place`, `time`, `url`
- **New code:** `src/lib/usgs.ts`
- **Group:** Environment
- **Priority:** P0

### 2.4 NWS Weather Alerts
- [ ] Implementation
- **Endpoint:** `https://api.weather.gov/alerts/active?point=37.7749,-122.4194`
- **Auth:** None, but requires `User-Agent` header with contact info per NWS API terms
- **CORS:** Yes, but `User-Agent` cannot be set from browser `fetch`. **Requires proxy** (P0.4).
- **Poll interval:** 300s (only when visible)
- **Position field:** GeoJSON polygon geometries in response
- **Color strategy:** By `severity` (extreme=red, severe=orange, moderate=yellow, minor=blue)
- **Layer type:** GeoJsonLayer (polygon overlay)
- **Feature normalization:** Extract `headline`, `description`, `severity`, `event`, `effective`, `expires` from GeoJSON properties
- **Group:** Environment
- **Depends on:** P0.4 (proxy)
- **Priority:** P1

### 2.5 BART Real-Time Departures
- [ ] Implementation
- **Endpoint:** `https://api.bart.gov/api/etd.aspx?cmd=etd&orig=ALL&key=MW9S-E7SL-26DU-VV8V&json=y`
- **Auth:** Demo key `MW9S-E7SL-26DU-VV8V` (production: register free key)
- **CORS:** Yes. BART API supports CORS.
- **Poll interval:** 60s (only when visible)
- **Position:** Static station coordinates (fetch once from station API, cache)
- **Color strategy:** By line color (yellow, blue, red, green, orange)
- **Layer type:** ScatterplotLayer, radius = total departures queued
- **New code:** `src/lib/bart.ts`
- **Group:** Transportation
- **Priority:** P1

### 2.6 CAL FIRE Active Incidents
- [ ] Implementation
- **Endpoint:** `https://incidents.fire.ca.gov/umbraco/api/IncidentApi/List?inactive=false`
- **Auth:** None
- **CORS:** Unknown. Test early. **May require proxy** (P0.4).
- **Poll interval:** 300s (only when visible)
- **Position field:** `Latitude`/`Longitude`
- **Color strategy:** Red/orange with size by `AcresBurned`
- **Layer type:** ScatterplotLayer
- **Group:** Public Safety
- **Note:** 0 incidents most of the year. Layer should show "No active fires" state.
- **Priority:** P2

---

## Phase 3: Static Polygon Overlays (Pattern C)

Load once on first enable. Rendered with `GeoJsonLayer`. No polling.

### 3.1 FEMA Flood Zones
- [ ] Implementation
- **Source:** DataSF SODA `jyce-e25k` (GeoJSON via `$limit=5000` with geometry)
- **Volume:** 222 polygon features
- **Color strategy:** Semi-transparent blue, darker for higher-risk zones (AE > X)
- **Layer type:** GeoJsonLayer
- **Group:** Hazard Zones
- **Default visible:** false
- **Priority:** P1

### 3.2 Liquefaction Zones
- [ ] Implementation
- **Endpoint:** ArcGIS FeatureServer query with `f=geojson`
- **CORS:** ArcGIS Online typically supports CORS. Test early.
- **Volume:** 53 polygon features
- **Color strategy:** Semi-transparent red/brown
- **Layer type:** GeoJsonLayer
- **Group:** Hazard Zones
- **Default visible:** false
- **Priority:** P1

### 3.3 Tsunami Inundation Zone
- [ ] Implementation
- **Source:** DataSF SODA `7p2k-c3z6`
- **Volume:** 1 large polygon
- **Color strategy:** Semi-transparent teal/cyan
- **Layer type:** GeoJsonLayer
- **Group:** Hazard Zones
- **Default visible:** false
- **Priority:** P2

### 3.4 Sea Level Rise Scenarios
- [ ] Implementation
- **Source:** NOAA Digital Coast ArcGIS REST
- **Color strategy:** Blue gradient by rise scenario (1ft, 3ft, 6ft)
- **Layer type:** GeoJsonLayer
- **UI:** Slider or dropdown to pick scenario
- **Group:** Hazard Zones
- **Default visible:** false
- **Consideration:** Large polygon geometries. Pre-download and serve from `public/data/`. CORS may be an issue.
- **Priority:** P3

### 3.5 100-Year Storm Flooding
- [ ] Implementation
- **Source:** DataSF SODA `wppz-u2hi`
- **Volume:** 1,450 MultiPolygon features
- **Color strategy:** Semi-transparent blue with contour levels
- **Layer type:** GeoJsonLayer
- **Group:** Hazard Zones
- **Default visible:** false
- **Priority:** P3

---

## Phase 4: API-Key-Required Sources

Need `.env` setup, key registration, and proxy for some.

### 4.1 PurpleAir (Air Quality Sensors)
- [ ] Register API key at develop.purpleair.com
- [ ] Implementation
- **Endpoint:** `https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5&nwlng=-122.52&nwlat=37.82&selng=-122.35&selat=37.70`
- **Auth:** `X-API-Key` header. **Requires proxy** (P0.4) - browser cannot set custom headers on cross-origin requests without CORS preflight allowing it.
- **Poll interval:** 120s (only when visible)
- **Volume:** 100-300 sensors in SF
- **Color strategy:** AQI color scale (green < 50, yellow 50-100, orange 100-150, red 150-200, purple > 200)
- **Layer type:** ScatterplotLayer
- **Group:** Environment
- **Depends on:** P0.4 (proxy)
- **Priority:** P1

### 4.2 AirNow (Official AQI)
- [ ] Register API key at airnowapi.org
- [ ] Implementation
- **Auth:** API key in query param (no header needed, no proxy needed if CORS is allowed)
- **Poll interval:** 3600s (hourly updates, only when visible)
- **Volume:** 5-10 official stations
- **Group:** Environment
- **Priority:** P2

### 4.3 MUNI Real-Time Positions
- [ ] Register API key at 511.org
- [ ] Implementation
- **Endpoint:** `https://api.511.org/transit/VehicleMonitoring?api_key={KEY}&agency=SF&format=json` (HTTPS, not HTTP)
- **Auth:** API key in query param
- **Rate limit:** 60 requests/hour/token. **Minimum poll interval: 60s** (not 15s as originally planned)
- **CORS:** Unknown. Likely **requires proxy** (P0.4).
- **Volume:** Hundreds of active vehicles
- **Color strategy:** By MUNI line color
- **Layer type:** ScatterplotLayer
- **Group:** Transportation
- **Alternative:** Use DataSF `x344-v6h6` (MUNI vehicle location history). No auth, SODA API, query `$where=position_date_time > '${fiveMinAgo}'`. Pseudo-real-time with ~5min lag, but zero auth complexity.
- **Depends on:** P0.4 (proxy) unless using DataSF alternative
- **Priority:** P1

### 4.4 Census ACS Demographics (Choropleth)
- [ ] Register API key at api.census.gov
- [ ] Implementation
- **Data:** Income, population, race/ethnicity at block group level
- **Geometry:** TIGERweb block group boundaries
- **Color strategy:** Choropleth gradient by selected variable
- **Layer type:** GeoJsonLayer with fill by data value
- **UI:** Dropdown to select demographic variable
- **Group:** Demographics
- **Consideration:** Complex. Pre-process: join Census API tabular data with TIGER boundaries offline, output `public/data/census_*.json`. Do not call Census API from the browser.
- **Priority:** P3

---

## Phase 5: Static Download Datasets

Require preprocessing scripts.

### 5.1 Inside Airbnb Listings
- [ ] Download from insideairbnb.com
- [ ] Write preprocessing script in `scripts/preprocess_airbnb.py`
- [ ] Implementation
- **Source:** CSV with lat/lng, price, room type, reviews
- **Output:** Compact JSON in `public/data/airbnb.json`
- **Color strategy:** By price range or room type
- **Layer type:** ScatterplotLayer
- **Group:** Urban Life
- **Priority:** P3

---

## Implementation Order

### Sprint 0: Prerequisites (BLOCKING - no layers until complete)
1. [ ] P0.1 Layer Registry
2. [ ] P0.2 Lazy Fetch / Conditional Polling
3. [ ] P0.3 Picked Feature Normalization
4. [ ] P0.4 Proxy & External API Strategy
5. [ ] Migrate existing 6 layers to registry
6. [ ] Verify: app works identically post-refactor
7. [ ] Register SODA app token at data.sfgov.org (free, prevents rate limit issues)
8. [ ] Add `.env.example`

### Sprint 1: First New Layers (3 layers)
9. [ ] 1.1 Street & Sidewalk Cleaning (P0, SODA)
10. [ ] 2.1 Bay Wheels Bikes (P0, external, CORS-safe)
11. [ ] 2.3 USGS Earthquakes (P0, external, CORS-safe)

### Sprint 2: Safety + Transportation (4 layers)
12. [ ] 1.2 Traffic Crashes (P0, SODA)
13. [ ] 1.3 Eviction Notices (P0, SODA)
14. [ ] 2.5 BART Departures (P1, external)
15. [ ] 2.2 Lime Scooters (P1, external)

### Sprint 3: Hazard Zones + Environment (4 layers)
16. [ ] 3.1 FEMA Flood Zones (P1, static)
17. [ ] 3.2 Liquefaction Zones (P1, static)
18. [ ] 4.1 PurpleAir Air Quality (P1, needs proxy)
19. [ ] 2.4 NWS Weather Alerts (P1, needs proxy)

### Sprint 4: Urban Life (4 layers)
20. [ ] 1.4 Food Trucks (P1, SODA)
21. [ ] 1.5 Encampment Counts (P1, SODA)
22. [ ] 1.6 Health Inspections (P1, SODA)
23. [ ] 1.12 Street-Use Permits (P2, SODA)

### Sprint 5: Depth + Polish (remaining)
24. [ ] 1.7 Street Trees (P2, preprocess + static)
25. [ ] 1.8 Pavement Condition (P2, GeoJsonLayer lines)
26. [ ] 1.9 Entertainment Venues (P2, SODA)
27. [ ] 4.3 MUNI Real-Time or DataSF alternative (P1)
28. [ ] 3.3 Tsunami Zone (P2, static)
29. [ ] 2.6 CAL FIRE (P2, external)
30. [ ] 1.10 Active Businesses (P2, SODA)
31. [ ] 1.11 Parking Citations (P3, SODA)
32. [ ] 1.13 Aircraft Noise (P3, SODA)
33. [ ] 1.14 Storefront Vacancy (P3, SODA)
34. [ ] 3.4 Sea Level Rise (P3, static, large geometry)
35. [ ] 3.5 100-Year Storm (P3, static)
36. [ ] 4.2 AirNow AQI (P2, API key)
37. [ ] 4.4 Census Demographics (P3, preprocess)
38. [ ] 5.1 Inside Airbnb (P3, preprocess)

---

## Reliability

### Per-Layer Error States
- [ ] Each registry entry tracks: `status: 'idle' | 'loading' | 'ready' | 'error' | 'stale'`
- [ ] `LayerPanel` shows status indicator per layer (green dot = fresh, yellow = stale, red = error, spinner = loading)
- [ ] `StatsBar` shows overall health: "3/9 live feeds healthy" instead of assuming all feeds work
- [ ] Staleness detection: if a polling layer hasn't updated in 3x its interval, mark stale

### Retry & Backoff
- [ ] On fetch error: retry once after 5s, then exponential backoff (10s, 30s, 60s, cap at 5min)
- [ ] On rate limit (HTTP 429): read `Retry-After` header, pause that layer's polling
- [ ] Static layers: retry 3 times on load failure, then show error state with manual retry button

### Error Propagation (currently broken)
- `useSodaApi` returns `{ error }` but `App.tsx` ignores it entirely
- Static data `Promise.all` (App.tsx:55) has no `.catch` - if heritage.json 404s, all three static layers silently fail
- Fix: Registry should surface per-layer errors to UI

---

## Risk Notes

- **SODA rate limiting**: With lazy fetch, baseline is ~180 req/hr (3 default-on layers at 60s). Each toggled-on layer adds up to 60/hr. Register a free app token anyway as insurance.
- **Bundle size**: `GeoJsonLayer` and `HeatmapLayer` may not tree-shake from deck.gl. Import from `@deck.gl/layers` and `@deck.gl/aggregation-layers` directly.
- **Memory**: Heritage (145K) + street trees (198K) + scooters (3K) simultaneously is ~350K objects. Monitor with `performance.memory` in dev. Consider viewport-based filtering for the largest layers.
- **CORS reality check**: Test GBFS (Lyft, Lime), ArcGIS, and CAL FIRE endpoints from the browser early in Sprint 0. Any that fail CORS dictate whether the proxy (P0.4) must be a real backend vs. dev-only convenience.
- **511.org vs DataSF MUNI**: The DataSF alternative (`x344-v6h6`) avoids all auth/CORS/rate-limit problems at the cost of ~5min data lag. For an urban dashboard (not a transit tracker), this is likely the right tradeoff. Decide during Sprint 0.
