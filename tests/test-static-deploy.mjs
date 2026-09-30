// Verificações estáticas do HTML e do deploy (R7, @security-auditor): sem Play CDN do Tailwind,
// CSS compilado embutido, todo <script src> externo com SRI e CSP sem hosts que não usamos mais.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reporter } from './harness.mjs';
import { assemble } from '../tools/build.mjs';

const { check, finish } = reporter();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'devUI-Studio.html'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

// R8: o HTML é gerado a partir de src/. Editar o gerado à mão (ou esquecer o build) quebra isto.
const TW = /<!-- tailwind:start -->[\s\S]*?<!-- tailwind:end -->/;
const built = assemble().replace(TW, '');
check('devUI-Studio.html em dia com src/ (rode node tools/build.mjs)', built === html.replace(TW, ''));
check('src/ tem shell, css, partes HTML e JS numerados',
  fs.existsSync(path.join(ROOT, 'src', 'shell.html')) && fs.readdirSync(path.join(ROOT, 'src', 'js')).every(f => /^\d+[a-z]?-[a-z0-9-]+\.js$/.test(f)));

check('sem script do Play CDN do Tailwind', !/cdn\.tailwindcss\.com/.test(html));
check('sem tailwind.config inline (o global "tailwind" não existe mais)', !/tailwind\.config\s*=/.test(html));

const block = html.match(/<!-- tailwind:start -->\s*<style id="tailwind-css">([\s\S]*?)<\/style>\s*<!-- tailwind:end -->/);
check('CSS do Tailwind embutido entre os marcadores', !!block && block[1].length > 10000, block ? `${block[1].length} bytes` : 'bloco ausente');
check('CSS embutido tem as cores do tema (figma-*)', !!block && block[1].includes('.bg-figma-panel') && block[1].includes('.text-figma-accent'));
check('CSS embutido mantém a licença MIT do Tailwind', !!block && /tailwindcss v3\.\d+\.\d+ \| MIT License/.test(block[1]));
check('bloco do Tailwind fica depois dos estilos próprios', html.indexOf('<!-- tailwind:start -->') > html.indexOf('.tb-group'));

const external = [...html.matchAll(/<script\b[^>]*\bsrc="https?:\/\/[^"]+"[^>]*>/g)].map(m => m[0]);
check('todo <script src> externo tem integrity e crossorigin', external.length > 0 && external.every(s => /integrity="sha(256|384|512)-/.test(s) && /crossorigin=/.test(s)), external.join(' | '));

const csp = (vercel.headers[0].headers.find(h => h.key === 'Content-Security-Policy') || {}).value || '';
const scriptSrc = (csp.match(/script-src ([^;]+)/) || [])[1] || '';
check('CSP: script-src sem cdn.tailwindcss.com', scriptSrc && !scriptSrc.includes('tailwindcss'), scriptSrc);
check('CSP: frame-ancestors none e object-src none', /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp));

finish();
