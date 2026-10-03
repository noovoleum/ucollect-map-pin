# Changelog

## Versioning policy

JS (`package.json`) and Dart (`flutter/pubspec.yaml`) share one version and one git tag (`vX.Y.Z`).

| change | bump |
|---|---|
| Add an enum value (state, kind, pattern, banner) | minor |
| Change pixels (any fixture diff, reviewed in the PR) | minor |
| Fix that does not change any fixture | patch |
| Remove or rename an enum value, prop, or export; change what `size` means | major |

Apps that cache rasterised pins must include the package version in their image key, so a pixel change never reuses a stale image.

## 1.0.0

Breaking: the package is now pure presentation. Props go in and artwork comes out. The app decides everything else.

- **Removed** (now the app's job): `resolvePin`, status fallbacks (unknown state now throws instead of drawing as available), `pinImageKey`, `pinZ`, `pinDataUrl`, `PinSpec`/`fromJson`/`pinSvgFromJson`, `VIEWBOX`, `DEFAULTS`, and the `frameWidth`/`bannerPosition`/`bannerScale`/`badgePosition`/`badgeRadius` options. Banner rules are also gone: SOON is no longer forced onto planned pins, and NEW/PROMO are no longer blocked on other states.
- **API:** `pinSvg({state, kind, frame?, banner?, size?})`; React `<MapPin … aria-label? />`; Dart `pinSvg(...)`, `MapPin(...)`, `pinPng(..., pixelRatio)`. All enums are typed, and banner values are lowercase.
- **Size:** `size` is the height of an unframed pin, from pole tip to head tip. The default is 34, which makes the head 1.15× the shipped `ucoflag.png`. The canvas is cropped to the artwork, and its bottom edge is the pole tip.
- **Artwork:**
  - The partner frame is 7u wide. Stripes are drawn as dashed bands, so the SVG has no `clipPath` and no ids.
  - Maintenance keeps the kind icon and shows an X badge.
  - The clock badge strokes are thicker (2.5u).
  - The closed fill is muted to `#E0B450` @ 0.50.
  - Banners are drawn as vector strokes with no font dependency. They sit low and leave the pole tip visible.
- **Safety:** only `#RRGGBB` colours are drawn. Enum lookups use own properties only. NaN size throws; other sizes are clamped to 8..512. Exported constants are frozen.
- **Flutter:** `pinPng` follows `size × pixelRatio` and disposes of the picture and image on every path.
- **Tests:** the committed fixtures are the oracle (`node verify.mjs`; `--update` to accept). There is a Dart byte-parity test, a PNG-dimension test, and CI.

## 0.1.0

Initial package.
