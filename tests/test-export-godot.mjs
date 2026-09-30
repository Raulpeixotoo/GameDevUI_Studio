// Export em lote (R4): manifest v5, pasta GameUI_Godot e estrutura do game_ui.tscn; opção de número do Anel.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('godot', 9337);
try {
  await page.open();
  const out = JSON.parse(await page.evaluate(`(async () => {
    const blobs = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { blobs.push(b); return orig(b); };
    HTMLAnchorElement.prototype.click = function () {};
    Studio.clear();
    Studio.create('Slot', { name: 'Slot A', x: 100, y: 100, w: 96, h: 96 });
    Studio.create('Botão', { name: 'Botão "Equipar"', x: 840, y: 575, w: 240, h: 56, text: 'EQUIPAR', exportWithText: false, rotation: 15, textStrokeWidth: 2 });
    Studio.create('Barra', { name: 'HP', x: 100, y: 900, w: 400, h: 32, barValue: 60, barDirection: 'rtl' });
    Studio.create('Anel', { name: 'Cooldown', x: 600, y: 600, w: 120, h: 120 });
    Studio.text('Olá\\nmundo', { name: 'Título', exportWithText: false });
    Studio.text('Baked', { name: 'Título' });
    Studio.create('Forma', { name: 'a.b:c@d/e%f', visible: false });
    Studio.createGrid({ rows: 1, cols: 3, size: 64, name: 'Hot', group: 'Hotbar' });
    document.getElementById('btnExportBatch').click();
    for (let i = 0; i < 150 && !blobs.some(b => b.type === 'application/zip'); i++) await new Promise(r => setTimeout(r, 200));
    const z = await JSZip.loadAsync(blobs.find(b => b.type === 'application/zip'));
    return JSON.stringify({
      files: Object.keys(z.files),
      tscn: await z.file('GameUI_Godot/game_ui.tscn').async('string'),
      manifest: JSON.parse(await z.file('GameUI_1080p_Assets/ui_engine_manifest.json').async('string')),
      count: Studio.getAll().length
    });
  })()`));
  const { files, tscn, manifest } = out;

  // ---- manifest v5 ----
  check('manifestVersion = 6', manifest.manifestVersion === 6);
  check('manifest.godot.projectSettings 1920x1080', manifest.godot.projectSettings['display/window/size/viewport_width'] === 1920);
  check('todo asset tem godotSettings e engines', manifest.assets.every(a => a.godotSettings && a.engines));
  check('campos v4 preservados', manifest.assets.every(a => a.unitySettings && a.unrealSettings && a.nineSlice));
  const byName = (n) => manifest.assets.find(a => a.name === n);
  check('Slot → NinePatchRect', byName('Slot A').godotSettings.node === 'NinePatchRect');
  check('Botão → Button', byName('Botão "Equipar"').godotSettings.node === 'Button');
  check('Barra → TextureProgressBar, rtl = fill_mode 1', byName('HP').godotSettings.node === 'TextureProgressBar' && byName('HP').godotSettings.fillMode === 1);
  check('Anel → TextureRect sem patchMargin', byName('Cooldown').godotSettings.node === 'TextureRect' && byName('Cooldown').godotSettings.patchMargin === null);
  const slotA = byName('Slot A');
  const ns = slotA.nineSlice;
  check('patchMargin = nineSlice', JSON.stringify(slotA.godotSettings.patchMargin) === JSON.stringify({ left: ns.left, top: ns.top, right: ns.right, bottom: ns.bottom }));
  check('Defold slice9 = [L,T,R,B]', JSON.stringify(slotA.engines.defold.slice9) === JSON.stringify([ns.left, ns.top, ns.right, ns.bottom]));
  check('Godot position = texturePositionInScene', slotA.godotSettings.position.x === slotA.texturePositionInScene.x && slotA.godotSettings.size.x === slotA.textureSize.width);
  check('rotação 15° → 0.261799 rad', Math.abs(byName('Botão "Equipar"').godotSettings.rotationRadians - 0.261799) < 1e-5);

  // ---- ZIP ----
  check('pasta GameUI_Godot com game_ui.tscn', files.includes('GameUI_Godot/game_ui.tscn'));
  check('Barra: track e fill na pasta Godot', files.includes('GameUI_Godot/hp_track.png') && files.includes('GameUI_Godot/hp_fill.png'));
  check('Texto fora do PNG não gera textura Godot', !files.some(f => f.startsWith('GameUI_Godot/t_tulo.png')));

  // ---- .tscn: estrutura ----
  const lines = tscn.split('\n');
  const badLines = lines.filter(l => l && !/^\[.*\]$/.test(l) && !/^[a-z_\/0-9]+ = .+$/.test(l));
  check('toda linha é [seção] ou chave = valor', badLines.length === 0, badLines.join(' | '));
  check('cabeçalho gd_scene format=3', lines[0].startsWith('[gd_scene ') && lines[0].includes('format=3'));
  const extIds = [...tscn.matchAll(/\[ext_resource type="Texture2D" path="res:\/\/([^"]+)" id="([^"]+)"\]/g)];
  const subIds = [...tscn.matchAll(/\[sub_resource type="\w+" id="([^"]+)"\]/g)].map(m => m[1]);
  const loadSteps = +lines[0].match(/load_steps=(\d+)/)[1];
  check('load_steps = ext + sub + 1', loadSteps === extIds.length + subIds.length + 1, `${loadSteps} vs ${extIds.length}+${subIds.length}+1`);
  check('todo ext_resource aponta para arquivo do ZIP', extIds.every(m => files.includes(m[1])), extIds.map(m => m[1]).filter(f => !files.includes(f)).join(','));
  const extSet = new Set(extIds.map(m => m[2]));
  check('todo ExtResource() usado está declarado', [...tscn.matchAll(/ExtResource\("([^"]+)"\)/g)].every(m => extSet.has(m[1])));
  check('todo SubResource() usado está declarado', [...tscn.matchAll(/SubResource\("([^"]+)"\)/g)].every(m => subIds.includes(m[1])));
  const firstNode = tscn.indexOf('[node ');
  check('recursos vêm antes dos nós', tscn.lastIndexOf('[ext_resource') < firstNode && tscn.lastIndexOf('[sub_resource') < firstNode);
  const nodeHeaders = [...tscn.matchAll(/\[node name="((?:[^"\\]|\\.)*)" type="(\w+)"(?: parent="((?:[^"\\]|\\.)*)")?(?: groups=\[([^\]]*)\])?\]/g)];
  check('uma raiz sem parent', nodeHeaders.filter(m => m[3] === undefined).length === 1);
  const topNames = nodeHeaders.filter(m => m[3] === '.').map(m => m[1]);
  check('nomes de nó únicos entre irmãos', new Set(topNames).size === topNames.length, topNames.join(','));
  check('nomes sem . : @ / %', topNames.every(n => !/[.:@\/%]/.test(n)), topNames.join(','));
  check('parent de todo filho existe', nodeHeaders.filter(m => m[3] && m[3] !== '.').every(m => topNames.includes(m[3])));
  check('ordem dos nós = ordem das camadas', topNames.length === out.count);
  check('grid entra no grupo Godot "Hotbar"', nodeHeaders.filter(m => m[4] === '"Hotbar"').length === 3);
  check('Label filho no Botão e no Texto fora do PNG (2 Labels)', nodeHeaders.filter(m => m[2] === 'Label').length === 2);
  check('Button usa StyleBoxTexture com margens', /\[sub_resource type="StyleBoxTexture"[^[]*texture_margin_left = \d+\.0/.test(tscn));
  check('Forma oculta → visible = false', /name="a_b_c_d_e_f" type="TextureRect"[^[]*visible = false/.test(tscn));
  check('nenhum modulate (opacidade já no PNG)', !tscn.includes('modulate'));
  check('quebra de linha escapada no texto', tscn.includes('text = "Olá\\nmundo"'));
  check('aspas no nome viram _ (Godot não aceita " em nome de nó)', tscn.includes('name="Botão _Equipar_" type="Button"'));
  check('outline no Label do botão', tscn.includes('theme_override_constants/outline_size = 4'));
  check('TextureProgressBar com value 60 e fill_mode 1', /value = 60\.0\nfill_mode = 1/.test(tscn));

  // ---- Anel: "Mostrar valor no centro" ----
  const ring = JSON.parse(await page.evaluate(`(() => {
    const o = {};
    const r1 = Studio.create('Anel', { name: 'R1' });
    o.newShows = r1.ringShowValue === true && r1.text === '' && componentLabel(r1) === '75';
    Studio.update(r1, { ringValue: 40 });
    o.follows = componentLabel(r1) === '40';
    const r2 = Studio.create('Anel', { name: 'R2', text: '' });
    o.scriptTextHides = r2.ringShowValue === false && !componentLabel(r2);
    const r3 = Studio.create('Anel', { name: 'R3', text: 'HP', ringShowValue: true });
    o.explicitWins = componentLabel(r3) === '75';
    Studio.select(r1);
    const box = document.getElementById('propRingShowValue');
    o.boxChecked = box.checked === true;
    const txt = document.getElementById('propText');
    txt.value = 'X'; txt.dispatchEvent(new Event('input', { bubbles: true }));
    o.typingReleases = r1.ringShowValue === false && componentLabel(r1) === 'X' && box.checked === false;
    box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); box.dispatchEvent(new Event('input', { bubbles: true }));
    o.boxOn = r1.ringShowValue === true && componentLabel(r1) === '40';
    box.checked = false; box.dispatchEvent(new Event('change', { bubbles: true })); box.dispatchEvent(new Event('input', { bubbles: true }));
    Studio.update(r1, { text: '' });
    o.boxOffHides = !componentLabel(r1);
    const old = normalizeComponent({ id: 999, type: 'Anel', text: '75' });
    o.oldProjectKeepsText = old.ringShowValue === false && componentLabel(old) === '75';
    return JSON.stringify(o);
  })()`));
  for (const [k, v] of Object.entries(ring)) check(`Anel: ${k}`, v);
  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
