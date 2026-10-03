// React wrapper. Plain createElement → no JSX/build step needed.
import { createElement, useMemo } from 'react';
import { pinSvg } from './index.js';

/** <MapPin state="closed" frame={{pattern:'stripes', colors:['#E31E24','#FFD200']}} size={40} /> */
export function MapPin({ state, kind, frame, banner, size = 40, options, ...rest }) {
  const html = useMemo(() => pinSvg({ state, kind, frame, banner }, { ...options, size }),
    [state, kind, JSON.stringify(frame), banner, size, JSON.stringify(options)]);
  return createElement('span', { ...rest, style: { display: 'inline-block', lineHeight: 0, ...rest.style },
    dangerouslySetInnerHTML: { __html: html } });
}

/** data: URL for <img src>, Leaflet/MapLibre/Google marker icons. */
export const pinDataUrl = (spec, options) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg(spec, options));
