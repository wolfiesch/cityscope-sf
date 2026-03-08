#!/usr/bin/env python3
"""Preprocess HistoryAPI JSON files into compact formats for deck.gl."""
import json
import os

DATA_DIR = os.path.expanduser("~/Projects/HistoryAPI/data/processed")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
os.makedirs(OUT_DIR, exist_ok=True)

# --- Heritage (145K parcels) ---
# Output as flat array: [[lng, lat, category_code, name], ...]
# category_code: 0=unknown, 1=Category A (Known Historic), 2=Category B (Potential), 3=Category C (Not Historic)
CATEGORY_MAP = {"a": 1, "b": 2, "c": 3}

def extract_category(facts):
    for fact in facts:
        desc = (fact.get("description") or "").lower()
        title = (fact.get("title") or "").lower()
        combined = desc + " " + title
        if "category a" in combined or "known historic" in combined:
            return 1
        if "category b" in combined or "potential" in combined:
            return 2
        if "category c" in combined or "not historic" in combined:
            return 3
    # Try fact_kind
    for fact in facts:
        kind = (fact.get("fact_kind") or "").lower()
        if "landmark" in kind or "historic" in kind:
            return 1
    return 0

print("Processing heritage data...")
with open(os.path.join(DATA_DIR, "datasf_20260125_054800.json")) as f:
    raw = json.load(f)

heritage = []
for entry in raw["entries"]:
    loc = entry["location"]
    lat, lng = loc.get("lat"), loc.get("lng")
    if lat is None or lng is None:
        continue
    cat = extract_category(entry.get("facts", []))
    name = loc.get("name") or loc.get("address") or ""
    heritage.append([round(lng, 6), round(lat, 6), cat, name[:80]])

print(f"  Heritage: {len(heritage)} points")
with open(os.path.join(OUT_DIR, "heritage.json"), "w") as f:
    json.dump(heritage, f, separators=(",", ":"))
print(f"  Size: {os.path.getsize(os.path.join(OUT_DIR, 'heritage.json')) / 1024 / 1024:.1f} MB")

# --- Permits (30K) ---
# Output: [[lng, lat, type_code, address, year, description], ...]
# type_code: 0=other, 1=demolition, 2=renovation/alteration, 3=new construction
def permit_type(facts):
    for fact in facts:
        kind = (fact.get("fact_kind") or "").lower()
        title = (fact.get("title") or "").lower()
        combined = kind + " " + title
        if "demolition" in combined:
            return 1
        if "alteration" in combined or "renovation" in combined or "repair" in combined:
            return 2
        if "new construction" in combined or "erect" in combined or "new build" in combined:
            return 3
    return 0

print("Processing permits...")
with open(os.path.join(DATA_DIR, "permits_20260125_173820.json")) as f:
    raw = json.load(f)

permits = []
for entry in raw["entries"]:
    loc = entry["location"]
    lat, lng = loc.get("lat"), loc.get("lng")
    if lat is None or lng is None:
        continue
    pt = permit_type(entry.get("facts", []))
    addr = loc.get("address") or loc.get("name") or ""
    year = None
    desc = ""
    for fact in entry.get("facts", []):
        if fact.get("year_start"):
            year = fact["year_start"]
        if fact.get("summary"):
            desc = fact["summary"][:120]
            break
        if fact.get("description"):
            desc = fact["description"][:120]
    permits.append([round(lng, 6), round(lat, 6), pt, addr[:60], year, desc])

print(f"  Permits: {len(permits)} points")
with open(os.path.join(OUT_DIR, "permits.json"), "w") as f:
    json.dump(permits, f, separators=(",", ":"))
print(f"  Size: {os.path.getsize(os.path.join(OUT_DIR, 'permits.json')) / 1024 / 1024:.1f} MB")

# --- Landmarks (OSM + NRHP merged) ---
# Output: [{name, lat, lng, source, description, year?, nrhp_id?, wikidata_id?}, ...]
print("Processing landmarks...")
landmarks = []

for src_file, src_name in [
    ("osm_20260125_061039.json", "osm"),
    ("nrhp_arcgis_20260125_054804.json", "nrhp"),
]:
    with open(os.path.join(DATA_DIR, src_file)) as f:
        raw = json.load(f)
    for entry in raw["entries"]:
        loc = entry["location"]
        lat, lng = loc.get("lat"), loc.get("lng")
        if lat is None or lng is None:
            continue
        name = loc.get("name") or ""
        desc = ""
        year = None
        for fact in entry.get("facts", []):
            if fact.get("description"):
                desc = fact["description"][:200]
            if fact.get("year_start"):
                year = fact["year_start"]
        landmarks.append({
            "name": name,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "source": src_name,
            "description": desc,
            "year": year,
            "nrhp_id": loc.get("nrhp_id"),
            "wikidata_id": loc.get("wikidata_id"),
        })

# Deduplicate by proximity (within ~50m)
seen = set()
deduped = []
for lm in landmarks:
    key = (round(lm["lat"], 4), round(lm["lng"], 4))
    if key not in seen:
        seen.add(key)
        deduped.append(lm)

print(f"  Landmarks: {len(deduped)} points (deduped from {len(landmarks)})")
with open(os.path.join(OUT_DIR, "landmarks.json"), "w") as f:
    json.dump(deduped, f, separators=(",", ":"))
print(f"  Size: {os.path.getsize(os.path.join(OUT_DIR, 'landmarks.json')) / 1024:.1f} KB")

print("\nDone! Files written to public/data/")
