"""Read-only measurements of title ink in the approved and captured images.

The crop is a measurement region, never an output asset. These bounding boxes
measure title placement/size only; they are not a pixel similarity score.
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / "output" / "fidelity"
CASES = [
    ("01-horari", "pantalles-v1/01-horari.png"),
    ("02-apunts", "pantalles-v2/apunts-formats.png"),
    ("03-plusos", "pantalles-v2/plusos-cards.png"),
    ("04-notes", "pantalles-v2/notes-excel.png"),
    ("05-estudi", "pantalles-v1/05-estudi.png"),
    ("06-comunitat", "pantalles-v2/comunitat-propostes-sidebar.png"),
    ("07-pastisseria", "pantalles-v1/07-pastisseria.png"),
]


def title_ink(path, region):
    with Image.open(path) as source:
        pixels = source.convert("RGB")
        points = [
            (x, y)
            for y in range(region[1], region[3])
            for x in range(region[0], region[2])
            if max(pixels.getpixel((x, y))) < 100
        ]
        if not points:
            raise ValueError(f"No dark title pixels found: {path}")
        left = min(p[0] for p in points)
        top = min(p[1] for p in points)
        right = max(p[0] for p in points)
        bottom = max(p[1] for p in points)
        return {
            "image_size": list(source.size),
            "format": source.format,
            "box": [left, top, right, bottom],
            "width": right - left + 1,
            "height": bottom - top + 1,
        }


results = []
for screen, reference in CASES:
    region = (255, 126, 625, 178) if screen == "04-notes" else (255, 126, 850, 189)
    measurements = {
        "screen": screen,
        "region": list(region),
        "reference": title_ink(ROOT / "design" / reference, region),
        "before": title_ink(CAPTURES / "abans-detall" / f"{screen}-desktop.jpg", region),
        "after": title_ink(CAPTURES / f"{screen}-desktop.jpg", region),
    }
    results.append(measurements)

report = {
    "method": "Dark title ink: RGB channels below 100 within a fixed region; no image resizing.",
    "limit": "Measures title placement and size only, not full-screen similarity or exact typography.",
    "screens": results,
}
(CAPTURES / "mesures-titols.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
for item in results:
    print(item["screen"], *[
        f"{key}={item[key]['box']} {item[key]['width']}x{item[key]['height']}"
        for key in ("reference", "before", "after")
    ])
