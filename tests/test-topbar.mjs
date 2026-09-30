// Barra superior (R7): cabe sem rolagem numa tela de notebook (1366px), o menu de export abre
// dentro da tela, fecha com Esc/clique fora/ação e o Esc não limpa a seleção.
import fs from 'node:fs';
import path from 'node:path';
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('topbar', 9351);
const SHOTS = process.env.TOPBAR_SHOTS; // pasta opcional para screenshots da barra

const viewport = (width, height = 800) => page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
const bar = () => page.evaluate(`(() => {
  const h = document.getElementById('topBar');
  const m = document.getElementById('exportMenu').getBoundingClientRect();
  return JSON.stringify({
    overflow: h.scrollWidth - h.clientWidth,
    menuOpen: !document.getElementById('exportMenu').classList.contains('hidden'),
    expanded: document.getElementById('btnExportMenu').getAttribute('aria-expanded'),
    menu: { left: m.left, right: m.right, top: m.top },
    vw: window.innerWidth,
    selected: state.selectedIds.length
  });
})()`).then(JSON.parse);
const shot = async (name) => {
  if (!SHOTS) return;
  const r = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: await page.evaluate('innerWidth'), height: 330, scale: 1 } });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
};

try {
  await viewport(1366);
  await page.open();

  for (const w of [1366, 1280, 1920]) {
    await viewport(w);
    await sleep(150);
    const b = await bar();
    check(`barra cabe sem rolagem em ${w}px`, b.overflow <= 0, `sobra ${b.overflow}px`);
  }

  await viewport(1366);
  await sleep(150);
  await page.evaluate(`Studio.select(Studio.getAll().filter(c => !c.locked)[0].id), true`);
  await page.evaluate(`document.getElementById('btnExportMenu').click(), true`);
  let b = await bar();
  check('menu abre ao clicar em Exportar', b.menuOpen && b.expanded === 'true');
  check('menu fica dentro da tela', b.menu.left >= 0 && b.menu.right <= b.vw && b.menu.top > 0, JSON.stringify(b.menu));
  await shot('topbar-1366-menu.png');

  await page.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true`);
  b = await bar();
  check('Esc fecha o menu', !b.menuOpen && b.expanded === 'false');
  check('Esc do menu não limpa a seleção', b.selected === 1, String(b.selected));

  await page.evaluate(`document.getElementById('btnExportMenu').click(), true`);
  await page.evaluate(`document.getElementById('mainCanvas').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), true`);
  check('clique fora fecha o menu', !(await bar()).menuOpen);

  await page.evaluate(`document.getElementById('btnExportMenu').click(), true`);
  await page.evaluate(`document.getElementById('exportFormatSelect').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), true`);
  check('mexer no formato mantém o menu aberto', (await bar()).menuOpen);
  await page.evaluate(`document.getElementById('btnExportScene').click(), true`);
  await sleep(300);
  check('ação de export fecha o menu', !(await bar()).menuOpen);

  await page.evaluate(`setLanguage('en'), true`);
  const en = await page.evaluate(`document.querySelector('#btnExportMenu [data-i18n]').textContent + '|' + document.getElementById('btnExportBatch').textContent`);
  check('menu traduzido para EN', en.startsWith('Export|') && en.includes('Engine ZIP package'), en);
  await page.evaluate(`setLanguage('pt'), true`);
  await shot('topbar-1366.png');

  // Zoom (R7: os botões tinham perdido os listeners e nenhum teste percebeu)
  const zoom = JSON.parse(await page.evaluate(`JSON.stringify((() => {
    const z = () => Math.round(state.zoom * 1000) / 1000, label = () => document.getElementById('zoomLabel').textContent;
    const out = {};
    fitCanvasToViewport(); const fit = z();
    document.getElementById('btnZoomIn').click(); out.in = z() > fit;
    const afterIn = z(); document.getElementById('btnZoomOut').click(); out.out = z() < afterIn;
    document.getElementById('btnZoomReset').click(); out.reset = z() === 1 && label() === '100%';
    document.getElementById('btnZoomFit').click(); out.fit = z() === fit && state.panX === 0 && state.panY === 0;
    const key = (code, extra) => document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'Digit0' ? ')' : '!', bubbles: true, ...extra }));
    key('Digit0', { shiftKey: true }); out.shift0 = z() === 1;
    key('Digit1', { shiftKey: true }); out.shift1 = z() === fit;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '=', ctrlKey: true, bubbles: true })); out.ctrlPlus = z() > fit;
    return out;
  })())`));
  check('botões + e − mudam o zoom', zoom.in && zoom.out, JSON.stringify(zoom));
  check('1:1 vai para 100%', zoom.reset, JSON.stringify(zoom));
  check('Fit enquadra a cena', zoom.fit, JSON.stringify(zoom));
  check('atalhos Shift+0, Shift+1 e Ctrl+ no zoom', zoom.shift0 && zoom.shift1 && zoom.ctrlPlus, JSON.stringify(zoom));

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
