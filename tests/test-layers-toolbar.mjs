// Barra das camadas (R8): cabe no painel em qualquer largura (relato do autor: ícones saíam para fora)
// e o botão/atalho de bloquear a seleção.
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('layers-toolbar', 9371);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);

try {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await page.open();

  for (const w of [200, 256, 480]) {
    const fit = await j(`
      setPanelWidth('left', ${w});
      await new Promise(r => setTimeout(r, 50));
      const panel = document.getElementById('leftPanel').getBoundingClientRect();
      const bar = document.getElementById('layerToolbar').getBoundingClientRect();
      const btns = [...document.querySelectorAll('#layerToolbar button')].map(b => b.getBoundingClientRect());
      const title = document.querySelector('#leftPanel [data-i18n-key="Camadas da Cena"]').getBoundingClientRect();
      return { n: btns.length, inside: btns.every(b => b.left >= bar.left && b.right <= bar.right + 0.5) && bar.right <= panel.right,
        oneRow: new Set(btns.map(b => Math.round(b.top))).size === 1, titleOneLine: title.height <= 20 };
    `);
    check(`barra das camadas cabe em ${w}px (8 botões numa linha, título numa linha)`, fit.n === 8 && fit.inside && fit.oneRow && fit.titleOneLine, JSON.stringify(fit));
  }

  const lock = await j(`
    setPanelWidth('left', 256);
    Studio.clear();
    const a = Studio.create('Slot', { name: 'A', x: 100, y: 100 }), b = Studio.create('Slot', { name: 'B', x: 300, y: 100 });
    const btn = document.getElementById('btnLockLayers');
    Studio.select([a, b]);
    btn.click();
    const locked = [a.locked, b.locked, btn.classList.contains('active')];
    const hit = hitTest(a.x + 10, a.y + 10);
    btn.click();
    const unlocked = [a.locked, b.locked, btn.classList.contains('active')];
    a.locked = true; Studio.select([a, b]); renderLayersList();
    const mixedActive = btn.classList.contains('active');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'L', ctrlKey: true, shiftKey: true, bubbles: true }));
    const viaKey = [a.locked, b.locked, btn.classList.contains('active')];
    return { locked, hit: hit ? hit.name : null, unlocked, mixedActive, viaKey };
  `);
  check('botão bloqueia a seleção e fica aceso', lock.locked.join() === 'true,true,true', JSON.stringify(lock));
  check('item bloqueado não é pego pelo clique no canvas', lock.hit === null, String(lock.hit));
  check('segundo clique desbloqueia', lock.unlocked.join() === 'false,false,false', JSON.stringify(lock.unlocked));
  check('seleção mista: botão apagado e Ctrl+Shift+L bloqueia todos', !lock.mixedActive && lock.viaKey.join() === 'true,true,true', JSON.stringify(lock));

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
