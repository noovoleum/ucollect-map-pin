// Fixture oracle. `node verify.mjs` fails if any output differs from the committed fixtures/.
// `node verify.mjs --update` rewrites them (review the diff: changed pixels = minor release).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { pinSvg, STATES, KINDS, FRAME_PATTERNS, BANNERS, STATE_COLORS } from './index.js';

const COLS = ['#E31E24', '#FFD200', '#005DAA'];
const HEX_RE = /^#[0-9A-F]{6}$/i;
const cases = [];
for (const state of STATES) for (const kind of KINDS) for (const banner of [null, ...BANNERS])
  cases.push({ name: `${state}-${kind}-${banner ?? 'plain'}`, props: { state, kind, banner } });
for (const pattern of FRAME_PATTERNS) for (const n of [1, 2, 3])
  cases.push({ name: `frame-${pattern}-${n}`, props: { state: 'available', kind: 'station', frame: { pattern, colors: COLS.slice(0, n) } } });
cases.push(
  { name: 'closed-cp-stripes-3-promo', props: { state: 'closed', kind: 'collection_point', frame: { pattern: 'stripes', colors: COLS }, banner: 'promo' } },
  { name: 'size-37_5', props: { state: 'maintenance', kind: 'station', frame: { pattern: 'rings', colors: COLS.slice(0, 2) }, size: 37.5 } },
  { name: 'invalid-colours', props: { state: 'available', kind: 'station', frame: { pattern: 'rings', colors: ['red', '#abc', '#e31e24', '"/><script>', '#12345G', '#005daa', '#111111', '#222222'] } } },
  { name: 'no-valid-colours', props: { state: 'available', kind: 'station', frame: { pattern: 'solid', colors: ['url(javascript:x)', 42, null] } } },
);

// Safety rules (programming errors throw; hostile colours never reach the markup).
for (const bad of [{ state: 'toString', kind: 'station' }, { state: '__proto__', kind: 'station' }, { state: 'available', kind: 'constructor' },
  { state: 'available', kind: 'station', banner: 'NEW' }, { state: 'available', kind: 'station', size: NaN },
  { state: 'available', kind: 'station', size: '40' }, { state: 'available', kind: 'station', frame: { pattern: 'plaid', colors: COLS } },
  { state: 'available', kind: 'station', frame: { pattern: 'hasOwnProperty', colors: COLS } }, {}])
  assert.throws(() => pinSvg(bad), TypeError, JSON.stringify(bad));
const inv = pinSvg(cases.find((c) => c.name === 'invalid-colours').props);
assert.ok(!/script|red"|#abc"|#12345G/.test(inv) && inv.includes('#e31e24') && !inv.includes('#005daa'), 'only the first 3 entries are inspected');
// R2-H01: caller-overridden methods and getters must not reach the SVG.
const evil = ['#FFFFFF']; evil.filter = () => ['"/><image onerror="sentinel"/><!--']; evil.slice = evil.filter;
assert.ok(!pinSvg({ state: 'available', kind: 'station', frame: { pattern: 'solid', colors: evil } }).includes('onerror'), 'overridden filter');
let reads = 0;
pinSvg({ state: 'available', kind: 'station', frame: { get pattern() { reads++; return 'rings'; }, get colors() { reads++; return ['#AABBCC']; } } });
assert.equal(reads, 2, 'frame.pattern and frame.colors read exactly once each');
let flip = 0;
const sneaky = ['#AABBCC']; Object.defineProperty(sneaky, 0, { get: () => (flip++ ? '"/><image onerror="x"/>' : '#AABBCC') });
assert.ok(!pinSvg({ state: 'available', kind: 'station', frame: { pattern: 'solid', colors: sneaky } }).includes('onerror'), 'element read once');
assert.ok(!pinSvg(cases.find((c) => c.name === 'no-valid-colours').props).includes('1f2328'), 'zero valid colours => no frame');
assert.ok(!/\bid=|url\(#/.test(cases.map((c) => pinSvg(c.props)).join('')), 'no ids => nothing to collide inline');
assert.ok(pinSvg({ state: 'available', kind: 'station', size: 1e9 }).includes('height="512.00"'), 'size clamped');
for (const t of [STATES, KINDS, FRAME_PATTERNS, BANNERS]) assert.ok(Object.isFrozen(t));
// STATE_COLORS: frozen, one entry per state, and exactly what the pin draws for every kind.
assert.deepEqual(Object.keys(STATE_COLORS), [...STATES]);
assert.ok(Object.isFrozen(STATE_COLORS) && STATES.every((s) => Object.isFrozen(STATE_COLORS[s])));
for (const s of STATES) for (const kind of KINDS) {
  const { fill, opacity } = STATE_COLORS[s], svg = pinSvg({ state: s, kind });
  assert.ok(HEX_RE.test(fill) && svg.includes(`<g opacity="${opacity.toFixed(2)}">`) && svg.includes(`fill="${fill}"/>`), `STATE_COLORS.${s} (${kind})`);
}

const update = process.argv.includes('--update');
if (update) { rmSync('fixtures', { recursive: true, force: true }); mkdirSync('fixtures'); }
const bad = [];
for (const c of cases) {
  const svg = pinSvg(c.props), file = `fixtures/${c.name}.svg`;
  if (update) writeFileSync(file, svg);
  else if (readFileSync(file, 'utf8') !== svg) bad.push(c.name);
}
const json = JSON.stringify(cases, null, 1) + '\n';
if (update) writeFileSync('fixtures/cases.json', json);
else {
  if (readFileSync('fixtures/cases.json', 'utf8') !== json) bad.push('cases.json');
  const extra = readdirSync('fixtures').filter((f) => f !== 'cases.json' && !cases.some((c) => `${c.name}.svg` === f));
  bad.push(...extra.map((f) => `stale ${f}`));
}
assert.deepEqual(bad, [], 'output differs from committed fixtures (run with --update and review the diff)');
console.log(`ok: ${cases.length} fixtures ${update ? 'written' : 'match'}, safety rules pass`);
