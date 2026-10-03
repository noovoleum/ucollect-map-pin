// Dev tool, not shipped: generates the banner artwork (labels as vector strokes, so no font and
// no letter-spacing dependency). Paste the printed table into pin.js AND flutter/lib/src/pin.dart.
// Run: node glyphs.mjs
const G = { // stroke glyphs on a 10-unit cap height: [advance, path of M/L/C/Z with x,y pairs]
  S: [6, 'M5.6,1.8 C4.8,-0.4 0.5,-0.4 0.5,2.6 C0.5,5.4 5.6,4.4 5.6,7.4 C5.6,10.6 1,10.6 0.3,8.2'],
  O: [6, 'M3,0 C-1,0 -1,10 3,10 C7,10 7,0 3,0 Z'],
  N: [6, 'M0,10 L0,0 L6,10 L6,0'],
  E: [5.2, 'M5.2,0 L0,0 L0,10 L5.2,10 M0,5 L4.4,5'],
  W: [8.4, 'M0,0 L2.1,10 L4.2,2.6 L6.3,10 L8.4,0'],
  P: [5.6, 'M0,10 L0,0 L3,0 C6.3,0 6.3,5.6 3,5.6 L0,5.6'],
  R: [5.6, 'M0,10 L0,0 L3,0 C6.3,0 6.3,5.6 3,5.6 L0,5.6 M3,5.6 L5.8,10'],
  M: [7.4, 'M0,10 L0,0 L3.7,6.4 L7.4,0 L7.4,10'],
};
const LABELS = { soon: ['SOON', '#3A444C'], new: ['NEW', '#2979C7'], promo: ['PROMO', '#E0457B'] };
const S = 1.2, GAP = 2.2, PAD = 5, TOP = 62, H = 19, CX = 40; // pin units; cap height 12
const f = (n) => n.toFixed(3);
for (const [k, [text, fill]] of Object.entries(LABELS)) {
  const tw = ([...text].reduce((a, c) => a + G[c][0], 0) + GAP * (text.length - 1)) * S;
  const w = tw + 2 * PAD, y0 = TOP + (H - 10 * S) / 2;
  let x = CX - tw / 2, d = '';
  for (const c of text) {
    let i = 0;
    d += G[c][1].replace(/-?\d+(\.\d+)?/g, (m) => f(i++ % 2 ? y0 + m * S : x + m * S)) + ' ';
    x += (G[c][0] + GAP) * S;
  }
  console.log(`${k}: ['${fill}', '${f(CX - w / 2 - 1.5)}', '${f(w + 3)}', '${f(CX - w / 2)}', '${f(w)}', '${d.trim()}'],`);
}
