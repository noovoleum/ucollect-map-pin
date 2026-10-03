// @noovoleum/map-pin: the uCollect map pin artwork. Props in, SVG out (like an avatar component).
import { pinTree, toSvg } from './pin.js';

export { STATES, KINDS, FRAME_PATTERNS, BANNERS } from './pin.js';

/** SVG markup for one pin: MapLibre GL JS addImage via <img>, data URLs, server rendering. */
export const pinSvg = (props) => toSvg(pinTree(props));
