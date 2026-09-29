// R5: seleção por retângulo, trancar camada e arrastar na lista de camadas.
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('selection', 9340);

// Converte coordenadas da cena (px 1080p) para coordenadas de tela, para o mouse real do DevTools.
const toClient = async (x, y) => JSON.parse(await page.evaluate(`(() => {
  const r = document.getElementById('mainCanvas').getBoundingClientRect();
  return JSON.stringify({ x: r.left + ${x} * r.width / state.canvasWidth, y: r.top + ${y} * r.height / state.canvasHeight });
})()`));
const mouse = (type, p, modifiers = 0, buttons = 0) => page.send('Input.dispatchMouseEvent', {
  type, x: p.x, y: p.y, button: 'left', buttons, clickCount: 1, modifiers
});
async function dragScene(from, to, modifiers = 0) {
  const a = await toClient(from.x, from.y);
  const b = await toClient(to.x, to.y);
  await mouse('mousePressed', a, modifiers, 1);
  for (let i = 1; i <= 5; i++) await mouse('mouseMoved', { x: a.x + (b.x - a.x) * i / 5, y: a.y + (b.y - a.y) * i / 5 }, modifiers, 1);
  await mouse('mouseReleased', b, modifiers, 0);
  await sleep(50);
}
const selectedNames = () => page.evaluate(`Studio.getSelected().map(c => c.name).sort().join()`);

try {
  await page.open();
  await page.evaluate(`(() => {
    Studio.clear();
    Studio.create('Painel', { name: 'Fundo', x: 0, y: 0, w: 1920, h: 1080, locked: true });
    Studio.create('Slot', { name: 'A', x: 100, y: 100, w: 96, h: 96 });
    Studio.create('Slot', { name: 'B', x: 300, y: 100, w: 96, h: 96 });
    Studio.create('Slot', { name: 'Tranca', x: 250, y: 220, w: 40, h: 40, locked: true });
    Studio.create('Slot', { name: 'Oculto', x: 150, y: 220, w: 40, h: 40, visible: false });
    Studio.create('Slot', { name: 'C', x: 1000, y: 600, w: 96, h: 96, rotation: 45 });
    Studio.select([]);
    return true;
  })()`);
  await sleep(700);
  const undoLen0 = await page.evaluate(`history.undo.length`);

  // ---- Seleção por retângulo ----
  await dragScene({ x: 50, y: 50 }, { x: 420, y: 280 });
  check('retângulo seleciona o que cruza (A, B)', (await selectedNames()) === 'A,B', await selectedNames());
  check('retângulo ignora trancado e oculto', !(await selectedNames()).includes('Tranca') && !(await selectedNames()).includes('Oculto'));
  check('retângulo não arrasta o fundo trancado', await page.evaluate(`Studio.get('Fundo').x === 0 && Studio.get('Fundo').y === 0`));
  check('caixa do retângulo some ao soltar', await page.evaluate(`document.getElementById('marqueeBox').classList.contains('hidden')`));
  // A caixa girada de C (45°) passa de x = 1000; um retângulo que só pega a quina já seleciona.
  await dragScene({ x: 900, y: 500 }, { x: 990, y: 650 }, 8 /* Shift */);
  check('Shift + retângulo soma à seleção (considera rotação)', (await selectedNames()) === 'A,B,C', await selectedNames());
  check('Inspector mostra o principal da seleção nova', await page.evaluate(`document.getElementById('propName').value === Studio.get(state.selectedId).name`));
  check('lista de camadas marca os selecionados', await page.evaluate(`['A', 'B', 'C'].every(n => document.querySelector('#layersList [data-id="' + Studio.get(n).id + '"]').className.includes('bg-figma-accent'))`));
  const p = await toClient(700, 900);
  await mouse('mousePressed', p, 0, 1);
  await mouse('mouseReleased', p, 0, 0);
  await sleep(50);
  check('clique simples no vazio limpa a seleção', (await selectedNames()) === '');
  await sleep(700);
  check('retângulo não cria passo de histórico', (await page.evaluate(`history.undo.length`)) === undoLen0);

  // ---- Trancar ----
  const clickLocked = await toClient(270, 240);
  await mouse('mousePressed', clickLocked, 0, 1);
  await mouse('mouseMoved', { x: clickLocked.x + 40, y: clickLocked.y + 40 }, 0, 1);
  await mouse('mouseReleased', { x: clickLocked.x + 40, y: clickLocked.y + 40 }, 0, 0);
  await sleep(50);
  check('clique em item trancado atravessa (não seleciona nem move)', await page.evaluate(`Studio.get('Tranca').x === 250 && !Studio.getSelected().some(c => c.name === 'Tranca')`));
  const lockState = JSON.parse(await page.evaluate(`(() => {
    Studio.select(['A', 'Tranca']);
    const a = Studio.get('A'), l = Studio.get('Tranca');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    const nudged = a.x === 110 && l.x === 250;
    return JSON.stringify({ nudged, gizmoLocked: document.getElementById('gizmoBox').classList.contains('gizmo-locked') });
  })()`));
  check('setas movem só os destrancados', lockState.nudged);
  check('principal trancado: gizmo tracejado, sem alças', lockState.gizmoLocked);
  await page.evaluate(`Studio.select(['Tranca', 'A']); true`);
  await dragScene({ x: 150, y: 150 }, { x: 200, y: 150 });
  check('arrastar a seleção deixa o trancado parado', await page.evaluate(`Studio.get('A').x >= 150 && Studio.get('Tranca').x === 250`),
    await page.evaluate(`Studio.get('A').x + '/' + Studio.get('Tranca').x`));
  const lockUi = JSON.parse(await page.evaluate(`(() => {
    const row = document.querySelector('#layersList [data-id="' + Studio.get('B').id + '"]');
    const btns = row.querySelectorAll('button');
    btns[0].click(); // cadeado vem antes do olho
    const locked = Studio.get('B').locked === true;
    const row2 = document.querySelector('#layersList [data-id="' + Studio.get('B').id + '"]');
    row2.querySelectorAll('button')[0].click();
    return JSON.stringify({ locked, unlocked: Studio.get('B').locked === false });
  })()`));
  check('cadeado na lista tranca', lockUi.locked);
  check('cadeado na lista destranca', lockUi.unlocked);
  check('locked vem de COMPONENT_DEFAULTS (projetos antigos)', await page.evaluate(`normalizeComponent({ id: 1, type: 'Slot' }).locked === false`));

  // ---- Arrastar na lista de camadas ----
  const dnd = JSON.parse(await page.evaluate(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const o = {};
    Studio.clear();
    ['P1', 'P2', 'P3', 'P4'].forEach((n, i) => Studio.create('Slot', { name: n, x: 100 + i * 120, y: 100 }));
    Studio.select([]);
    const row = (n) => document.querySelector('#layersList [data-id="' + Studio.get(n).id + '"]');
    const order = () => Studio.getAll().map(c => c.name).join();
    const drag = (src, dst, upper) => {
      const dt = new DataTransfer();
      src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
      const r = dst.getBoundingClientRect();
      const y = upper ? r.top + 2 : r.bottom - 2;
      dst.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, clientY: y }));
      dst.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientY: y }));
      src.dispatchEvent(new DragEvent('dragend', { dataTransfer: dt, bubbles: true }));
    };
    await wait(700);
    o.rowsDraggable = row('P1').draggable === true;

    drag(row('P1'), row('P4'), true);          // P1 para a frente de P4 (topo)
    o.toFront = order() === 'P2,P3,P4,P1';
    await wait(700);
    Studio.undo();
    o.undoRestores = order() === 'P1,P2,P3,P4';
    await wait(700);

    drag(row('P4'), row('P1'), false);         // P4 para trás de P1 (fundo)
    o.toBack = order() === 'P4,P1,P2,P3';

    Studio.group(['P2', 'P3'], 'G');
    Studio.select([]);                         // agrupar deixa P2/P3 selecionados; arrastar item selecionado leva a seleção
    drag(row('P4'), row('P2'), false);         // soltar sobre membro = entra no grupo
    const g = Studio.get('P2').groupId;
    o.joinsGroup = Studio.get('P4').groupId === g && order() === 'P1,P4,P2,P3';

    drag(row('P3'), row('P1'), true);          // soltar fora = sai do grupo
    o.leavesGroup = Studio.get('P3').groupId === null && order() === 'P1,P3,P4,P2';

    const header = (n) => row(n).parentElement.parentElement.firstElementChild;
    drag(row('P1'), header('P2'), true);       // soltar no cabeçalho = topo do grupo
    o.dropOnHeader = Studio.get('P1').groupId === g && order() === 'P3,P4,P2,P1';

    drag(header('P2'), row('P3'), false);      // arrastar o grupo inteiro mantém o grupo
    o.groupDragKeepsGroup = order() === 'P4,P2,P1,P3' && ['P4', 'P2', 'P1'].every(n => Studio.get(n).groupId === g);

    Studio.select(['P4', 'P2']);
    drag(row('P4'), row('P3'), true);          // arrastar item selecionado leva a seleção junto
    o.movesSelection = order() === 'P1,P3,P4,P2' && Studio.get('P4').groupId === null && Studio.get('P2').groupId === null;
    o.emptyGroupPruned = Studio.get('P1').groupId === g && state.groups.length === 1;
    Studio.ungroup(g);
    drag(row('P1'), row('P3'), false);
    o.emptyGroupPrunedAfterLastLeaves = state.groups.length === 0;

    // Um drop que não veio de um arrasto da lista (ex.: arquivo do Windows) não reordena nada.
    const before = order();
    const osDrop = new DataTransfer();
    row('P2').dispatchEvent(new DragEvent('drop', { dataTransfer: osDrop, bubbles: true, cancelable: true, clientY: 0 }));
    o.foreignDropIgnored = order() === before;
    o.finalOrder = order();
    return JSON.stringify(o);
  })()`));
  const finalOrder = dnd.finalOrder;
  delete dnd.finalOrder;
  for (const [k, v] of Object.entries(dnd)) check(`lista: ${k}`, v, `ordem final ${finalOrder}`);
  const searchDrag = await page.evaluate(`(() => {
    const input = document.getElementById('layerSearchInput') || document.querySelector('input[placeholder*="Buscar"], input[placeholder*="Search"]');
    if (!input) return 'sem campo de busca';
    input.value = 'P'; input.dispatchEvent(new Event('input', { bubbles: true }));
    const r = document.querySelector('#layersList [data-id]');
    const ok = r && r.draggable === false;
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
    return ok ? 'ok' : 'arrastável na busca';
  })()`);
  check('na busca as linhas não arrastam', searchDrag === 'ok', searchDrag);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
