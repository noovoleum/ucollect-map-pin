// Consumer type check: compiles a .tsx importing the package under node16 and bundler
// resolution, against whichever @types/react is installed next to this script's cwd.
// Run from a scratch dir holding typescript + @types/react + react + react-dom:
//   node <repo>/dev/typecheck.mjs <repo>
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.argv[2], cwd = process.cwd(), req = createRequire(join(cwd, 'x.js'));
const ts = req('typescript');
const pkg = join(cwd, 'node_modules/@noovoleum/map-pin');
mkdirSync(pkg, { recursive: true });
for (const f of ['package.json', 'index.js', 'index.d.ts', 'pin.js', 'react.js', 'react.d.ts']) cpSync(join(repo, f), join(pkg, f));
writeFileSync(join(cwd, 'package.json'), '{"type":"module"}');
writeFileSync(join(cwd, 'consumer.tsx'), `
import { pinSvg, STATES, type PinProps } from '@noovoleum/map-pin';
import { MapPin } from '@noovoleum/map-pin/react';
const p: PinProps = { state: 'closed', kind: 'collection_point', frame: { pattern: 'rings', colors: ['#E31E24'] }, banner: 'promo', size: 37.5 };
export const s: string = pinSvg(p) + STATES[0];
export const a = <MapPin {...p} aria-label="Closed collection point" className="pin" />;
export const b = <MapPin state="available" kind="station" />;
// @ts-expect-error unknown state is a type error
export const c = <MapPin state="offline" kind="station" />;
// @ts-expect-error design knobs are not public
export const d = <MapPin state="available" kind="station" frameWidth={5} />;
`);
let fail = 0;
for (const [mod, res] of [['Node16', 'Node16'], ['ESNext', 'Bundler']]) {
  const prog = ts.createProgram([join(cwd, 'consumer.tsx')], { strict: true, noEmit: true, jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind[mod], moduleResolution: ts.ModuleResolutionKind[res], target: ts.ScriptTarget.ES2022, skipLibCheck: false });
  const diags = ts.getPreEmitDiagnostics(prog);
  for (const d of diags) console.log(' ', ts.flattenDiagnosticMessageText(d.messageText, ' '));
  console.log(`${res}: ${diags.length} diagnostics (ts ${ts.version}, @types/react ${req('@types/react/package.json').version})`);
  fail += diags.length;
}
const { renderToStaticMarkup } = req('react-dom/server');
const React = req('react');
const { MapPin } = await import(join(pkg, 'react.js'));
const deco = renderToStaticMarkup(React.createElement(MapPin, { state: 'closed', kind: 'station' }));
const named = renderToStaticMarkup(React.createElement(MapPin, { state: 'closed', kind: 'station', 'aria-label': 'Closed' }));
const { pinSvg } = await import(join(pkg, 'index.js'));
const ok = deco.includes('aria-hidden="true"') && named.includes('role="img"') && named.includes('aria-label="Closed"')
  && !deco.includes('dangerouslySetInnerHTML') && deco.replace(/ aria-hidden="true"/, '').replace(/><\/(path|rect|circle)>/g, '/>') === pinSvg({ state: 'closed', kind: 'station' });
console.log(`ssr: react ${React.version}, decorative/labelled/markup-equal ${ok}`);
process.exit(fail || !ok ? 1 : 0);
