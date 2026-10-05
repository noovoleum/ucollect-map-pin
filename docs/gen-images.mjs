import fs from 'node:fs';
import { pinSvg, STATES, KINDS, BANNERS } from '../index.js';
const S = 56;
const page = (title, head, rows) => `<!doctype html><meta charset=utf-8><style>html{background:#fff}
body{margin:0;padding:16px 20px;font:13px system-ui,sans-serif;color:#1f2328;background:#F4F1EA;display:inline-block}
table{border-collapse:collapse}td,th{padding:6px 10px;text-align:center;vertical-align:bottom}
th{font-weight:600;color:#57606a;font-size:12px}td.l{text-align:left;color:#57606a;font-size:12px;vertical-align:middle}
code{font:11px ui-monospace,monospace;color:#57606a}</style>
<table><tr><th></th>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(([l,cells])=>`<tr><td class=l>${l}</td>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const P = (p) => pinSvg({ size: S, ...p });
const out = {};
out.states = page('', STATES, KINDS.map(k => [k, STATES.map(s => P({ state: s, kind: k }))]));
out.banners = page('', ['none', ...BANNERS], STATES.map(s => [s, [null, ...BANNERS].map(b => P({ state: s, kind: 'station', banner: b }))]));
const C = ['#E31E24', '#FFD200', '#005DAA'];
out.patterns = page('', ['1 colour', '2 colours', '3 colours'], ['solid', 'stripes', 'rings'].map(p => [p, [1,2,3].map(n => P({ state: 'available', kind: 'station', frame: { pattern: p, colors: C.slice(0, n) } }))]));
const partners = [['Alfamart', { pattern: 'stripes', colors: ['#E31E24', '#FFD200'] }], ['Pertamina', { pattern: 'rings', colors: ['#E31E24', '#005DAA'] }], ['Indomaret', { pattern: 'stripes', colors: ['#0055A5', '#FFD100', '#E30613'] }], ['solid', { pattern: 'solid', colors: ['#7C4DAF'] }]];
out.partners = page('', partners.map(p => p[0]), STATES.map(s => [s, partners.map(([, f]) => P({ state: s, kind: 'station', frame: f, banner: s === 'planned' ? 'soon' : null }))]));
out.sizes = page('', ['24', '34 (default)', '48', '64', '96'], [['station', [24,34,48,64,96].map(z => pinSvg({ state: 'available', kind: 'station', size: z }))], ['framed', [24,34,48,64,96].map(z => pinSvg({ state: 'available', kind: 'station', size: z, frame: partners[0][1] }))]]);
for (const [k, v] of Object.entries(out)) fs.writeFileSync(`docs-img/${k}.html`, v);
console.log(Object.keys(out).join(' '));
