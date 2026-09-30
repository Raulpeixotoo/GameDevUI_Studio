// Monta o devUI-Studio.html (arquivo único que o usuário baixa e a Vercel serve) a partir de src/.
//   src/shell.html   <head>, esqueleto do <body> e as diretivas de inclusão
//   src/css/app.css  estilos próprios (o CSS do Tailwind é gerado à parte por tools/build-css.mjs)
//   src/html/*.html  partes do body, incluídas onde o shell pede
//   src/js/*.js      o script principal, concatenado em ordem de nome (01-, 02-...). É UM script só:
//                    tudo compartilha o mesmo escopo, então a ordem dos arquivos é a ordem de execução.
// Uso:  node tools/build.mjs            → gera o HTML e atualiza o CSS do Tailwind
//       node tools/build.mjs --no-css   → gera o HTML mantendo o bloco do Tailwind atual
//       node tools/build.mjs --check    → só confere se o devUI-Studio.html está em dia com src/ (sai 1 se não)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'devUI-Studio.html');
const TW = /<!-- tailwind:start -->[\s\S]*?<!-- tailwind:end -->/;

export function assemble() {
  const shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');
  const eol = shell.includes('\r\n') ? '\r\n' : '\n';
  const read = (rel) => {
    const text = fs.readFileSync(path.join(SRC, rel), 'utf8').replace(/\r?\n/g, eol);
    return text.endsWith(eol) ? text.slice(0, -eol.length) : text;
  };
  const expand = (spec) => {
    if (!spec.includes('*')) return [read(spec)];
    const dir = path.dirname(spec), ext = path.extname(spec);
    return fs.readdirSync(path.join(SRC, dir)).filter(f => f.endsWith(ext)).sort().map(f => read(`${dir}/${f}`));
  };
  return shell.split(eol).map(line => {
    const m = line.match(/^\s*(?:\/\* @include (\S+) \*\/|<!-- @include (\S+) -->)\s*$/);
    return m ? expand(m[1] || m[2]).join(eol) : line;
  }).join(eol);
}

// O bloco do Tailwind é gerado: o build conserva o que já está no HTML atual.
function withCurrentTailwind(html) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').match(TW) : null;
  return current ? html.replace(TW, () => current[0]) : html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = withCurrentTailwind(assemble());
  if (process.argv.includes('--check')) {
    const ok = fs.readFileSync(OUT, 'utf8') === html;
    console.log(ok ? 'devUI-Studio.html em dia com src/.' : 'devUI-Studio.html DESATUALIZADO (ou editado à mão): rode node tools/build.mjs');
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(OUT, html);
  const js = fs.readdirSync(path.join(SRC, 'js')).length, parts = fs.readdirSync(path.join(SRC, 'html')).length;
  console.log(`devUI-Studio.html montado: ${js} arquivos JS, ${parts} partes HTML, ${(html.length / 1024).toFixed(0)} KB.`);
  if (!process.argv.includes('--no-css')) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-css.mjs')], { stdio: 'inherit' });
    if (r.status !== 0) console.warn('Aviso: o CSS do Tailwind não foi atualizado (sem internet?). O bloco anterior foi mantido.');
  }
}
