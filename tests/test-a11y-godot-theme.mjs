// R8: acessibilidade (daltonismo, contraste), teste de tradução e tema da Godot (.tres).
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('a11y-theme', 9359);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);

try {
  await page.open();

  // ---- Daltonismo ----
  const cb = await j(`
    const s = document.getElementById('visionSimSelect');
    s.value = 'deuteranopia'; s.dispatchEvent(new Event('change'));
    const on = mainCanvas.style.filter;
    const filterOk = !!document.getElementById('cb-deuteranopia');
    s.value = ''; s.dispatchEvent(new Event('change'));
    return { on, off: mainCanvas.style.filter, filterOk };
  `);
  check('simulador aplica o filtro só no canvas e desliga', cb.on.includes('cb-deuteranopia') && cb.off === '' && cb.filterOk, JSON.stringify(cb));

  // ---- Contraste ----
  const ct = await j(`
    Studio.clear();
    const ratio = +contrastRatio('#ffffff', '#000000').toFixed(2);
    const mid = +contrastRatio('#777777', '#ffffff').toFixed(2);
    Studio.create('Painel', { name: 'Fundo claro', x: 100, y: 100, w: 600, h: 300, fillType: 'solid', fillColor1: '#f4f4f5' });
    const low = Studio.text('Texto fraco', { x: 150, y: 150, w: 300, h: 40, fontSize: 16, textColor: '#d4d4d8' });
    const infoLow = textContrastInfo(low);
    Studio.select(low); renderScene();
    const badgeLow = document.getElementById('textContrastBadge').textContent;
    const good = Studio.text('Texto forte', { x: 150, y: 220, w: 300, h: 40, fontSize: 16, textColor: '#18181b' });
    const infoGood = textContrastInfo(good);
    const big = Studio.text('TÍTULO', { x: 150, y: 280, w: 300, h: 60, fontSize: 32, textColor: '#8a8a8a' });
    const infoBig = textContrastInfo(big);
    const loose = Studio.text('Solto', { x: 1200, y: 800, w: 200, h: 40 });
    const infoLoose = textContrastInfo(loose);
    const stroke = Studio.text('Contorno', { x: 150, y: 150, w: 300, h: 40, fontSize: 16, textColor: '#d4d4d8', textStrokeWidth: 2, textStrokeColor: '#000000' });
    const infoStroke = textContrastInfo(stroke);
    return { ratio, mid, infoLow, badgeLow, infoGood, infoBig, infoLoose, infoStroke };
  `);
  check('razão de contraste WCAG (preto × branco = 21:1; #777 × branco ≈ 4,48)', ct.ratio === 21 && Math.abs(ct.mid - 4.48) < 0.02, `${ct.ratio} ${ct.mid}`);
  check('texto claro sobre painel claro: contraste baixo detectado pelo item de baixo', !ct.infoLow.ok && ct.infoLow.ratio < 1.5 && /baixo/.test(ct.badgeLow), JSON.stringify(ct.infoLow) + ct.badgeLow);
  check('texto escuro sobre painel claro: OK', ct.infoGood.ok && ct.infoGood.need === 4.5);
  check('texto grande usa o mínimo de 3:1', ct.infoBig.large && ct.infoBig.need === 3 && ct.infoBig.ok, JSON.stringify(ct.infoBig));
  check('texto sobre fundo transparente: contraste indeterminado', ct.infoLoose.unknown === true);
  check('contorno escuro salva o texto claro', ct.infoStroke.ok, JSON.stringify(ct.infoStroke));

  // ---- Teste de tradução ----
  const pl = await j(`
    Studio.clear();
    const fits = Studio.text('OK', { name: 'Cabe', x: 100, y: 100, w: 400, h: 60, fontSize: 24 });
    const tight = Studio.create('Botão', { name: 'Apertado', x: 100, y: 300, w: 120, h: 40, text: 'CONFIRMAR', fontSize: 22 });
    const exportBefore = await renderSingleComponentToBlob(tight, 1).then(b => b.size);
    const chk = document.getElementById('chkPseudoLoc');
    chk.checked = true; chk.dispatchEvent(new Event('change'));
    const ids = [...pseudoOverflowIds];
    const count = document.getElementById('pseudoLocCount').textContent;
    const exportDuring = await renderSingleComponentToBlob(tight, 1).then(b => b.size);
    chk.checked = false; chk.dispatchEvent(new Event('change'));
    return { sample: pseudoLocalize('Jogar'), multi: pseudoLocalize('Um\\nDois'), ids, tightId: tight.id, fitsId: fits.id, count, exportSame: exportBefore === exportDuring, text: tight.text, hidden: document.getElementById('pseudoLocCount').classList.contains('hidden') };
  `);
  check('pseudo-localização acentua, alonga e põe colchetes', pl.sample === '[Jögár···]' && pl.multi === '[Üm··]\n[Döís···]', `${pl.sample} | ${JSON.stringify(pl.multi)}`);
  check('marca só o que estoura', pl.ids.includes(pl.tightId) && !pl.ids.includes(pl.fitsId), JSON.stringify(pl));
  check('contador de estouros na barra', /1 estouro/.test(pl.count), pl.count);
  check('teste de tradução não muda o texto nem o export', pl.text === 'CONFIRMAR' && pl.exportSame && pl.hidden);

  // ---- Tema da Godot ----
  const th = await j(`
    const blobs = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { blobs.push(b); return orig(b); };
    HTMLAnchorElement.prototype.click = function () {};
    Studio.clear();
    Studio.create('Botão', { name: 'Jogar Agora', x: 100, y: 100, w: 240, h: 60, exportStates: true, exportWithText: false, text: 'JOGAR' });
    Studio.create('Painel', { name: 'Janela', x: 400, y: 100, w: 400, h: 300 });
    Studio.create('Barra', { name: 'HP', x: 100, y: 500 });
    document.getElementById('btnExportBatch').click();
    for (let i = 0; i < 150 && !blobs.some(b => b.type === 'application/zip'); i++) await new Promise(r => setTimeout(r, 200));
    const z = await JSZip.loadAsync(blobs.find(b => b.type === 'application/zip'));
    const tres = await z.file('GameUI_Godot/game_ui_theme.tres').async('string');
    const m = JSON.parse(await z.file('GameUI_1080p_Assets/ui_engine_manifest.json').async('string'));
    const files = Object.keys(z.files);
    const extPaths = [...tres.matchAll(/path="res:\\/\\/(GameUI_Godot\\/[^"]+)"/g)].map(x => x[1]);
    return { tres, theme: m.godot.theme, extOk: extPaths.length > 0 && extPaths.every(p => files.includes(p)), pad: m.exportPadding };
  `);
  const t = th.tres;
  const ext = (t.match(/\[ext_resource /g) || []).length, subs = (t.match(/\[sub_resource /g) || []).length;
  check('tema .tres é um Theme com load_steps certo', t.startsWith(`[gd_resource type="Theme" load_steps=${ext + subs + 1} format=3]`), t.split('\n')[0]);
  check('Botão vira variação de Button com normal/hover/pressed/focus', /Btn_jogar_agora\/base_type = &"Button"/.test(t) && /Btn_jogar_agora\/styles\/hover = SubResource/.test(t) && /Btn_jogar_agora\/styles\/focus = SubResource\("StyleBoxEmpty_focus"\)/.test(t));
  check('Painel vira variação de PanelContainer', /Panel_janela\/base_type = &"PanelContainer"/.test(t) && /Panel_janela\/styles\/panel = SubResource/.test(t));
  check('Barra fica de fora do tema (usa TextureProgressBar)', !/_hp\//.test(t));
  check('expand_margin = padding do PNG (moldura cobre o Control)', t.includes(`expand_margin_left = ${th.pad}.0`));
  check('texto fora do PNG vira cor e tamanho da fonte na variação', /Btn_jogar_agora\/font_sizes\/font_size = \d+/.test(t) && /Btn_jogar_agora\/colors\/font_color = Color\(/.test(t));
  check('toda textura do tema existe no ZIP', th.extOk);
  check('manifest aponta o tema e lista as variações', th.theme && th.theme.resPath === 'res://GameUI_Godot/game_ui_theme.tres' && th.theme.typeVariations.length === 2, JSON.stringify(th.theme));

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
