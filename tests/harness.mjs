// Base dos testes headless: abre o devUI-Studio.html num Chrome/Edge sem janela e conversa com a
// página pelo DevTools Protocol (WebSocket nativo do Node 22). Sem dependências de npm.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const APP = pathToFileURL(path.join(ROOT, 'devUI-Studio.html')).href;

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Resultado de cada suíte: "PASS/FAIL  nome" e a linha final "N/M passaram" (lida pelo run-all).
export function reporter() {
  const results = [];
  return {
    check(name, ok, info = '') { results.push({ name, ok: !!ok, info }); },
    finish() {
      const fails = results.filter(r => !r.ok);
      for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.info ? '' : '  → ' + r.info}`);
      console.log(`\n${results.length - fails.length}/${results.length} passaram`);
      process.exit(fails.length ? 1 : 0);
    }
  };
}

// Cada suíte usa um perfil novo (sem autosave de execuções anteriores) e uma porta própria.
export async function launch(name, port) {
  const exe = BROWSERS.find(p => fs.existsSync(p));
  if (!exe) throw new Error('Chrome/Edge não encontrado. Defina CHROME_PATH.');
  const profile = path.join(os.tmpdir(), `devui-test-${name}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const browser = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--window-size=1920,1080', 'about:blank']);

  let targets = [];
  for (let i = 0; i < 50 && !targets.some(t => t.type === 'page'); i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {}
    if (!targets.some(t => t.type === 'page')) await sleep(200);
  }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  let seq = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });

  // Avalia na página; retorna o valor (use JSON.stringify para objetos) e propaga exceções da página.
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800));
    return r.result.result.value;
  };

  // O 'load' da página repovoa a cena (autosave ou demo): espera terminar antes de mexer.
  const waitReady = async (settleMs = 1200) => {
    for (let i = 0; i < 150; i++) {
      try { if (await evaluate('document.readyState === "complete" && window.studioReady === true && Studio.getAll().length > 0')) break; } catch {}
      await sleep(200);
    }
    await sleep(settleMs);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  const open = async () => { await send('Page.navigate', { url: APP }); await waitReady(); };
  const reload = async () => { await send('Page.reload'); await sleep(500); await waitReady(); };
  const close = () => { try { ws.close(); } catch {} browser.kill(); };

  return { send, evaluate, open, reload, waitReady, errors, close };
}
