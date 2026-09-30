// Âncoras (R8; TDD no DOCS 2.9): padrão não muda nada, math de Unity/Unreal/Godot recompõe o rect,
// prévia responsiva, Auto, Inspector, .tscn com layout por âncoras e undo num passo.
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('anchors', 9368);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);

try {
  await page.open();

  // Recompõe o retângulo a partir de cada formato e compara com o original, para as 16 combinações.
  const math = await j(`
    const W = 1920, H = 1080, rect = { x: 1500, y: 800, w: 300, h: 120 }, tex = { x: 1468, y: 768, w: 364, h: 184 };
    const bad = [];
    for (const ah of ANCHOR_H) for (const av of ANCHOR_V) {
      const a = describeAnchors({ anchorH: ah, anchorV: av }, rect, tex, W, H);
      const u = a.unity;
      const uL = u.anchorMin.x * W + u.offsetMin.x, uR = u.anchorMax.x * W + u.offsetMax.x;
      const uB = u.anchorMin.y * H + u.offsetMin.y, uT = u.anchorMax.y * H + u.offsetMax.y;
      const unityRect = [uL, H - uT, uR - uL, uT - uB];
      const r = a.unreal, o = r.offsets;
      const ux = r.minimum.x === r.maximum.x ? [r.minimum.x * W + o.left - r.alignment.x * o.right, o.right] : [o.left, W - o.left - o.right];
      const uy = r.minimum.y === r.maximum.y ? [r.minimum.y * H + o.top - r.alignment.y * o.bottom, o.bottom] : [o.top, H - o.top - o.bottom];
      const g = a.godot;
      const gRect = [g.anchor_left * W + g.offset_left, g.anchor_top * H + g.offset_top, g.anchor_right * W + g.offset_right - (g.anchor_left * W + g.offset_left), g.anchor_bottom * H + g.offset_bottom - (g.anchor_top * H + g.offset_top)];
      const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.01);
      if (!same(unityRect, [rect.x, rect.y, rect.w, rect.h])) bad.push(ah + '/' + av + ' unity ' + unityRect);
      if (!same([ux[0], uy[0], ux[1], uy[1]], [rect.x, rect.y, rect.w, rect.h])) bad.push(ah + '/' + av + ' unreal ' + [ux, uy]);
      if (!same(gRect, [tex.x, tex.y, tex.w, tex.h])) bad.push(ah + '/' + av + ' godot ' + gRect);
    }
    const br = describeAnchors({ anchorH: 'right', anchorV: 'bottom' }, rect, tex, W, H);
    return { bad, br };
  `);
  check('Unity, Unreal e Godot recompõem o retângulo nas 16 combinações', math.bad.length === 0, math.bad.slice(0, 4).join(' | '));
  check('direita/base no Unity: âncora (1,0) e pivô (1,0)', JSON.stringify(math.br.unity.anchorMin) === '{"x":1,"y":0}' && JSON.stringify(math.br.unity.pivot) === '{"x":1,"y":0}', JSON.stringify(math.br.unity));

  const lay = await j(`
    Studio.clear();
    const def = Studio.create('Slot', { name: 'Padrão', x: 100, y: 100 });
    const r = Studio.create('Botão', { name: 'Direita', x: 1700, y: 40, w: 200, h: 50, anchorH: 'right' });
    const c = Studio.create('Painel', { name: 'Centro', x: 760, y: 400, w: 400, h: 280, anchorH: 'center', anchorV: 'middle' });
    const s = Studio.create('Barra', { name: 'Esticada', x: 40, y: 1040, w: 1840, h: 20, anchorH: 'stretch', anchorV: 'bottom' });
    await new Promise(res => setTimeout(res, 700));
    const sel = document.getElementById('canvasResSelect'); sel.value = '2560x1440'; sel.dispatchEvent(new Event('change'));
    const after = Studio.getAll().map(x => [x.name, x.x, x.y, x.w, x.h]);
    await new Promise(res => setTimeout(res, 700));
    Studio.undo();
    const undone = { res: state.canvasWidth + 'x' + state.canvasHeight, items: Studio.getAll().map(x => [x.name, x.x, x.y, x.w, x.h]) };
    return { after, undone };
  `);
  const A = Object.fromEntries(lay.after.map(([n, ...r]) => [n, r]));
  check('padrão (esquerda/topo) não se move', JSON.stringify(A['Padrão'].slice(0, 2)) === '[100,100]', JSON.stringify(A['Padrão']));
  check('âncora direita mantém 20 px da borda', A['Direita'][0] + A['Direita'][2] === 2560 - 20 && A['Direita'][1] === 40, JSON.stringify(A['Direita']));
  check('centro/meio continua centralizado', A['Centro'][0] + A['Centro'][2] / 2 === 1280 && A['Centro'][1] + A['Centro'][3] / 2 === 720, JSON.stringify(A['Centro']));
  check('esticar mantém as margens e muda a largura; base mantém 20 px', A['Esticada'][0] === 40 && A['Esticada'][2] === 2560 - 80 && A['Esticada'][1] === 1440 - 40, JSON.stringify(A['Esticada']));
  check('um Ctrl+Z desfaz resolução e reposicionamento juntos', lay.undone.res === '1920x1080' && JSON.stringify(lay.undone.items.find(i => i[0] === 'Direita')) === '["Direita",1700,40,200,50]', JSON.stringify(lay.undone));

  const load = await j(`
    Studio.clear();
    Studio.create('Botão', { name: 'R', x: 1700, y: 40, anchorH: 'right' });
    const data = JSON.parse(JSON.stringify(getSerializedProjectData()));
    data.canvasWidth = 2560; data.canvasHeight = 1440;
    await loadProjectFromData(data);
    const bad = normalizeComponent({ id: 7, type: 'Slot', name: 'x', anchorH: 'diagonal', anchorV: 42 });
    return { x: Studio.get('R').x, anchor: Studio.get('R').anchorH, bad: [bad.anchorH, bad.anchorV] };
  `);
  check('abrir projeto não reposiciona e mantém a âncora', load.x === 1700 && load.anchor === 'right', JSON.stringify(load));
  check('âncora inválida vira o padrão', load.bad.join() === 'left,top', load.bad.join());

  const auto = await j(`
    await loadProjectFromData({ canvasWidth: 1920, canvasHeight: 1080, components: [] });
    const a = Studio.create('Slot', { name: 'TL', x: 40, y: 40, w: 96, h: 96 });
    const b = Studio.create('Slot', { name: 'BR', x: 1780, y: 940, w: 96, h: 96 });
    const c = Studio.create('Painel', { name: 'Mid', x: 800, y: 450, w: 300, h: 200 });
    const d = Studio.create('Barra', { name: 'Full', x: 20, y: 500, w: 1880, h: 20 });
    Studio.select([a, b, c, d]);
    document.getElementById('btnAutoAnchor').click();
    return Studio.getAll().map(x => x.name + ':' + x.anchorH + '/' + x.anchorV);
  `);
  check('Auto escolhe pelos terços e estica o que ocupa a largura', auto.join() === 'TL:left/top,BR:right/bottom,Mid:center/middle,Full:stretch/middle', auto.join());

  const insp = await j(`
    Studio.clear();
    const c = Studio.create('Slot', { name: 'I' });
    Studio.select(c);
    const h = document.getElementById('propAnchorH'); h.value = 'right'; h.dispatchEvent(new Event('change', { bubbles: true }));
    const v = document.getElementById('propAnchorV'); v.value = 'stretch'; v.dispatchEvent(new Event('change', { bubbles: true }));
    return [c.anchorH, c.anchorV, Studio.toScript(c).includes('anchorH: "right"')];
  `);
  check('Inspector edita a âncora e o script da seleção leva junto', insp.join() === 'right,stretch,true', insp.join());

  const zip = await j(`
    const blobs = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { blobs.push(b); return orig(b); };
    HTMLAnchorElement.prototype.click = function () {};
    Studio.clear();
    Studio.create('Slot', { name: 'Fixo', x: 100, y: 100 });
    Studio.create('Botão', { name: 'Pausa', x: 1700, y: 40, w: 180, h: 60, anchorH: 'right' });
    document.getElementById('btnExportBatch').click();
    for (let i = 0; i < 150 && !blobs.some(b => b.type === 'application/zip'); i++) await new Promise(r => setTimeout(r, 200));
    const z = await JSZip.loadAsync(blobs.find(b => b.type === 'application/zip'));
    const tscn = await z.file('GameUI_Godot/game_ui.tscn').async('string');
    const m = JSON.parse(await z.file('GameUI_1080p_Assets/ui_engine_manifest.json').async('string'));
    const block = (name) => tscn.split('\\n\\n').find(b => b.startsWith('[node name="' + name + '"'));
    return { fixo: block('Fixo'), pausa: block('Pausa'), anchors: m.assets.map(a => a.anchors && a.anchors.horizontal) };
  `);
  check('.tscn: item padrão continua com layout_mode = 0', zip.fixo.includes('layout_mode = 0') && !zip.fixo.includes('anchor_left'), zip.fixo);
  check('.tscn: item ancorado à direita usa âncoras e cresce para a esquerda', zip.pausa.includes('layout_mode = 1') && zip.pausa.includes('anchor_left = 1.0') && zip.pausa.includes('grow_horizontal = 0'), zip.pausa);
  check('manifest leva o bloco anchors de todo asset', zip.anchors.join() === 'left,right', zip.anchors.join());

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
