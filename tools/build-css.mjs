// Gera o CSS do Tailwind (v3, via CLI) e embute no devUI-Studio.html, entre os marcadores
// <!-- tailwind:start --> e <!-- tailwind:end -->. O app continua um arquivo único e sem script de CDN.
// Uso:  node tools/build-css.mjs          → regrava o bloco
//       node tools/build-css.mjs --check  → só confere se o bloco está atualizado (sai 1 se não)
// Rode depois de mudar classes Tailwind no HTML ou em strings do JS. Precisa de internet na
// primeira vez (npx baixa o tailwindcss@3.4.17 para o cache do npm).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TW_VERSION = '3.4.17';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'devUI-Studio.html');
const START = '<!-- tailwind:start -->';
const END = '<!-- tailwind:end -->';
const check = process.argv.includes('--check');

const html = fs.readFileSync(HTML, 'utf8');
const a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < a) {
  console.error(`Marcadores ${START} / ${END} não encontrados no HTML.`);
  process.exit(1);
}
const eol = html.includes('\r\n') ? '\r\n' : '\n';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'devui-tw-'));
const scan = path.join(tmp, 'scan.html');
const input = path.join(tmp, 'input.css');
const output = path.join(tmp, 'output.css');
fs.writeFileSync(scan, html.slice(0, a) + html.slice(b + END.length));
fs.writeFileSync(input, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');

const npx = path.join(path.dirname(process.execPath), process.platform === 'win32' ? 'npx.cmd' : 'npx');
const r = spawnSync(fs.existsSync(npx) ? `"${npx}"` : 'npx',
  ['--yes', `tailwindcss@${TW_VERSION}`, '-c', `"${path.join(ROOT, 'tools', 'tailwind.config.cjs')}"`, '-i', `"${input}"`, '-o', `"${output}"`, '--minify'],
  { encoding: 'utf8', shell: true, env: { ...process.env, DEVUI_TW_SCAN: scan } });
if (r.status !== 0 || !fs.existsSync(output)) {
  console.error('Falha ao rodar o Tailwind CLI:\n' + (r.stderr || r.stdout || r.error));
  process.exit(1);
}

const css = fs.readFileSync(output, 'utf8').trim();
fs.rmSync(tmp, { recursive: true, force: true });
const block = `${START}${eol}  <style id="tailwind-css">${css}</style>${eol}  ${END}`;
const current = html.slice(a, b + END.length);

if (check) {
  const ok = current === block;
  console.log(ok ? 'CSS do Tailwind atualizado.' : 'CSS do Tailwind DESATUALIZADO: rode node tools/build-css.mjs');
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(HTML, html.slice(0, a) + block + html.slice(b + END.length));
console.log(`CSS do Tailwind embutido: ${(css.length / 1024).toFixed(1)} KB (tailwindcss ${TW_VERSION}).`);
