// Internal drawing core (not a package entry point). Props in, element tree out.
// No business rules here: the app decides state, banner, frame, z-order and image caching.
// flutter/lib/map_pin.dart is a byte-identical port, enforced by fixtures/.

export const STATES = Object.freeze(['available', 'closed', 'planned', 'maintenance']);
export const KINDS = Object.freeze(['station', 'collection_point']);
export const FRAME_PATTERNS = Object.freeze(['solid', 'stripes', 'rings']);
export const BANNERS = Object.freeze(['soon', 'new', 'promo']);

// Artwork constants, in pin units. Head + pole traced from the shipped ucoflag.png.
const CX = 40, CY = 46, R = 28, TIP = 2, POLE_TIP = 90.5; // unframed height 88.5u == `size`
export const FRAME_W = 7;                                  // partner frame band
const SEP = 1.4;                                           // white gap head -> frame
const LOGO_ARC = 'M43.051,61.624 A16.88,16.88 0 1 1 56.631,48.510 L50.195,47.141 A10.3,10.3 0 1 0 41.909,55.144 Z';
const LOGO_HEAD = 'M41.000,48.000 L53.500,57.500 L41.000,67.500 Z';
const HOUSE = 'M12 2.2 1.2 11.6h3.1V22h5.6v-6.4h4.2V22h5.6V11.6h3.1z';
// Status badges sit on the upper-right shoulder (clear of the logo arrowhead at lower right).
const BX = 63.5, BY = 24.8;                                 // closed Zz anchor
const XR = 16, XX = 67, XY = 21.5;                          // maintenance: X in a disc, pushed out along the rim to clear the logo
const ZK = 1.8;                                             // closed: bare Zz (no disc), scale
const ZZ = [[-2.5, -6.5, 8, 2.6], [7, -14.5, 5, 2.1]];      // [x, y, size, stroke] per Z, badge units
const BANNER_Y = 62, BANNER_H = 19;
//                 head fill   group opacity  badge
const STATE = { available: [null, '1.00', null], closed: ['#E0B450', '0.50', 'zz'],
                planned: ['#8A949C', '0.50', null], maintenance: ['#D93C4E', '0.60', 'x'] };
const BRAND = '#0B5A15';                                   // logo green (images/new_logo.png), both kinds
const KIND = { station: [BRAND, 'uco'], collection_point: [BRAND, 'house'] };
const PATTERN = { solid: 1, stripes: 1, rings: 1 };
// Labels as stroked vector paths (dev/glyphs.mjs): fill, outline x/w, pill x/w, label path.
const BANNER = {
  soon: ['#3A444C', '15.140', '49.720', '16.640', '46.720', 'M28.360,67.660 C27.400,65.020 22.240,65.020 22.240,68.620 C22.240,71.980 28.360,70.780 28.360,74.380 C28.360,78.220 22.840,78.220 22.000,75.340 M35.080,65.500 C30.280,65.500 30.280,77.500 35.080,77.500 C39.880,77.500 39.880,65.500 35.080,65.500 Z M44.920,65.500 C40.120,65.500 40.120,77.500 44.920,77.500 C49.720,77.500 49.720,65.500 44.920,65.500 Z M51.160,77.500 L51.160,65.500 L58.360,77.500 L58.360,65.500'],
  new: ['#2979C7', '19.100', '41.800', '20.600', '38.800', 'M25.600,77.500 L25.600,65.500 L32.800,77.500 L32.800,65.500 M41.680,65.500 L35.440,65.500 L35.440,77.500 L41.680,77.500 M35.440,71.500 L40.720,71.500 M44.320,65.500 L46.840,77.500 L49.360,68.620 L51.880,77.500 L54.400,65.500'],
  promo: ['#E0457B', '9.860', '60.280', '11.360', '57.280', 'M16.360,77.500 L16.360,65.500 L19.960,65.500 C23.920,65.500 23.920,72.220 19.960,72.220 L16.360,72.220 M25.720,77.500 L25.720,65.500 L29.320,65.500 C33.280,65.500 33.280,72.220 29.320,72.220 L25.720,72.220 M29.320,72.220 L32.680,77.500 M38.680,65.500 C33.880,65.500 33.880,77.500 38.680,77.500 C43.480,77.500 43.480,65.500 38.680,65.500 Z M44.920,77.500 L44.920,65.500 L49.360,73.180 L53.800,65.500 L53.800,77.500 M60.040,65.500 C55.240,65.500 55.240,77.500 60.040,77.500 C64.840,77.500 64.840,65.500 60.040,65.500 Z'],
};
const HEX = /^#[0-9a-f]{6}$/i;

const f = (n, d = 3) => n.toFixed(d);
const pick = (table, key, what) => {
  if (typeof key === 'string' && Object.hasOwn(table, key)) return table[key];
  throw new TypeError(`map-pin: unknown ${what}: ${String(key)}`);
};
const el = (tag, attrs, ...kids) => ({ tag, attrs, kids });

/** Head silhouette offset outward by `g` (uniform on every side, tip included). */
function head(g) {
  const d0 = CY - TIP, rr = R + g, d = d0 + g * d0 / R, phi = Math.acos(rr / d);
  const sx = rr * Math.sin(phi), y = CY - rr * Math.cos(phi);
  return { top: CY - d, len: 2 * Math.sqrt(d * d - rr * rr) + rr * (2 * Math.PI - 2 * phi),
           d: `M${f(CX)},${f(CY - d)} L${f(CX + sx)},${f(y)} A${f(rr)},${f(rr)} 0 1 1 ${f(CX - sx)},${f(y)} Z` };
}

function frameEls(frame, fw) {
  if (frame == null) return [];
  if (typeof frame !== 'object') throw new TypeError('map-pin: frame must be {pattern, colors[]}');
  // Read each caller field once and never call methods on caller objects (they may be overridden).
  const pattern = frame.pattern, colors = frame.colors;
  if (!Array.isArray(colors)) throw new TypeError('map-pin: frame must be {pattern, colors[]}');
  pick(PATTERN, pattern, 'frame pattern');
  // Inspect the first 3 entries; only #RRGGBB primitive strings reach the SVG, anything else is skipped.
  const cols = [], len = Math.min(colors.length, 3);
  for (let i = 0; i < len; i++) { const c = colors[i]; if (typeof c === 'string' && HEX.test(c)) cols[cols.length] = c; }
  const n = cols.length;
  if (!n) return [];
  const out = [el('path', { d: head(SEP + fw + 1).d, fill: '#1f2328', 'fill-opacity': '0.35' })];
  if (pattern === 'stripes') {
    // One dashed band per colour, back to front: no clipPath, so no ids to collide.
    const mid = head(SEP + fw / 2), m = n * Math.max(1, Math.round(mid.len / (n * 6))), w = mid.len / m;
    for (let j = n - 1; j >= 0; j--) {
      const a = { d: mid.d, fill: 'none', stroke: cols[j], 'stroke-width': f(fw, 1) };
      if (j < n - 1) a['stroke-dasharray'] = `${f((j + 1) * w)} ${f((n - 1 - j) * w)}`;
      out.push(el('path', a));
    }
  } else {
    const rings = pattern === 'rings' ? n : 1;
    for (let k = 0; k < rings; k++) out.push(el('path', { d: head(SEP + fw * (rings - k) / rings).d, fill: cols[k] }));
  }
  out.push(el('path', { d: head(SEP).d, fill: '#fff' }));
  return out;
}

const iconEls = (icon) => icon === 'uco'
  ? [el('path', { d: LOGO_ARC, fill: '#fff' }),
     el('path', { d: LOGO_HEAD, fill: '#fff', stroke: '#fff', 'stroke-width': '1.2', 'stroke-linejoin': 'round' })]
  : [el('g', { transform: 'translate(40.120 46.000) scale(1.55) translate(-12 -12.5)' },
       el('path', { d: HOUSE, fill: '#fff', stroke: '#fff', 'stroke-width': '0.8', 'stroke-linejoin': 'round' }))];

function badgeEls(badge) {
  if (!badge) return [];
  const line = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (badge === 'zz') {
    const d = ([x, y, sz]) => `M${f(BX + x * ZK)} ${f(BY + y * ZK)}h${f(sz * ZK)}l${f(-sz * ZK)} ${f(sz * ZK)}h${f(sz * ZK)}`;
    return [...ZZ.map((z) => el('path', { d: d(z), ...line, stroke: '#fff', 'stroke-width': f((z[3] + 3) * ZK) })),
            ...ZZ.map((z) => el('path', { d: d(z), ...line, stroke: '#3A2E00', 'stroke-width': f(z[3] * ZK) }))];
  }
  const q = 4.2 * XR / 10;
  return [el('circle', { cx: f(XX), cy: f(XY), r: f(XR + 2), fill: '#fff' }), el('circle', { cx: f(XX), cy: f(XY), r: f(XR), fill: '#7A1420' }),
    el('path', { d: `M${f(XX - q)} ${f(XY - q)}L${f(XX + q)} ${f(XY + q)}M${f(XX + q)} ${f(XY - q)}L${f(XX - q)} ${f(XY + q)}`, ...line, stroke: '#fff', 'stroke-width': f(3 * XR / 10) })];
}

function bannerEls(b) {
  if (!b) return [];
  const [fill, ox, ow, ix, iw, d] = b;
  return [el('rect', { x: ox, y: f(BANNER_Y - 1.5), width: ow, height: f(BANNER_H + 3), rx: f(BANNER_H / 2 + 1.5), fill: '#fff' }),
    el('rect', { x: ix, y: f(BANNER_Y), width: iw, height: f(BANNER_H), rx: f(BANNER_H / 2), fill }),
    el('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })];
}

/** Element tree for one pin. `fw` is internal (comparison sheet only), never part of the public API. */
export function pinTree({ state, kind, frame, banner, size = 34 } = {}, fw = FRAME_W) {
  const [stateFill, opacity, badge] = pick(STATE, state, 'state');
  const [kindFill, icon] = pick(KIND, kind, 'kind');
  const b = banner == null ? null : pick(BANNER, banner, 'banner');
  if (typeof size !== 'number' || Number.isNaN(size)) throw new TypeError(`map-pin: size must be a number, got ${String(size)}`);
  const k = Math.min(512, Math.max(8, size)) / (POLE_TIP - TIP);
  const fr = frameEls(frame, fw);
  // Canvas: symmetric about the pole, bottom edge = pole tip (MapLibre icon-anchor 'bottom').
  let hw = R, top = TIP;
  if (fr.length) { hw = R + SEP + fw + 1; top = head(SEP + fw + 1).top; }
  if (badge === 'x') { hw = Math.max(hw, XX - CX + XR + 2); top = Math.min(top, XY - XR - 2); }
  if (badge === 'zz') for (const [x, y, sz, w] of ZZ) {
    const h = (w + 3) * ZK / 2;                              // white halo half-width
    hw = Math.max(hw, BX + (x + sz) * ZK + h - CX + 1); top = Math.min(top, BY + y * ZK - h - 1);
  }
  if (b) hw = Math.max(hw, CX - +b[1]);
  return el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: f(2 * hw * k, 2), height: f((POLE_TIP - top) * k, 2),
    viewBox: `${f(CX - hw)} ${f(top)} ${f(2 * hw)} ${f(POLE_TIP - top)}` },
    el('g', { opacity }, ...fr,
      el('rect', { x: '37', y: '70', width: '6', height: '20.5', rx: '3', fill: '#384240' }),
      el('path', { d: head(0).d, fill: stateFill || kindFill }),
      ...iconEls(icon), ...bannerEls(b), ...badgeEls(badge)));
}

export const toSvg = ({ tag, attrs, kids }) => `<${tag}${Object.entries(attrs).map(([a, v]) => ` ${a}="${v}"`).join('')}`
  + (kids.length ? `>${kids.map(toSvg).join('')}</${tag}>` : '/>');
