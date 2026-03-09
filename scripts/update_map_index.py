#!/usr/bin/env python3
"""Add bbox/centroid to historic maps index and filter to SF-area maps.

Reads each individual map JSON to compute geographic extent, then
filters to maps that are genuinely SF-focused (not US/California-wide).

Usage:
    python3 scripts/update_map_index.py
    python3 scripts/update_map_index.py --dry-run  # preview without writing
"""

import json
import os
import sys

MAPS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "maps")
INDEX_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "data", "historic_maps_index.json")

# SF metro area - generous bounds that include the peninsula and nearby areas
SF_METRO = {
    "lat_min": 37.60,
    "lat_max": 37.90,
    "lng_min": -122.60,
    "lng_max": -122.30,
}

# Max geographic spread for a "local" map (degrees)
# ~1.0 deg ≈ 111km lat, ~88km lng at SF latitude - covers SF + nearby cities
MAX_SPREAD_DEG = 1.0


def compute_map_bbox(gcps):
    """Compute bounding box from GCPs."""
    lngs = [g["location"][0] for g in gcps]
    lats = [g["location"][1] for g in gcps]
    return {
        "west": min(lngs),
        "south": min(lats),
        "east": max(lngs),
        "north": max(lats),
    }


def is_sf_focused(bbox):
    """Check if a map is focused on the SF area (not a wide-area map)."""
    spread_lng = bbox["east"] - bbox["west"]
    spread_lat = bbox["north"] - bbox["south"]

    # Reject maps with too large a geographic spread
    if spread_lng > MAX_SPREAD_DEG or spread_lat > MAX_SPREAD_DEG:
        return False

    # Check that the centroid is near SF
    centroid_lng = (bbox["west"] + bbox["east"]) / 2
    centroid_lat = (bbox["south"] + bbox["north"]) / 2

    # Centroid should be within the greater SF metro area
    if not (SF_METRO["lat_min"] <= centroid_lat <= SF_METRO["lat_max"]):
        return False
    if not (SF_METRO["lng_min"] <= centroid_lng <= SF_METRO["lng_max"]):
        return False

    return True


def main():
    dry_run = "--dry-run" in sys.argv

    with open(INDEX_FILE) as f:
        index = json.load(f)

    print(f"Current index: {len(index)} maps")

    updated = []
    skipped_no_file = 0
    skipped_not_sf = 0
    skipped_few_gcps = 0

    for entry in index:
        map_file = os.path.join(MAPS_DIR, f"{entry['id']}.json")
        if not os.path.exists(map_file):
            skipped_no_file += 1
            continue

        with open(map_file) as f:
            full_map = json.load(f)

        gcps = full_map.get("gcps", [])
        if len(gcps) < 3:
            skipped_few_gcps += 1
            continue

        bbox = compute_map_bbox(gcps)

        if not is_sf_focused(bbox):
            skipped_not_sf += 1
            continue

        # Add bbox to the index entry
        entry["bbox"] = [
            round(bbox["west"], 6),
            round(bbox["south"], 6),
            round(bbox["east"], 6),
            round(bbox["north"], 6),
        ]
        updated.append(entry)

    print(f"\nResults:")
    print(f"  SF-focused maps: {len(updated)}")
    print(f"  Skipped (not SF): {skipped_not_sf}")
    print(f"  Skipped (no file): {skipped_no_file}")
    print(f"  Skipped (<3 GCPs): {skipped_few_gcps}")

    if not dry_run:
        with open(INDEX_FILE, "w") as f:
            json.dump(updated, f, separators=(",", ":"))
        size_kb = os.path.getsize(INDEX_FILE) / 1024
        print(f"\nWrote {INDEX_FILE} ({size_kb:.0f} KB)")
    else:
        print("\n[DRY RUN] No files written")
        # Show some examples of what was filtered
        print("\nSample filtered-out maps:")
        for entry in index[:20]:
            map_file = os.path.join(MAPS_DIR, f"{entry['id']}.json")
            if not os.path.exists(map_file):
                continue
            with open(map_file) as f:
                full_map = json.load(f)
            gcps = full_map.get("gcps", [])
            if len(gcps) < 3:
                continue
            bbox = compute_map_bbox(gcps)
            if not is_sf_focused(bbox):
                spread_lng = bbox["east"] - bbox["west"]
                spread_lat = bbox["north"] - bbox["south"]
                print(f"  {entry['title'][:50]:50s} spread: {spread_lng:.1f}x{spread_lat:.1f} deg")


if __name__ == "__main__":
    main()
