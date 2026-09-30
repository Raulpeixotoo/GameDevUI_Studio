// Mesclar camadas (Ctrl+E) e Importar layout para a cena (R7).
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('merge-import', 9352);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);

try {
  await page.open();

  // ---------- Mesclar ----------
  let r = await j(`
    Studio.clear();
    const a = Studio.create('Botão', { name: 'A', x: 100, y: 100, w: 200, h: 60 });
    const b = Studio.create('Slot', { name: 'B', x: 250, y: 120, w: 96, h: 96 });
    const top = Studio.create('Painel', { name: 'Topo', x: 900, y: 600, w: 100, h: 100 });
    const hid = Studio.create('Slot', { name: 'Oculto', x: 0, y: 0, visible: false });
    return { ids: [a.id, b.id, top.id, hid.id], union: unionAABB([a, b]) };
  `);
  await sleep(700); // fecha o passo de histórico da criação
  const m = await j(`
    const merged = await Studio.merge(['A', 'B', 'Oculto']);
    const names = Studio.getAll().map(c => c.name);
    return {
      name: merged.name, type: merged.type, x: merged.x, y: merged.y, w: merged.w, h: merged.h,
      src: merged.iconSrc.slice(0, 22), natW: merged.icon.naturalWidth, natH: merged.icon.naturalHeight,
      fit: merged.iconFit, shadow: merged.dropShadow, fill: merged.fillOpacity, border: merged.borderWidth,
      names, selected: Studio.getSelected().map(c => c.id), mergedId: merged.id
    };
  `);
  check('mesclar cria um item com imagem PNG', m.type === 'Slot' && m.src === 'data:image/png;base64,' && m.fit === 'stretch', JSON.stringify(m));
  check('item mesclado sem fundo, borda nem sombra própria', m.fill === 0 && m.border === 0 && m.shadow === false);
  check('originais visíveis saem, oculto fica', !m.names.includes('A') && !m.names.includes('B') && m.names.includes('Oculto'), m.names.join(','));
  check('mesclado ocupa o lugar do mais alto na pilha (Topo continua acima)', m.names.indexOf(m.name) < m.names.indexOf('Topo'), m.names.join(','));
  check('caixa inclui a sombra (maior que a união dos itens)', m.x <= r.union.x && m.y <= r.union.y && m.x + m.w >= r.union.x + r.union.w && m.y + m.h > r.union.y + r.union.h, JSON.stringify({ m, u: r.union }));
  check('imagem em 2x do tamanho do item', m.natW === m.w * 2 && m.natH === m.h * 2, `${m.natW}x${m.natH} para ${m.w}x${m.h}`);
  check('mesclado fica selecionado', m.selected.length === 1 && m.selected[0] === m.mergedId);

  const u = await j(`Studio.undo(); return Studio.getAll().map(c => c.name);`);
  check('um Ctrl+Z traz os originais de volta', u.includes('A') && u.includes('B') && !u.some(n => n.startsWith('Mesclado')), u.join(','));

  const one = await j(`Studio.select('A'); const before = Studio.getAll().length; const res = await Studio.merge(); return { res, same: Studio.getAll().length === before };`);
  check('com 1 item não mescla nada', one.res === null && one.same);

  const grp = await j(`
    Studio.clear();
    const x = Studio.create('Slot', { name: 'G1', x: 100, y: 100 });
    const y = Studio.create('Slot', { name: 'G2', x: 220, y: 100 });
    Studio.group([x, y], 'Grupo X');
    const gid = x.groupId;
    const mm = await Studio.merge([x, y]);
    return { same: mm.groupId === gid && gid !== null, groups: state.groups.length };
  `);
  check('mesclar dentro de um grupo mantém o grupo', grp.same && grp.groups === 1, JSON.stringify(grp));

  const key = await j(`
    Studio.clear();
    Studio.create('Slot', { name: 'K1', x: 100, y: 100 });
    Studio.create('Slot', { name: 'K2', x: 300, y: 100 });
    Studio.select(['K1', 'K2']);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    return Studio.getAll().map(c => c.name);
  `);
  check('Ctrl+E mescla a seleção', key.length === 1 && key[0].startsWith('Mesclado'), key.join(','));

  // ---------- Importar para a cena ----------
  const imp = await j(`
    Studio.clear();
    Studio.create('Painel', { name: 'Existente', x: 10, y: 10 });
    const layout = {
      canvasWidth: 1920, canvasHeight: 1080, nextId: 3,
      groups: [{ id: 1, name: 'Importado' }],
      components: [
        { id: 1, type: 'Botão', name: 'I1', x: 100, y: 200, w: 200, h: 50, groupId: 1 },
        { id: 2, type: 'Slot', name: 'I2', x: 400, y: 200, w: 96, h: 96, groupId: 1 }
      ]
    };
    const added = await Studio.importLayout(layout);
    const all = Studio.getAll();
    return {
      names: all.map(c => c.name), ids: all.map(c => c.id),
      pos: added.map(c => [c.x, c.y, c.w, c.h]),
      sameGroup: added[0].groupId === added[1].groupId && added[0].groupId !== null,
      groupName: (state.groups.find(g => g.id === added[0].groupId) || {}).name,
      selected: Studio.getSelected().map(c => c.name)
    };
  `);
  check('importar soma à cena (não substitui)', imp.names.join(',') === 'Existente,I1,I2', imp.names.join(','));
  check('ids únicos após importar', new Set(imp.ids).size === imp.ids.length, imp.ids.join(','));
  check('mesma resolução: posições 1:1', JSON.stringify(imp.pos) === '[[100,200,200,50],[400,200,96,96]]', JSON.stringify(imp.pos));
  check('grupo do layout recriado', imp.sameGroup && imp.groupName === 'Importado');
  check('itens importados ficam selecionados', imp.selected.join(',') === 'I1,I2');

  const sc = await j(`
    Studio.clear();
    const added = await Studio.importLayout({
      canvasWidth: 1280, canvasHeight: 720,
      components: [{ id: 5, type: 'Texto', name: 'T', x: 640, y: 360, w: 100, h: 40, fontSize: 20, radius: 4 }]
    });
    const c = added[0];
    return [c.x, c.y, c.w, c.h, c.fontSize, c.radius];
  `);
  check('720p em cena 1080p: escala 1,5', JSON.stringify(sc) === '[960,540,150,60,30,6]', JSON.stringify(sc));

  const portrait = await j(`
    Studio.clear();
    const added = await Studio.importLayout({ canvasWidth: 1080, canvasHeight: 1920,
      components: [{ id: 1, type: 'Slot', name: 'P', x: 0, y: 0, w: 1080, h: 1920 }] });
    const c = added[0];
    return [c.x, c.y, c.w, c.h];
  `);
  check('retrato em cena paisagem: cabe e centraliza', JSON.stringify(portrait) === '[656,0,608,1080]', JSON.stringify(portrait));

  const evil = await j(`
    Studio.clear();
    const added = await Studio.importLayout({ components: [
      { id: 1, type: 'Slot', name: 'Mal', x: '10', y: 10, fillColor1: '"><img src=x onerror=alert(1)>', iconSrc: 'https://tracker.example/p.png' },
      { id: 2, type: 'Hacker', name: 'TipoInvalido' }
    ] });
    return { n: added.length, color: added[0].fillColor1, icon: added[0].iconSrc, x: added[0].x };
  `);
  check('import passa pela sanitização (cor, URL externa, tipo inválido)', evil.n === 1 && evil.color === '#262938' && evil.icon === null && evil.x === 10, JSON.stringify(evil));

  const bad = await j(`try { await Studio.importLayout({ foo: 1 }); return 'ok'; } catch (e) { return 'erro'; }`);
  check('layout sem componentes é recusado', bad === 'erro');

  const drop = await j(`
    Studio.clear();
    Studio.create('Slot', { name: 'Base' });
    const file = new File([JSON.stringify({ canvasWidth: 1920, canvasHeight: 1080, components: [{ id: 1, type: 'Slot', name: 'Solto', x: 50, y: 50 }] })], 'layout.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('viewportContainer').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: 500, clientY: 400 }));
    await new Promise(r => setTimeout(r, 500));
    return { names: Studio.getAll().map(c => c.name), ref: !!state.reference.src };
  `);
  check('soltar .json no canvas importa para a cena', drop.names.join(',') === 'Base,Solto' && !drop.ref, JSON.stringify(drop));

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
