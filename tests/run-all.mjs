// Roda todas as suítes (tests/test-*.mjs) e mostra o total. Uso: node tests/run-all.mjs
// Requisitos: Node 22+ e Chrome ou Edge instalados (ou CHROME_PATH apontando para um).
// Também confere a sintaxe do <script> principal antes de abrir o navegador.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(DIR, '..', 'devUI-Studio.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), '');
const tmp = path.join(os.tmpdir(), 'devui-main-script.js');
fs.writeFileSync(tmp, main);
const syntax = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
console.log(`== sintaxe do script principal: ${syntax.status === 0 ? 'ok' : 'ERRO'}`);
if (syntax.status !== 0) { console.log(syntax.stderr); process.exit(1); }

let pass = 0, total = 0, failedSuites = [];
for (const file of fs.readdirSync(DIR).filter(f => /^test-.*\.mjs$/.test(f)).sort()) {
  const r = spawnSync(process.execPath, [path.join(DIR, file)], { encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+)\/(\d+) passaram/);
  if (m) { pass += +m[1]; total += +m[2]; }
  const ok = r.status === 0;
  if (!ok) failedSuites.push(file);
  console.log(`\n== ${file}: ${m ? `${m[1]}/${m[2]}` : 'sem resultado'} ${ok ? '' : '(FALHOU)'}`);
  if (!ok) console.log(out.split('\n').filter(l => !l.startsWith('PASS')).join('\n'));
}
console.log(`\nTOTAL: ${pass}/${total} passaram${failedSuites.length ? ` — suítes com falha: ${failedSuites.join(', ')}` : ''}`);
process.exit(failedSuites.length ? 1 : 0);
