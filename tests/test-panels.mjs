// Painéis laterais redimensionáveis (R7): arrastar, limites, duplo clique, teclado e preferência salva.
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('panels', 9354);
const widths = () => page.evaluate(`JSON.stringify({ l: document.getElementById('leftPanel').getBoundingClientRect().width, r: document.getElementById('rightPanel').getBoundingClientRect().width, v: document.getElementById('viewportContainer').getBoundingClientRect().width })`).then(JSON.parse);
const center = (id) => page.evaluate(`JSON.stringify((() => { const b = document.getElementById('${id}').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })())`).then(JSON.parse);
const mouse = async (type, x, y, extra = {}) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra });
const drag = async (id, dx) => {
  const p = await center(id);
  await mouse('mousePressed', p.x, p.y);
  await mouse('mouseMoved', p.x + dx / 2, p.y);
  await mouse('mouseMoved', p.x + dx, p.y);
  await mouse('mouseReleased', p.x + dx, p.y);
  await sleep(100);
};

try {
  await page.open();
  let w = await widths();
  check('larguras padrão 256 / 320', w.l === 256 && w.r === 320, JSON.stringify(w));

  await drag('resizeLeftPanel', 100);
  w = await widths();
  check('arrastar a alça esquerda alarga as camadas', w.l === 356, JSON.stringify(w));

  await drag('resizeRightPanel', -120);
  w = await widths();
  check('arrastar a alça direita para a esquerda alarga o Inspector', w.r === 440, JSON.stringify(w));

  await drag('resizeLeftPanel', 900);
  w = await widths();
  check('limite máximo da esquerda (480)', w.l === 480, JSON.stringify(w));
  await drag('resizeLeftPanel', -900);
  w = await widths();
  check('limite mínimo da esquerda (200)', w.l === 200, JSON.stringify(w));

  const p = await center('resizeLeftPanel');
  await mouse('mousePressed', p.x, p.y, { clickCount: 1 });
  await mouse('mouseReleased', p.x, p.y, { clickCount: 1 });
  await mouse('mousePressed', p.x, p.y, { clickCount: 2 });
  await mouse('mouseReleased', p.x, p.y, { clickCount: 2 });
  await sleep(100);
  w = await widths();
  check('duplo clique volta ao padrão', w.l === 256, JSON.stringify(w));

  await page.evaluate(`Studio.clear(); Studio.create('Slot', { name: 'S', x: 100, y: 100 }); document.getElementById('resizeRightPanel').focus(); true`);
  await page.evaluate(`document.getElementById('resizeRightPanel').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })), true`);
  w = await widths();
  const x = await page.evaluate(`Studio.get('S').x`);
  check('seta no teclado ajusta 16 px sem mover a seleção', w.r === 456 && x === 100, `${w.r} x=${x}`);

  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(200);
  w = await widths();
  check('janela estreita mantém o viewport com ≥ 360 px', w.v >= 360, JSON.stringify(w));
  await page.send('Emulation.clearDeviceMetricsOverride');
  await sleep(200);

  await page.evaluate(`setPanelWidth('left', 300); setPanelWidth('right', 400); saveEditorPrefs(); true`);
  await page.reload();
  w = await widths();
  check('larguras voltam iguais depois de recarregar', w.l === 300 && w.r === 400, JSON.stringify(w));

  const ruler = await page.evaluate(`(() => { const r = document.getElementById('rulerTop'); return Math.abs(r.width - r.getBoundingClientRect().width * devicePixelRatio) <= 2; })()`);
  check('régua acompanha a nova largura do viewport', ruler);

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
