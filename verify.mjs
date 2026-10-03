// Generates fixtures/ (the cross-language contract) and asserts the JS rules.
// Run: node verify.mjs            (writes fixtures, exits non-zero on any failure)
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pinSvg, pinImageKey, pinZ, resolvePin, STATES, KINDS } from './index.js';

const FRAMES = {
  none: null,
  alfamart: { pattern: 'stripes', colors: ['#E31E24', '#FFD200'] },
  pertamina: { pattern: 'rings', colors: ['#E31E24', '#FFFFFF', '#005DAA'] },
  gold: { pattern: 'solid', colors: ['#D4A017'] },
};
const cases = [];
for (const state of Object.keys(STATES))
  for (const kind of Object.keys(KINDS))
    for (const [fn, frame] of Object.entries(FRAMES))
      cases.push({ name: `${state}-${kind}-${fn}`, spec: { state, kind, frame } });
cases.push(
  { name: 'promo', spec: { state: 'available', frame: FRAMES.alfamart, banner: 'PROMO' } },
  { name: 'new-cp', spec: { kind: 'collection_point', banner: 'NEW' } },
  { name: 'fw3-size64', spec: { state: 'closed', frame: FRAMES.pertamina }, options: { frameWidth: 3, size: 64 } },
  { name: 'fw7-mid-topright', spec: { state: 'planned', frame: FRAMES.alfamart }, options: { frameWidth: 7, bannerPosition: 'mid', bannerScale: 1.25, badgePosition: 'top-right', badgeRadius: 12 } },
  { name: 'unknown-state', spec: { state: 'exploded', kind: 'spaceship' } },
  { name: 'bad-frame', spec: { frame: { pattern: 'plaid', colors: [] } } },
  { name: 'five-colours', spec: { frame: { pattern: 'stripes', colors: ['#111111', '#222222', '#333333', '#444444', '#555555'] } } },
);

// rules
for (const c of cases) {
  const p = resolvePin(c.spec);
  assert.ok(p.fill && p.icon, c.name);                                       // never vanishes
  if (p.state !== 'available') assert.ok(p.opacity < 1 && [null, 'SOON'].includes(p.banner), c.name);
}
assert.equal(resolvePin({ state: 'exploded' }).state, 'available');
assert.equal(resolvePin({ frame: { pattern: 'plaid', colors: ['#000'] } }).frame, null);
assert.equal(resolvePin({ state: 'closed', banner: 'PROMO' }).banner, null);  // promo only on available
assert.equal(resolvePin({ state: 'planned', banner: 'NEW' }).banner, 'SOON');
assert.equal(resolvePin({ state: 'maintenance', kind: 'collection_point' }).icon, 'x');
assert.equal(resolvePin({ kind: 'collection_point', frame: FRAMES.alfamart }).fill, '#7C4DAF'); // partner can't recolour
const five = pinSvg(cases.find((c) => c.name === 'five-colours').spec);
assert.ok(five.includes('#333333') && !five.includes('#444444'), 'max 3 frame colours');
const svg = pinSvg({ frame: FRAMES.alfamart });
assert.ok(svg.indexOf('clipPath') < svg.indexOf('#384240') && svg.indexOf('#384240') < svg.indexOf('#70AD47'), 'paint order frame<pole<head');
assert.ok(pinZ({ state: 'available' }) > pinZ({ state: 'closed' }) && pinZ({ state: 'maintenance' }) > pinZ({ state: 'planned' }));

mkdirSync('fixtures', { recursive: true });
for (const c of cases) {
  c.key = pinImageKey(c.spec, c.options);
  c.z = pinZ(c.spec);
  writeFileSync(`fixtures/${c.name}.svg`, pinSvg(c.spec, c.options));
}
writeFileSync('fixtures/cases.json', JSON.stringify(cases, null, 1));
assert.equal(new Set(cases.map((c) => c.key)).size >= 34, true, 'image keys distinguish looks');
console.log(`ok: ${cases.length} fixtures, rules pass`);
