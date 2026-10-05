# @noovoleum/map-pin · noovoleum_map_pin

The uCollect map pin as a pure presentation component, for JS/React and Flutter. It works like an avatar component: you pass props in and get pin artwork out. The package only draws. **The app and backend decide** which state a station is in, which banner it gets, its z-order, and how images are cached.

## Install (pin to a tag)

```bash
npm i github:noovoleum/ucollect-map-pin#v1.2.0
```

```yaml
dependencies:
  noovoleum_map_pin:
    git: { url: https://github.com/noovoleum/ucollect-map-pin.git, path: flutter, ref: v1.2.0 }
```

## Props

| prop | JS type | Dart type | required | meaning |
|---|---|---|---|---|
| `state` | `'available' \| 'closed' \| 'planned' \| 'maintenance'` | `PinState` | yes | Head fill and badge. Non-available states are muted. |
| `kind` | `'station' \| 'collection_point'` | `PinKind` (`station`, `collectionPoint`) | yes | Head icon: arrow or house. |
| `frame` | `{ pattern, colors }` | `PinFrame(pattern:, colors:)` | no | Partner frame, drawn outside the head, 7u wide. |
| `frame.pattern` | `'solid' \| 'stripes' \| 'rings'` | `FramePattern` | | |
| `frame.colors` | `string[]` | `List<String>` | | Only the first 3 entries are read. Each must be a `#RRGGBB` string; anything else is skipped, and with zero valid colours there is no frame. For 3 colours at small sizes (≤40), prefer `stripes`: 3 `rings` bands are about 1 px each. |
| `banner` | `'soon' \| 'new' \| 'promo'` | `PinBanner` (`soon`, `new_`, `promo`) | no | Pill drawn low on the pin. The pole tip stays visible. |
| `size` | `number` | `double` | no | Height in px/dp of an unframed pin, from pole tip to head tip. Default 34, which is 1.15× the shipped `ucoflag.png` head. Clamped to 8..512. |
| `aria-label` (React) / `semanticsLabel` (Flutter) | `string` | `String?` | no | Accessible name. If omitted, the pin is decorative (`aria-hidden` / excluded from semantics). |
| `pixelRatio` (`pinPng` only) | | `double` | no | Raster scale, (0, 8]. PNG size = logical size × ratio, rounded. |

Fixed by design (not props): fills, opacity, icons, badges, frame width, and banner geometry.
- `closed` shows a bare **Zz** (dark strokes, white halo, no disc) on the upper right.
- `maintenance` shows a white X in a red **disc** on the upper right, and keeps the kind icon. Different shapes, so closed and maintenance differ without relying on colour.
- The status badge deliberately sits on top of the partner frame at the upper right: status wins over branding.
- The canvas is cropped to the artwork. **Its bottom edge is the pole tip**, so anchor at `bottom`.

Errors: an unknown enum value or a NaN size throws `TypeError` (JS) or `ArgumentError` (Dart). Because the API is typed, this is a programming error.

## What the app decides

| concern | owner | notes |
|---|---|---|
| backend `status` → `state` | app | e.g. `active→available`, `offline→maintenance`. Choose what an unknown status shows; the package will not guess. |
| `kind` | app/backend | |
| which `banner` to show | app/backend | e.g. `soon` for planned, `new`/`promo` only for available. |
| partner `frame` | backend | Validate colours at write time too. |
| z-order / symbol sort key | app | e.g. available above closed above maintenance above planned. |
| image cache key | app | Include every prop, `size`, `pixelRatio` **and the package version**. |
| accessible label text | app | Localised. |

## MapLibre GL JS

```js
import { pinSvg } from '@noovoleum/map-pin';

// App-owned mapping: the package never sees backend strings.
const STATE = new Map([['active', 'available'], ['closed', 'closed'], ['planned', 'planned'], ['maintenance', 'maintenance'], ['offline', 'maintenance']]);
const Z = { available: 4, closed: 3, maintenance: 2, planned: 1 };
const VERSION = '1.2.0';

async function ensurePin(map, box) {
  const props = { state: STATE.get(box.status) ?? 'maintenance',   // own entries only; unknown => maintenance
                  kind: box.kind === 'collection_point' ? 'collection_point' : 'station',
                  frame: box.pin?.frame ?? null, banner: box.status === 'planned' ? 'soon' : null, size: 34 };
  const dpr = devicePixelRatio;                                    // read once: key, raster and addImage agree
  const key = `pin:${VERSION}:${dpr}:${JSON.stringify(props)}`;
  if (!map.hasImage(key)) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg({ ...props, size: props.size * dpr }));
    await img.decode();
    if (!map.hasImage(key)) map.addImage(key, img, { pixelRatio: dpr });
  }
  return { key, z: Z[props.state] };   // feature properties
}
// layer: 'icon-image': ['get', 'key'], 'icon-anchor': 'bottom', 'symbol-sort-key': ['-', 0, ['get', 'z']]
// A style change drops images: call ensurePin again after 'style.load'. size x dpr is capped at 512 by the package.
```

React (lists, legends, detail sheets):

```jsx
import { MapPin } from '@noovoleum/map-pin/react';
<MapPin state="closed" kind="collection_point" aria-label="Closed collection point" />
```

## Flutter (maplibre_gl)

```dart
import 'package:noovoleum_map_pin/flutter_map_pin.dart';

// App-owned mapping.
PinState stateOf(String status) => switch (status) {
      'active' => PinState.available,
      'closed' => PinState.closed,
      'planned' => PinState.planned,
      _ => PinState.maintenance,
    };
const zOf = {PinState.available: 4, PinState.closed: 3, PinState.maintenance: 2, PinState.planned: 1};

// One in-flight/finished install per key. Clear it when the map style changes (images are dropped).
final installs = <String, Future<void>>{};

Future<void> addBox(MapLibreMapController c, Box box, double dpr) async {
  final state = stateOf(box.status);
  final kind = box.kind == 'collection_point' ? PinKind.collectionPoint : PinKind.station;
  final banner = state == PinState.planned ? PinBanner.soon : null;
  final key = 'pin:1.2.0:$state:$kind:$banner:${box.frameKey}:34:$dpr';
  final install = installs[key] ??= () async {
    await c.addImage(key, await pinPng(state: state, kind: kind, banner: banner, frame: box.frame, size: 34, pixelRatio: dpr));
  }();
  try {
    await install;                       // every caller waits for the same addImage
  } catch (_) {
    if (identical(installs[key], install)) installs.remove(key);  // failed: allow a retry
    rethrow;
  }
  await c.addSymbol(SymbolOptions(geometry: box.latLng, iconImage: key, iconAnchor: 'bottom', zIndex: zOf[state]));
}
```

maplibre_gl decodes PNGs differently on Android and iOS: Android uses bitmap density and iOS uses `UIScreen.scale`. Check the on-map size once on each platform before you pick `pixelRatio`.

Widget: `MapPin(state: PinState.closed, kind: PinKind.station, semanticsLabel: 'Closed station')`. `lib/map_pin.dart` (`pinSvg`) is pure Dart, with no Flutter import.

## Development

- `node verify.mjs` checks the safety rules and compares every output byte-for-byte with the committed `fixtures/`. It fails on any difference.
- `node verify.mjs --update` rewrites the fixtures. Review the diff: changed pixels require a minor release (see CHANGELOG).
- `cd flutter && flutter test` checks that Dart reproduces the same fixtures byte-for-byte and that PNG sizes are correct.
- `dev/glyphs.mjs` regenerates the banner label paths. `dev/typecheck.mjs` compiles a TS consumer against the installed React types.
- CI (`.github/workflows/ci.yml`) runs all of the above.

## Example

`examples/index.html` is a single page with no build step: an inline SVG grid, partner frames, a playground, and a MapLibre GL JS map. Run `python3 -m http.server 8000` in the repo root and open http://localhost:8000/examples/.

Docs: https://docs.noovoleum.site/doc/map-pin-component-vXoCndEGMx (source: `docs/outline-map-pin.md`, images: `node docs/gen-images.mjs`).
