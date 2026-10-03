// @noovoleum/map-pin — uCollect station map pin as an SVG string.
// Zero dependencies, no build step. Geometry = the shipped ucoflag.png, traced (body IoU 0.998).
// The Dart port (flutter/) must produce byte-identical SVG: see fixtures/ + verify.mjs.

const BODY = { cx: 40, cy: 46, r: 28, tip: 2 };
const STEM = { x: 37, y: 70, w: 6, h: 20.5, fill: '#384240' };
// circular-arrow logo (fitted, IoU 0.964) — fixed geometry, precomputed
const LOGO_ARC = 'M43.051,61.624 A16.88,16.88 0 1 1 56.631,48.510 L50.195,47.141 A10.3,10.3 0 1 0 41.909,55.144 Z';
const LOGO_HEAD = 'M41.000,48.000 L53.500,57.500 L41.000,67.500 Z';
const LOGO_C = [40.12, 46];  // icon centre used by house / X
const SEP = 1.4;             // white gap between head and frame
// One canvas for every pin; pole tip (40, 90.5) is bottom-centre → MapLibre iconAnchor:'bottom'.
export const VIEWBOX = [-16, -18, 112, 108.5];

export const STATES = {
  //            fill       opacity icon   badge    banner
  available:   [null,      1.00,   null,  null,    null],
  closed:      ['#F2B200', 0.55,   null,  'clock', null],
  planned:     ['#8A949C', 0.50,   null,  null,    'SOON'],
  maintenance: ['#D93C4E', 0.60,   'x',   null,    null],
};
export const KINDS = { station: ['#70AD47', 'uco'], collection_point: ['#7C4DAF', 'house'] };
const BANNER_FILL = { SOON: '#3A444C', NEW: '#2979C7', PROMO: '#E0457B' };
const BANNER_Y = { mid: BODY.cy + BODY.r - 18, low: BODY.cy + BODY.r - 8 };
const BADGE_XY = { 'top-left': [BODY.cx - 21, BODY.cy - 19], 'top-right': [BODY.cx + 21, BODY.cy - 19] };
export const DEFAULTS = { frameWidth: 5, bannerPosition: 'low', bannerScale: 1.5, badgePosition: 'top-left', badgeRadius: 10 };

const f = (n, d = 3) => n.toFixed(d);

/** Flag-head silhouette offset outward by `grow` (true offset: uniform on every side, tip included). */
function bodyPath(grow = 0) {
  const { cx, cy, r, tip } = BODY;
  const d0 = cy - tip, a = Math.asin(r / d0), rr = r + grow, d = d0 + grow / Math.sin(a);
  const phi = Math.acos(rr / d), x1 = cx - rr * Math.sin(phi), x2 = cx + rr * Math.sin(phi), y = cy - rr * Math.cos(phi);
  return `M${f(cx)},${f(cy - d)} L${f(x2)},${f(y)} A${f(rr)},${f(rr)} 0 1 1 ${f(x1)},${f(y)} Z`;
}

function frameSvg(frame, F) {
  if (!frame || !(F > 0)) return '';
  const cols = frame.colors.slice(0, 3);
  let s = `<path d="${bodyPath(SEP + F + 1)}" fill="#1f2328" fill-opacity="0.35"/>`;
  if (frame.pattern === 'rings') {
    cols.forEach((c, k) => { s += `<path d="${bodyPath(SEP + F * (cols.length - k) / cols.length)}" fill="${c}"/>`; });
  } else if (frame.pattern === 'stripes') {
    const w = Math.max(3, F * 0.9), id = `mpc${f(F, 2).replace('.', '_')}`;
    let st = '';
    for (let i = 0; i < Math.floor(200 / w); i++)
      st += `<rect x="${f(-60 + i * w, 2)}" y="-40" width="${f(w, 2)}" height="200" fill="${cols[i % cols.length]}"/>`;
    s += `<clipPath id="${id}"><path d="${bodyPath(SEP + F)}"/></clipPath>`
       + `<g clip-path="url(#${id})"><g transform="rotate(35 ${BODY.cx} ${BODY.cy})">${st}</g></g>`;
  } else {
    s += `<path d="${bodyPath(SEP + F)}" fill="${cols[0]}"/>`;
  }
  return s + `<path d="${bodyPath(SEP)}" fill="#fff"/>`;
}

function iconSvg(name) {
  const [cx, cy] = LOGO_C;
  if (name === 'uco') return `<path d="${LOGO_ARC}" fill="#fff"/><path d="${LOGO_HEAD}" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`;
  if (name === 'house') return `<g transform="translate(${f(cx)} ${f(cy)}) scale(1.55) translate(-12 -12.5)"><path d="M12 2.2 1.2 11.6h3.1V22h5.6v-6.4h4.2V22h5.6V11.6h3.1z" fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round"/></g>`;
  const k = 11; // 'x'
  return `<path d="M${f(cx - k)},${f(cy - k)} L${f(cx + k)},${f(cy + k)} M${f(cx + k)},${f(cy - k)} L${f(cx - k)},${f(cy + k)}" stroke="#fff" stroke-width="6.2" stroke-linecap="round"/>`;
}

function bannerSvg(text, pos, size) {
  if (!text) return '';
  const fs = 11.5 * size, w = 0.84 * fs * text.length + 12 * size, h = 15 * size, cx = BODY.cx, y = BANNER_Y[pos] - h / 2 + 7.5;
  return `<rect x="${f(cx - w / 2 - 2)}" y="${f(y - 2)}" width="${f(w + 4)}" height="${f(h + 4)}" rx="${f(h / 2 + 2)}" fill="#fff"/>`
       + `<rect x="${f(cx - w / 2)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${BANNER_FILL[text]}"/>`
       + `<text x="${f(cx)}" y="${f(y + h * 0.75)}" text-anchor="middle" font-family="Inter,Roboto,Arial,sans-serif" font-weight="800" font-size="${f(fs)}" letter-spacing="0.5" fill="#fff">${text}</text>`;
}

function badgeSvg(kind, pos, r) {
  if (kind !== 'clock') return '';
  const [bx, by] = BADGE_XY[pos], sw = f(r * 0.2);
  return `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(r + 2)}" fill="#fff"/><circle cx="${f(bx)}" cy="${f(by)}" r="${f(r)}" fill="#4A3A00"/>`
       + `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(r * 0.6)}" fill="none" stroke="#fff" stroke-width="${sw}"/>`
       + `<path d="M${f(bx)} ${f(by - r * 0.36)}V${f(by)}l${f(r * 0.3)} ${f(r * 0.2)}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/**
 * Resolve a backend pin spec to what gets drawn. Fill + icon are uCollect-owned:
 * a partner only ever controls `frame`. Unknown state/kind degrade to available/station
 * (a pin must never vanish — the shipped app's failure mode).
 */
export function resolvePin(spec = {}) {
  const st = STATES[spec.state] ? spec.state : 'available';
  const kind = KINDS[spec.kind] ? spec.kind : 'station';
  const [fill, opacity, icon, badge, banner] = STATES[st];
  const ok = (fr) => fr && ['solid', 'stripes', 'rings'].includes(fr.pattern) && Array.isArray(fr.colors) && fr.colors.length > 0;
  return {
    state: st, kind, opacity, badge,
    fill: fill || KINDS[kind][0],
    icon: icon || KINDS[kind][1],
    frame: ok(spec.frame) ? spec.frame : null,
    banner: banner || (st === 'available' && (spec.banner === 'NEW' || spec.banner === 'PROMO') ? spec.banner : null),
  };
}

/** Stable key for one look — register each distinct key once with map.addImage. */
export function pinImageKey(spec = {}, options = {}) {
  const p = resolvePin(spec), o = { ...DEFAULTS, ...options };
  return ['pin', p.state, p.kind, p.banner || '', p.frame ? `${p.frame.pattern}:${p.frame.colors.slice(0, 3).join(',')}` : '',
          o.frameWidth, o.bannerPosition, o.bannerScale, o.badgePosition, o.badgeRadius].join('|');
}

/** SVG markup for a pin. `size` = on-screen width in px of an unframed pin canvas (default 40). */
export function pinSvg(spec = {}, options = {}) {
  const p = resolvePin(spec), o = { ...DEFAULTS, ...options };
  const k = (o.size ?? 40) / 84, [vx, vy, vw, vh] = VIEWBOX;
  const body = frameSvg(p.frame, o.frameWidth)
    + `<rect x="${STEM.x}" y="${STEM.y}" width="${STEM.w}" height="${STEM.h}" rx="${STEM.w / 2}" fill="${STEM.fill}"/>`
    + `<path d="${bodyPath()}" fill="${p.fill}"/>`
    + iconSvg(p.icon)
    + bannerSvg(p.banner, o.bannerPosition, o.bannerScale)
    + badgeSvg(p.badge, o.badgePosition, o.badgeRadius);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(vw * k, 1)}" height="${f(vh * k, 1)}" viewBox="${vx} ${vy} ${vw} ${vh}">`
       + `<g opacity="${p.opacity.toFixed(2)}">${body}</g></svg>`;
}

/** Map z-order: available on top, planned at the bottom (use as MapLibre symbol-sort-key / zIndex). */
export const pinZ = (spec = {}) => ({ available: 4, closed: 3, maintenance: 2, planned: 1 })[resolvePin(spec).state];
