> **Map pin component.** `@noovoleum/map-pin` (JS/React) and `noovoleum_map_pin` (Flutter) draw the uCollect station pin from props. Like an avatar component, the package only draws. The **app and backend decide** which state, banner and frame each station gets. Source: [noovoleum/ucollect-map-pin](https://github.com/noovoleum/ucollect-map-pin) `v1.2.1`; the code wins when it differs from this page.

**In short**

* One pin shape everywhere: the shipped uCollect flag pin (point-up head, circular-arrow logo, dark pole), drawn as vector SVG.
* 4 states (available, closed, planned, maintenance) × 2 kinds (station, collection point), plus optional partner frame and banner.
* Non-available states are deliberately muted, so available stations stand out.
* Partners own only the frame (pattern + up to 3 colours). uCollect owns the fill, icon, badges and banners.
* The package contains no business logic. Status mapping, banner rules, stacking order and image caching are the app's job.

## Install

Pin to a tag.

```bash
npm i github:noovoleum/ucollect-map-pin#v1.2.1
```

```yaml
# pubspec.yaml
dependencies:
  noovoleum_map_pin:
    git: { url: https://github.com/noovoleum/ucollect-map-pin.git, path: flutter, ref: v1.2.1 }
```

## States and kinds

![States × kinds: available, closed, planned, maintenance for station and collection point](STATES_IMG)

| state | look | meaning for the user |
|---|---|---|
| `available` | full colour, logo green `#0B5A15` (both kinds) | works, deposit now |
| `closed` | muted yellow, bare **Zz** at upper right | outside opening hours |
| `planned` | muted grey | not built yet |
| `maintenance` | muted red, white X in a red disc at upper right; the station/house icon stays | doesn't work right now |

The 4 states match **App Availability** in [Box Command/Status Separation](https://docs.noovoleum.site/doc/box-commandstatus-separation-puhou7YiSw). `kind` changes only the icon: circular arrow for `station`, house for `collection_point`. Both use the same green, so the icon is the only difference.

## Banners

![Banners none, soon, new, promo across all four states](BANNERS_IMG)

`banner` is a plain prop: `soon`, `new` or `promo`. The package draws whatever it is given. The app decides when to show which, for example `soon` on planned stations and `new`/`promo` only on available ones. The pill sits low on the pin and always leaves the pole tip visible. Labels are vector paths, so they render the same on every platform.

## Partner frames

![Frame patterns solid, stripes, rings with 1, 2 and 3 colours](PATTERNS_IMG)

A partner frame is drawn **outside** a full-size pin (7u wide), with the pole in front of it. `frame = { pattern, colors }`:

* `pattern`: `solid`, `stripes` or `rings`.
* `colors`: only the first 3 entries are read. Each must be a `#RRGGBB` string; anything else is skipped. With zero valid colours, no frame is drawn.
* For 3 colours at map size (≤ 40), prefer `stripes`: 3 `rings` bands are about 1 px each.

![Partner frames (Alfamart, Pertamina, Indomaret, solid) across all four states](PARTNERS_IMG)

The frame fades with the pin on non-available states. The status badge deliberately sits on top of the frame at the upper right: status wins over branding.

## Sizes

![Sizes 24, 34, 48, 64 and 96, unframed and framed](SIZES_IMG)

`size` is the height of an unframed pin, pole tip to head tip, in px (JS) or dp (Flutter). Default **34**, which is 1.15× the shipped `ucoflag.png` head. Clamped to 8–512. A frame adds height and width around the head. The canvas is cropped to the artwork and **its bottom edge is the pole tip**, so always anchor at `bottom`.

## Props

| prop | JS type | Dart type | required | notes |
|---|---|---|---|---|
| `state` | `'available' \| 'closed' \| 'planned' \| 'maintenance'` | `PinState` | yes | fill, opacity, badge |
| `kind` | `'station' \| 'collection_point'` | `PinKind` (`station`, `collectionPoint`) | yes | icon |
| `frame` | `{ pattern, colors }` | `PinFrame(pattern:, colors:)` | no | partner frame |
| `banner` | `'soon' \| 'new' \| 'promo'` | `PinBanner` (`soon`, `new_`, `promo`) | no | pill label |
| `size` | `number` | `double` | no | default 34, clamped 8–512 |
| `aria-label` / `semanticsLabel` | `string` | `String?` | no | accessible name; omitted → decorative |
| `pixelRatio` (`pinPng` only) | | `double` | no | raster scale (0, 8] |

Fixed by design (not props): fills, opacity, icons, badges, frame width and banner geometry.

Errors: an unknown enum value or a NaN size throws `TypeError` (JS) or `ArgumentError` (Dart). The API is typed, so this is a programming error, not bad data.

## API

| platform | function | returns |
|---|---|---|
| JS | `pinSvg(props)` | SVG string, for inline HTML or MapLibre GL JS `addImage` |
| React | `<MapPin {...props} aria-label="…" />` | React element tree (no `dangerouslySetInnerHTML`) |
| Dart | `pinSvg(...)` | SVG string, pure Dart (no Flutter import) |
| Flutter | `MapPin(...)` | widget |
| Flutter | `pinPng(..., pixelRatio:)` | `Uint8List` PNG for maplibre_gl `addImage`; size = logical size × ratio |

Also exported (JS): frozen lists `STATES`, `KINDS`, `FRAME_PATTERNS`, `BANNERS`, and `STATE_COLORS` (`{ fill, opacity }` per state). Dart exports the same colours as `pinStateColors`.

## What the app decides

| concern | owner | recommendation |
|---|---|---|
| backend `status` → `state` | app | `active` → available, `closed` → closed, `planned` → planned, **anything else → maintenance** (users only care whether it works) |
| `kind` | backend (`pin.kind`) | default `station` |
| which `banner` | app/backend | `soon` for planned; `new`/`promo` only for available |
| partner `frame` | backend | validate `#RRGGBB` when the skin is saved, too |
| stacking order | app | available › closed › maintenance › planned |
| image cache key | app | every prop + `size` + pixel ratio + package version |
| accessible label | app | localised text, e.g. "Closed collection point" |
| old app versions | backend | don't send collection points to app versions that can't draw them |

## Examples

### Inline SVG

```js
import { pinSvg } from '@noovoleum/map-pin';

el.innerHTML = pinSvg({ state: 'available', kind: 'station', size: 48 });
el.innerHTML = pinSvg({ state: 'closed', kind: 'collection_point', size: 48 });
el.innerHTML = pinSvg({ state: 'planned', kind: 'station', banner: 'soon', size: 48 });
el.innerHTML = pinSvg({ state: 'available', kind: 'station', size: 48,
                        frame: { pattern: 'stripes', colors: ['#E31E24', '#FFD200'] } });
```

### React

```jsx
import { MapPin } from '@noovoleum/map-pin/react';

<MapPin state="available" kind="station" size={40} aria-label="Available station" />
<MapPin state="maintenance" kind="collection_point" />            {/* decorative: aria-hidden */}
<MapPin state="available" kind="station" banner="promo"
        frame={{ pattern: 'rings', colors: ['#E31E24', '#005DAA'] }} />
```

### MapLibre GL JS

```js
import { pinSvg } from '@noovoleum/map-pin';

// App-owned mapping: the package never sees backend strings.
const STATE = new Map([['active', 'available'], ['closed', 'closed'], ['planned', 'planned']]);
const Z = { available: 4, closed: 3, maintenance: 2, planned: 1 };
const VERSION = '1.2.1';

async function ensurePin(map, box) {
  const state = STATE.get(box.status) ?? 'maintenance';          // unknown → maintenance
  const props = {
    state,
    kind: box.pin?.kind === 'collection_point' ? 'collection_point' : 'station',
    frame: box.pin?.frame ?? null,
    banner: state === 'planned' ? 'soon' : state === 'available' ? box.pin?.banner ?? null : null,
    size: 34,
  };
  const dpr = devicePixelRatio;                                    // read once
  const key = `pin:${VERSION}:${dpr}:${JSON.stringify(props)}`;
  if (!map.hasImage(key)) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg({ ...props, size: props.size * dpr }));
    await img.decode();
    if (!map.hasImage(key)) map.addImage(key, img, { pixelRatio: dpr });
  }
  return { key, z: Z[state] };                                     // feature properties
}
// layer: 'icon-image': ['get', 'key'], 'icon-anchor': 'bottom', 'symbol-sort-key': ['-', 0, ['get', 'z']]
// A style change drops images: call ensurePin again after 'style.load'.
```

### Flutter (maplibre_gl)

```dart
import 'package:noovoleum_map_pin/flutter_map_pin.dart';

PinState stateOf(String status) => switch (status) {
      'active' => PinState.available,
      'closed' => PinState.closed,
      'planned' => PinState.planned,
      _ => PinState.maintenance,                       // unknown → maintenance
    };
const zOf = {PinState.available: 4, PinState.closed: 3, PinState.maintenance: 2, PinState.planned: 1};

// One in-flight/finished install per key. Clear it when the map style changes.
final installs = <String, Future<void>>{};

Future<void> addBox(MapLibreMapController c, Box box, double dpr) async {
  final state = stateOf(box.status);
  final kind = box.kind == 'collection_point' ? PinKind.collectionPoint : PinKind.station;
  final banner = state == PinState.planned ? PinBanner.soon : null;
  final key = 'pin:1.2.1:$state:$kind:$banner:${box.frameKey}:34:$dpr';
  final install = installs[key] ??= () async {
    await c.addImage(key, await pinPng(state: state, kind: kind, banner: banner,
        frame: box.frame, size: 34, pixelRatio: dpr));
  }();
  try {
    await install;
  } catch (_) {
    if (identical(installs[key], install)) installs.remove(key);   // allow a retry
    rethrow;
  }
  await c.addSymbol(SymbolOptions(geometry: box.latLng, iconImage: key,
      iconAnchor: 'bottom', zIndex: zOf[state]));
}

// Lists, legends, detail sheets:
MapPin(state: PinState.closed, kind: PinKind.station, semanticsLabel: 'Closed station');
```

maplibre_gl decodes PNGs differently on Android (bitmap density) and iOS (`UIScreen.scale`). Check the on-map size once on each platform before picking `pixelRatio`.

### Single-page demo

[`examples/index.html`](https://github.com/noovoleum/ucollect-map-pin/blob/main/examples/index.html) in the repo is one HTML file with no build step: the state grid, partner frames, a live playground, and a MapLibre GL JS map of Kuningan with 6 sample stations. Run `python3 -m http.server 8000` in the repo root and open `http://localhost:8000/examples/`.

## Design decisions

| decision | why |
|---|---|
| Keep the shipped flag pin shape | brand continuity; traced from `ucoflag.png` |
| Non-available states muted, not high-contrast | available stations must be the most eye-catching; accepted trade-off: muted pins fall below the 3:1 contrast guideline |
| Maintenance keeps the kind icon, X as a badge | a collection point under repair still reads as a collection point |
| Closed = bare Zz, maintenance = X in a disc, both upper right | the two unavailable states differ by shape, not only colour, and stay readable at 40 px |
| Partners control only the frame | uCollect owns fill, icon and state treatment |
| No clustering or stacking | one pin per station; users zoom in |
| Package has no logic | like an avatar component: the same props always give the same pixels |

## Versioning

| change | version bump |
|---|---|
| adding, removing or renaming a state/kind/pattern/banner value | major (breaks exhaustive `switch` in Dart/TS) |
| removing or renaming a prop, changing `size` meaning | major |
| changed pixels | minor, with the fixture diff in the PR |
| fixes with identical output | patch |

JS and Dart versions move together. Committed fixtures are the oracle: `node verify.mjs` fails on any byte difference, and the Flutter tests check Dart produces the same bytes. CI runs both on every push.

## Sources

| item | link |
|---|---|
| Repository | [noovoleum/ucollect-map-pin](https://github.com/noovoleum/ucollect-map-pin) |
| Release | [v1.2.1](https://github.com/noovoleum/ucollect-map-pin/tree/v1.2.1) |
| Artwork | [pin.js](https://github.com/noovoleum/ucollect-map-pin/blob/v1.2.1/pin.js) |
| Dart port | [flutter/lib/src/pin.dart](https://github.com/noovoleum/ucollect-map-pin/blob/v1.2.1/flutter/lib/src/pin.dart) |
| Changelog | [CHANGELOG.md](https://github.com/noovoleum/ucollect-map-pin/blob/v1.2.1/CHANGELOG.md) |
| App states | [Box Command/Status Separation](https://docs.noovoleum.site/doc/box-commandstatus-separation-puhou7YiSw) |
