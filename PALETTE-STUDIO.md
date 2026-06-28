# Palette Studio — design doc

A browser tool: upload a photo → extract its palette → match each color to a real
Blick paint → show a **buy-list** + a **mixing kit**. 100% client-side (works on
GitHub Pages; the photo never leaves the device). Doubles as a Blick affiliate funnel.

## Status
Building & testing **locally**. Do not deploy until verified.

## Pipeline
1. **Upload** (file picker + drag/drop) → draw to canvas, downscale to ~160px long edge.
2. **Extract palette** → k-means (k = user-chosen 4–12, default 6) in CIELAB space →
   cluster centroids + weight (% of image). Lab clustering = perceptual grouping.
3. **Match** → each centroid → nearest Blick paint by **ΔE (CIEDE2000)**.
   Closeness label: ΔE<5 Excellent · <10 Close · <22 Good · else Approximate.
4. **Output**
   - **Matched buy-list:** one card per palette color (paint swatch, name, ΔE label, Blick link).
   - **Mixing kit:** a compact split-primary kit (real W&N tubes) lightly tailored to the
     photo (adds earths if browns present, a neutral if deep darks present, white optional).

## Data
- `data/paints/watercolor.json` — 101 **Winsor & Newton Professional Watercolour** colors
  scraped from Blick product data: `{name, hex, family, id}`. Schema is medium-agnostic;
  add `data/paints/oil.json` / `acrylic.json` later and a medium toggle.
- Hex = Blick digital swatches → approximate; tool says "closest match, screen colors vary".
- Buy links currently point to the W&N line page; swap to **CJ/Blick affiliate deep links**
  per color once the affiliate account is approved.

## Mixing-kit base (split primaries, all real W&N names in the dataset)
warm/cool of each primary + conditional earths/neutral + optional white:
- Warm yellow **New Gamboge** · Cool yellow **Winsor Lemon**
- Warm red **Scarlet Lake** · Cool red **Permanent Rose**
- Warm blue **French Ultramarine** · Cool blue **Winsor Blue (Green Shade)**
- +earths **Burnt Sienna**, **Yellow Ochre Light** (if palette has browns/ochres)
- +neutral **Paynes Grey** (if palette has deep darks)
- +**Chinese White** (optional — or use the paper)

## Files
- `palette.html` — Palette Studio page (reuses brand system, header/footer/nav)
- `palette.js` — all logic (color math, k-means, match, mixing kit, render)
- `data/paints/watercolor.json` — paint dataset

## To wire on launch
- Link "Palette Studio" from the Learn page + nav.
- Replace buy links with affiliate deep links.
- Add affiliate disclosure.
