// Monta a pasta deploy/ com exatamente o que vai para o GitHub (upload pelo navegador, sem git).
// Uso: node tools/build-deploy.mjs  → depois arraste o CONTEÚDO de deploy/ para "Add file > Upload files".
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'deploy');

// Fora da lista de propósito: layouts de teste pessoais (stats.json, HUD_*.json).
const FILES = ['devUI-Studio.html', 'vercel.json', '.vercelignore', 'README.md', 'LICENSE',
  'claude.md', 'DOCS_ARQUITETURA_E_PROCESSOS.md', 'BRAG_PLANO_CASA.md'];
const DIRS = ['src', 'tests', 'tools'];

// O HTML publicado precisa estar em dia com src/ (o código-fonte vai junto para o GitHub).
const check = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.mjs'), '--check'], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stdout || check.stderr);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
for (const d of DIRS) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });

// .vercelignore começa com ponto: o Explorer esconde e é fácil esquecer no upload.
const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`deploy/ pronto: ${count(OUT)} arquivos. Arraste todo o conteúdo (inclusive .vercelignore) para o GitHub.`);
