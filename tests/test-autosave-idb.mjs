// Autosave em IndexedDB (R4): imagem > 5 MB, recarregar, aba escondida, migração do localStorage e plano B.
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('idb', 9339);

// Acesso direto ao banco, por uma conexão própria (a da página continua aberta).
const IDB_HELPERS = `
  window.__idb = (op, key, value) => new Promise((res, rej) => {
    const r = indexedDB.open('game_dev_ui_studio');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('autosave', op === 'get' ? 'readonly' : 'readwrite');
      const st = tx.objectStore('autosave');
      const q = op === 'get' ? st.get(key) : op === 'clear' ? st.clear() : st.put(value, key);
      tx.oncomplete = () => { res(q.result); db.close(); };
      tx.onerror = () => rej(tx.error);
    };
    r.onerror = () => rej(r.error);
  }); true`;

try {
  await page.open();
  await page.evaluate(IDB_HELPERS);

  // ---- A: autosave no IndexedDB, imagem > 5 MB, recarregar restaura ----
  const a = JSON.parse(await page.evaluate(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    Studio.clear();
    const cv = document.createElement('canvas'); cv.width = 1500; cv.height = 1500;
    const cx = cv.getContext('2d'); const img = cx.createImageData(1500, 1500);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (Math.random() * 256) | 0;
    cx.putImageData(img, 0, 0);
    const big = cv.toDataURL('image/png');
    const s = Studio.create('Slot', { name: 'Grande', x: 50, y: 50 });
    await Studio.setIcon(s, big);
    Studio.create('Painel', { name: 'Painel X', x: 400, y: 400 });
    await wait(900);
    const saved = await __idb('get', 'game_dev_ui_studio_autosave');
    return JSON.stringify({
      bigMB: big.length / 1048576,
      inIdb: !!saved && saved.components.some(c => c.name === 'Grande' && c.iconSrc === big),
      noIconObject: !!saved && saved.components.every(c => !('icon' in c)),
      noLocal: localStorage.getItem('game_dev_ui_studio_autosave') === null,
      noQuotaWarning: quotaWarningShown === false
    });
  })()`));
  check(`imagem de ${a.bigMB.toFixed(1)} MB (> 5 MB) no teste`, a.bigMB > 5);
  check('autosave gravado no IndexedDB com a imagem', a.inIdb);
  check('sem objeto Image no dado gravado', a.noIconObject);
  check('localStorage sem autosave', a.noLocal);
  check('sem aviso de cota', a.noQuotaWarning);

  await page.reload();
  await page.evaluate(IDB_HELPERS);
  const b = JSON.parse(await page.evaluate(`JSON.stringify({
    names: Studio.getAll().map(c => c.name),
    iconOk: (() => { const g = Studio.get('Grande'); return !!(g && g.icon && g.icon.naturalWidth === 1500); })()
  })`));
  check('recarregar restaura o projeto do IndexedDB', b.names.join() === 'Grande,Painel X', b.names.join());
  check('imagem grande reidratada', b.iconOk);

  // ---- B: gravação imediata ao esconder a aba ----
  const c = JSON.parse(await page.evaluate(`(async () => {
    Studio.create('Slot', { name: 'Antes de fechar' });
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 150));
    const saved = await __idb('get', 'game_dev_ui_studio_autosave');
    delete document.visibilityState;
    return JSON.stringify({ flushed: saved.components.some(c => c.name === 'Antes de fechar') });
  })()`));
  check('aba escondida grava antes dos 500 ms', c.flushed);

  // ---- C: migração do localStorage ----
  await page.evaluate(`(async () => {
    await new Promise(r => setTimeout(r, 700));
    await __idb('clear');
    localStorage.setItem('game_dev_ui_studio_autosave', JSON.stringify({
      version: '1.2', canvasWidth: 1920, canvasHeight: 1080, nextId: 3, groups: [], nextGroupId: 1,
      components: [{ id: 1, type: 'Slot', name: 'Legado A', x: 10, y: 10, w: 96, h: 96 }, { id: 2, type: 'Anel', name: 'Legado B', x: 200, y: 10, w: 120, h: 120, text: '75' }]
    }));
    return true;
  })()`);
  await page.reload();
  await page.evaluate(IDB_HELPERS);
  const d = JSON.parse(await page.evaluate(`(async () => {
    const saved = await __idb('get', 'game_dev_ui_studio_autosave');
    return JSON.stringify({
      names: Studio.getAll().map(c => c.name),
      oldRingKeepsText: Studio.get('Legado B').text === '75' && Studio.get('Legado B').ringShowValue === false,
      migrated: !!saved && saved.components.map(c => c.name).join() === 'Legado A,Legado B',
      localRemoved: localStorage.getItem('game_dev_ui_studio_autosave') === null
    });
  })()`));
  check('projeto antigo do localStorage abre', d.names.join() === 'Legado A,Legado B', d.names.join());
  check('migração grava no IndexedDB', d.migrated);
  check('chave antiga do localStorage apagada', d.localRemoved);
  check('Anel antigo mantém o texto', d.oldRingKeepsText);

  // ---- D: plano B sem IndexedDB ----
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });` });
  await page.reload();
  const e = JSON.parse(await page.evaluate(`(async () => {
    Studio.clear();
    Studio.create('Botão', { name: 'Sem IDB' });
    await new Promise(r => setTimeout(r, 900));
    const raw = localStorage.getItem('game_dev_ui_studio_autosave');
    return JSON.stringify({ noIdb: window.indexedDB === undefined, local: !!raw && JSON.parse(raw).components.some(c => c.name === 'Sem IDB') });
  })()`));
  check('plano B: página sem IndexedDB', e.noIdb);
  check('plano B: autosave vai para o localStorage', e.local);
  await page.reload();
  await sleep(200);
  const f = await page.evaluate(`Studio.getAll().map(c => c.name).join()`);
  check('plano B: recarregar restaura do localStorage', f === 'Sem IDB', f);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
