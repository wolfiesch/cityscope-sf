#!/usr/bin/env python3
"""Convert tuple-array JSON files to GeoJSON for tippecanoe input."""

import json
from pathlib import Path


def main():
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "public" / "data"

    # Heritage: [lng, lat, category_code, name]
    heritage_path = data_dir / "heritage.json"
    with open(heritage_path) as f:
        heritage_tuples = json.load(f)

    heritage_features = []
    for t in heritage_tuples:
        lng, lat, category_code, name = t
        heritage_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "category_code": category_code,
                "name": name,
            },
        })

    heritage_geojson = {"type": "FeatureCollection", "features": heritage_features}
    heritage_out = data_dir / "heritage.geojson"
    with open(heritage_out, "w") as f:
        json.dump(heritage_geojson, f)
    print(f"heritage: {len(heritage_features)} features -> {heritage_out}")

    # Permits: [lng, lat, type_code, address, year, description]
    permits_path = data_dir / "permits.json"
    with open(permits_path) as f:
        permits_tuples = json.load(f)

    permits_features = []
    for t in permits_tuples:
        lng, lat, type_code, address, year, description = t
        permits_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "type_code": type_code,
                "address": address,
                "year": year,
                "description": description,
            },
        })

    permits_geojson = {"type": "FeatureCollection", "features": permits_features}
    permits_out = data_dir / "permits.geojson"
    with open(permits_out, "w") as f:
        json.dump(permits_geojson, f)
    print(f"permits: {len(permits_features)} features -> {permits_out}")


if __name__ == "__main__":
    main()
