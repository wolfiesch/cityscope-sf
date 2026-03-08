#!/usr/bin/env python3
"""Extract SF historic maps from Rumsey CSV and fetch IIIF dimensions.

Outputs public/data/historic_maps.json with all SF maps ready for Allmaps overlay.

Usage:
    python3 scripts/extract_rumsey_maps.py
    python3 scripts/extract_rumsey_maps.py --limit 50  # test with small batch
"""

# NOTE: ast.literal_eval is used intentionally here - it safely parses Python
# literal syntax (dicts, lists, strings, numbers) WITHOUT executing arbitrary code.
# The Rumsey CSV uses Python dict syntax for GCPs, not JSON.

import ast
import asyncio
import csv
import json
import sys
from pathlib import Path

import httpx

RUMSEY_CSV = Path.home() / "Projects/HistoryAPI/data/rumsey/luna_omo_metadata_56628_20220724.csv"
OUTPUT = Path(__file__).parent.parent / "public/data/historic_maps.json"

# SF bounding box
SF_BOUNDS = {"lat_min": 37.7, "lat_max": 37.82, "lng_min": -122.52, "lng_max": -122.35}

MAX_CONCURRENT = 20
REQUEST_TIMEOUT = 15


def parse_gcps(gcps_str: str) -> list[dict] | None:
    """Parse GCPs from Python literal string using safe ast.literal_eval."""
    if not gcps_str or gcps_str.strip() in ("", "[]"):
        return None
    try:
        # ast.literal_eval is safe - only parses literals, no code execution
        gcps = ast.literal_eval(gcps_str)
        if isinstance(gcps, list) and len(gcps) >= 3:
            return gcps
        return None
    except (ValueError, SyntaxError, TypeError):
        return None


def is_sf_map(gcps: list[dict]) -> bool:
    for gcp in gcps:
        loc = gcp.get("location", [0, 0])
        lng, lat = loc[0], loc[1]
        if SF_BOUNDS["lat_min"] <= lat <= SF_BOUNDS["lat_max"] and SF_BOUNDS["lng_min"] <= lng <= SF_BOUNDS["lng_max"]:
            return True
    return False


def extract_year(date_str: str) -> int | None:
    if not date_str:
        return None
    try:
        return int(float(date_str))
    except (ValueError, TypeError):
        return None


def extract_sf_maps(limit: int | None = None) -> list[dict]:
    maps = []
    with open(RUMSEY_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gcps = parse_gcps(row.get("gcps", ""))
            if not gcps:
                continue
            if not is_sf_map(gcps):
                continue

            year = extract_year(row.get("date", ""))
            title = row.get("title", "").strip()
            image_url = row.get("image_url", "").strip()
            map_id = row.get("id", "").strip()

            if not image_url or not map_id:
                continue

            maps.append({
                "id": map_id,
                "title": title,
                "year": year,
                "iiif_base": image_url,
                "gcps": [{"location": g["location"], "pixel": g["pixel"]} for g in gcps],
                "transformation_method": row.get("transformation_method", "affine").strip(),
            })

            if limit and len(maps) >= limit:
                break

    # Sort by year
    maps.sort(key=lambda m: (m["year"] or 9999, m["title"]))
    return maps


async def fetch_dimensions(
    client: httpx.AsyncClient,
    m: dict,
    semaphore: asyncio.Semaphore,
) -> dict | None:
    async with semaphore:
        base = m["iiif_base"].rstrip("/")
        # Some URLs already end in /info.json
        if base.endswith("/info.json"):
            url = base
            m["iiif_base"] = base.replace("/info.json", "")
        else:
            url = base + "/info.json"
        try:
            resp = await client.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True)
            if resp.status_code == 200:
                data = resp.json()
                w, h = data.get("width"), data.get("height")
                if w and h:
                    m["width"] = w
                    m["height"] = h
                    return m
                else:
                    print(f"  NO DIMS {m['id'][:8]}: keys={list(data.keys())[:5]}", file=sys.stderr)
            else:
                print(f"  HTTP {resp.status_code} {m['id'][:8]}: {url[:60]}", file=sys.stderr)
        except Exception as e:
            print(f"  FAIL {m['id'][:8]}: {e}", file=sys.stderr)
    return None


async def backfill_dimensions(maps: list[dict]) -> list[dict]:
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    async with httpx.AsyncClient() as client:
        tasks = [fetch_dimensions(client, m, semaphore) for m in maps]
        results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


def main():
    limit = None
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        limit = int(sys.argv[idx + 1])

    print(f"Extracting SF maps from {RUMSEY_CSV}...")
    maps = extract_sf_maps(limit)
    print(f"Found {len(maps)} SF maps with GCPs")

    print(f"Fetching IIIF dimensions ({MAX_CONCURRENT} concurrent)...")
    maps_with_dims = asyncio.run(backfill_dimensions(maps))
    print(f"Got dimensions for {len(maps_with_dims)} maps")

    # Write output
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(maps_with_dims, f, separators=(",", ":"))

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Wrote {OUTPUT} ({size_kb:.0f} KB, {len(maps_with_dims)} maps)")


if __name__ == "__main__":
    main()
