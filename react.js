// React component. Plain createElement, no JSX/build step; renders real elements (no innerHTML).
import { createElement } from 'react';
import { pinTree } from './pin.js';

const camel = (a) => a.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const toReact = ({ tag, attrs, kids }, top) => createElement(tag,
  { ...Object.fromEntries(Object.entries(attrs).map(([a, v]) => [camel(a), v])), ...top },
  ...kids.map((k) => toReact(k)));

/** <MapPin state="closed" kind="station" aria-label="Closed station" /> */
export function MapPin({ state, kind, frame, banner, size, className, 'aria-label': label }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
  return toReact(pinTree({ state, kind, frame, banner, size }), { className, ...a11y });
}
