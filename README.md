# @noovoleum/map-pin · noovoleum_map_pin

The uCollect station map pin as one shared package for JS/React and Flutter. It draws our flag pin (traced from `ucoflag.png`) in one of 4 states, with an optional partner frame and a banner.

- **Fill and icon belong to uCollect.** A partner can only set `frame`.
- **Unknown values fall back.** An unrecognised `state` or `kind` draws as an available station, so a pin never disappears.

## Install

```bash
# JS / React
npm i github:noovoleum/ucollect-map-pin
```

```yaml
# Flutter — pubspec.yaml
dependencies:
  noovoleum_map_pin:
    git: { url: https://github.com/noovoleum/ucollect-map-pin.git, path: flutter }
```

## Spec (mirrors the backend `pin` payload)

```json
{ "state": "available|closed|planned|maintenance",
  "kind":  "station|collection_point",
  "frame": { "pattern": "solid|stripes|rings", "colors": ["#E31E24", "#FFD200"] },
  "banner": "NEW|PROMO" }
```

All fields are optional.
- A frame draws at most 3 colours.
- `NEW` and `PROMO` show only on available pins.
- Planned pins always show `SOON`.

## JS

```js
import { pinSvg, pinImageKey, pinZ } from '@noovoleum/map-pin';
import { MapPin, pinDataUrl } from '@noovoleum/map-pin/react';

<MapPin state="closed" frame={{ pattern: 'rings', colors: ['#E31E24', '#FFFFFF', '#005DAA'] }} size={40} />

// MapLibre GL JS: register each distinct look once
const key = pinImageKey(spec);
if (!map.hasImage(key)) {
  const img = new Image(); img.src = pinDataUrl(spec, { size: 40 * devicePixelRatio });
  await img.decode(); map.addImage(key, img, { pixelRatio: devicePixelRatio });
}
// layer: 'icon-image': ['get', 'pinKey'], 'icon-anchor': 'bottom', 'symbol-sort-key': ['get', 'pinZ']
```

## Flutter

```dart
import 'package:noovoleum_map_pin/flutter_map_pin.dart';

MapPin(spec: PinSpec(state: 'closed', frame: PinFrame('stripes', ['#E31E24', '#FFD200'])));

// maplibre_gl: one addImage per distinct look
final key = pinImageKey(spec);
await controller.addImage(key, await pinPng(spec, pixelRatio: MediaQuery.devicePixelRatioOf(context)));
controller.addSymbol(SymbolOptions(geometry: latLng, iconImage: key, iconAnchor: 'bottom', zIndex: pinZ(spec)));
```

`lib/map_pin.dart` is pure Dart, with no Flutter import, so a Dart backend can use it too.

## Options (approved defaults)

| option | default | tested |
|---|---|---|
| `size` | 40 | on-screen px of an unframed pin canvas |
| `frameWidth` | 5 | 3–7 |
| `bannerPosition` / `bannerScale` | `low` / 1.5 | mid, low × 1.0–1.5 |
| `badgePosition` / `badgeRadius` | `top-left` / 10 | top-left, top-right × 8–12 |

## Keeping JS and Dart identical

`node verify.mjs` does two things:
1. Checks the rules.
2. Writes `fixtures/` (39 cases).

`cd flutter && flutter test` then checks that Dart produces **exactly the same bytes** as each fixture, plus the image key and z-order. To change the design:
1. Edit `index.js`.
2. Run verify.
3. Port the change to `flutter/lib/map_pin.dart` until the Flutter tests pass again.
