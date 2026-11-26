#!/usr/bin/env python3
"""Rebuild src/data/sicilia.json, the geometry behind the map on the Chi siamo page.

Boundaries: ISTAT, redistributed under CC BY by https://github.com/guglielmo/geojson-italy
Usage: python3 scripts/build-sicily-map.py path/to/limits_IT_provinces.geojson
"""
import json
import math
import pathlib
import sys

WIDTH = 1000
PADDING = 24
TOLERANCE = 0.5  # simplification, in viewBox units
SEAT = (37.6267, 14.4240)  # Assoro, latitude and longitude
CAPITALS = {
    'PA': ('Palermo', 38.1157, 13.3615),
    'CT': ('Catania', 37.5027, 15.0873),
    'ME': ('Messina', 38.1938, 15.5540),
    'AG': ('Agrigento', 37.3111, 13.5766),
    'CL': ('Caltanissetta', 37.4901, 14.0629),
    'EN': ('Enna', 37.5670, 14.2750),
    'RG': ('Ragusa', 36.9269, 14.7255),
    'SR': ('Siracusa', 37.0690, 15.2860),
    'TP': ('Trapani', 38.0176, 12.5365),
}


def polygons(geometry):
    coords = geometry['coordinates']
    return coords if geometry['type'] == 'MultiPolygon' else [coords]


def in_frame(ring):
    """Leave out Pantelleria and the Pelagie islands, far outside the frame."""
    return min(lat for _, lat in ring) > 36.6 and max(lon for lon, _ in ring) > 12.2


def simplify(points):
    """Douglas-Peucker, without recursion."""
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        (ax, ay), (bx, by) = points[first], points[last]
        length = math.hypot(bx - ax, by - ay)
        worst, index = 0.0, None
        for i in range(first + 1, last):
            px, py = points[i]
            if length:
                distance = abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / length
            else:
                distance = math.hypot(px - ax, py - ay)
            if distance > worst:
                worst, index = distance, i
        if worst > TOLERANCE:
            keep.add(index)
            stack += [(first, index), (index, last)]
    return [points[i] for i in sorted(keep)]


def kilometres(a, b):
    """Great-circle distance between two (latitude, longitude) points."""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def main(source):
    features = [f for f in json.loads(pathlib.Path(source).read_text())['features']
                if f['properties']['reg_istat_code'] == '19']
    assert len(features) == 9, f'expected 9 Sicilian provinces, found {len(features)}'
    rings = {f['properties']['prov_acr']: [p[0] for p in polygons(f['geometry']) if in_frame(p[0])] for f in features}

    squeeze = math.cos(math.radians(37.6))
    every = [(lon * squeeze, lat) for group in rings.values() for ring in group for lon, lat in ring]
    left, right = min(x for x, _ in every), max(x for x, _ in every)
    bottom, top = min(y for _, y in every), max(y for _, y in every)
    scale = (WIDTH - 2 * PADDING) / (right - left)
    height = round((top - bottom) * scale + 2 * PADDING)

    def project(lat, lon):
        return (round((lon * squeeze - left) * scale + PADDING, 1), round((top - lat) * scale + PADDING, 1))

    provinces = []
    for code, group in rings.items():
        parts = []
        for ring in group:
            points = simplify([project(lat, lon) for lon, lat in ring])
            if len(points) > 3:
                parts.append('M' + 'L'.join(f'{x:g} {y:g}' for x, y in points[:-1]) + 'Z')
        provinces.append({'code': code, 'd': ''.join(parts)})

    seat_x, seat_y = project(*SEAT)
    cities = []
    for code, (name, lat, lon) in CAPITALS.items():
        x, y = project(lat, lon)
        cities.append({'code': code, 'name': name, 'x': x, 'y': y, 'km': round(kilometres(SEAT, (lat, lon)))})

    out = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data' / 'sicilia.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({
        'width': WIDTH, 'height': height, 'seat': {'x': seat_x, 'y': seat_y},
        'provinces': provinces, 'cities': sorted(cities, key=lambda c: c['km']),
    }, separators=(',', ':')) + '\n')
    print(f'{out}: {out.stat().st_size} bytes, height {height}')


if __name__ == '__main__':
    main(sys.argv[1])
