// R5: export em 2K/4K (PNGs, manifest, cena Godot) e estados hover/pressed gerados no ZIP.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('scale', 9341);

// Captura dos downloads: cada <a download> clicado vira { name, blob } em window.__downloads.
const CAPTURE = `
  window.__downloads = [];
  const __blobs = new Map();
  const __orig = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => { const u = __orig(b); __blobs.set(u, b); return u; };
  HTMLAnchorElement.prototype.click = function () { __downloads.push({ name: this.download, blob: __blobs.get(this.href) }); };
  window.__waitDownload = async (prefix) => {
    for (let i = 0; i < 200; i++) {
      const d = __downloads.find(x => x.name.startsWith(prefix));
      if (d) { __downloads.splice(__downloads.indexOf(d), 1); return d; }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('download não chegou: ' + prefix);
  };
  window.__img = async (blob) => {
    const bmp = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const cx = c.getContext('2d');
    cx.drawImage(bmp, 0, 0);
    return { w: bmp.width, h: bmp.height, at: (x, y) => { const d = cx.getImageData(x, y, 1, 1).data; return d[0] + d[1] + d[2]; } };
  };
  window.__zip = async () => {
    document.getElementById('btnExportBatch').click();
    const d = await __waitDownload('GameUI_Batch_');
    const z = await JSZip.loadAsync(d.blob);
    return { name: d.name, z, manifest: JSON.parse(await z.file('GameUI_1080p_Assets/ui_engine_manifest.json').async('string')),
             tscn: await z.file('GameUI_Godot/game_ui.tscn').async('string') };
  };
  window.__setScale = (h) => { const s = document.getElementById('exportScaleSelect'); s.value = String(h); s.dispatchEvent(new Event('change', { bubbles: true })); };
  true`;

const SETUP = `(async () => {
  Studio.clear();
  Studio.create('Botão', { name: 'Ok', x: 840, y: 575, w: 240, h: 56, text: 'OK', exportWithText: false, fillColor1: '#808080', fillColor2: '#808080', fillType: 'solid' });
  Studio.create('Slot', { name: 'Slot Simples', x: 100, y: 100, w: 96, h: 96 });
  Studio.create('Slot', { name: 'Slot Estados', x: 300, y: 100, w: 96, h: 96, exportStates: true });
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
  cv.getContext('2d').fillRect(0, 0, 32, 32);
  const raster = Studio.create('Slot', { name: 'Icone Raster', x: 500, y: 100, w: 96, h: 96 });
  await Studio.setIcon(raster, cv.toDataURL('image/png'));
  const vec = Studio.create('Slot', { name: 'Icone Svg', x: 700, y: 100, w: 96, h: 96 });
  await Studio.setIcon(vec, '<circle cx="48" cy="48" r="30" fill="red"/>');
  Studio.select([]);
  return true;
})()`;

try {
  await page.open();
  await page.evaluate(CAPTURE);
  await page.evaluate(SETUP);

  // ---- Seletor ----
  const opts = JSON.parse(await page.evaluate(`JSON.stringify([...document.getElementById('exportScaleSelect').options].map(o => o.value + '|' + o.textContent))`));
  check('seletor: nativo, 2K e 4K numa cena 1080p', opts.join() === '0|Nativo 1920×1080,1440|2K 2560×1440,2160|4K 3840×2160', opts.join());

  // ---- 1x: estados ----
  const one = JSON.parse(await page.evaluate(`(async () => {
    __setScale(0);
    const { name, z, manifest, tscn } = await __zip();
    const a = (n) => manifest.assets.find(x => x.name === n);
    const ok = a('Ok');
    const files = Object.keys(z.files);
    const normal = await __img(await z.file('GameUI_1080p_Assets/ok.png').async('blob'));
    const hover = await __img(await z.file('GameUI_1080p_Assets/ok_hover.png').async('blob'));
    const pressed = await __img(await z.file('GameUI_1080p_Assets/ok_pressed.png').async('blob'));
    const cx = Math.floor(normal.w / 2), cy = Math.floor(normal.h / 2);
    const btnHeader = tscn.match(/\\[node name="Ok" type="Button"[^\\[]*/)[0];
    const styleIds = ['normal', 'hover', 'pressed'].map(s => btnHeader.match(new RegExp('theme_override_styles/' + s + ' = SubResource\\\\("([^"]+)"\\\\)'))[1]);
    return JSON.stringify({
      name,
      scale1: manifest.exportScale === 1 && manifest.resolution.width === 1920,
      buttonStatesFiles: files.includes('GameUI_1080p_Assets/ok_hover.png') && files.includes('GameUI_1080p_Assets/ok_pressed.png'),
      buttonStatesManifest: ok.states && ok.states.hover === 'ok_hover.png' && ok.states.brightness.hover === 1.15 && ok.states.brightness.pressed === 0.8,
      unitySpriteSwap: ok.unitySettings.transition === 'SpriteSwap' && ok.unitySettings.highlightedSprite === 'ok_hover.png' && ok.unitySettings.pressedSprite === 'ok_pressed.png',
      unrealButtonStyle: ok.unrealSettings.buttonStyle && ok.unrealSettings.buttonStyle.hovered === 'ok_hover.png' && ok.unrealSettings.buttonStyle.normal === 'ok.png',
      statesSameSize: hover.w === normal.w && hover.h === normal.h && pressed.w === normal.w,
      hoverLighter: hover.at(cx, cy) > normal.at(cx, cy),
      pressedDarker: pressed.at(cx, cy) < normal.at(cx, cy),
      godotThreeStyles: new Set(styleIds).size === 3,
      godotStateTextures: files.includes('GameUI_Godot/ok_hover.png') && files.includes('GameUI_Godot/ok_pressed.png') && tscn.includes('res://GameUI_Godot/ok_hover.png'),
      slotNoStatesByDefault: !a('Slot Simples').states && !files.includes('GameUI_1080p_Assets/slot_simples_hover.png'),
      slotOptInStates: !!a('Slot Estados').states && files.includes('GameUI_1080p_Assets/slot_estados_hover.png'),
      slotStatesNotInGodot: !files.includes('GameUI_Godot/slot_estados_hover.png'),
      noBlurWarningAt1x: !a('Icone Raster').warnings.some(w => w.includes('borrado')),
      edge1x: a('Ok').nineSliceFromComponentEdge, tex1x: a('Ok').nineSlice
    });
  })()`));
  const edge1x = one.edge1x; delete one.edge1x; delete one.tex1x; delete one.name;
  for (const [k, v] of Object.entries(one)) check(`1x: ${k}`, v);

  // ---- defaults e Inspector ----
  const defs = JSON.parse(await page.evaluate(`(() => {
    const box = document.getElementById('propExportStates');
    Studio.select('Ok');
    const checkedForButton = box.checked === true;
    box.checked = false; box.dispatchEvent(new Event('change', { bubbles: true })); box.dispatchEvent(new Event('input', { bubbles: true }));
    const unchecked = Studio.get('Ok').exportStates === false;
    box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); box.dispatchEvent(new Event('input', { bubbles: true }));
    Studio.select([]);
    return JSON.stringify({
      oldButtonGetsStates: normalizeComponent({ id: 1, type: 'Botão' }).exportStates === true,
      oldSlotNoStates: normalizeComponent({ id: 2, type: 'Slot' }).exportStates === false,
      explicitFalseKept: normalizeComponent({ id: 3, type: 'Botão', exportStates: false }).exportStates === false,
      inspectorShowsButtonOn: checkedForButton,
      inspectorTurnsOff: unchecked,
      inspectorTurnsOn: Studio.get('Ok').exportStates === true
    });
  })()`));
  for (const [k, v] of Object.entries(defs)) check(`estados: ${k}`, v);

  // ---- 4K ----
  const k4 = JSON.parse(await page.evaluate(`(async () => {
    __setScale(2160);
    const { name, z, manifest, tscn } = await __zip();
    const ok = manifest.assets.find(x => x.name === 'Ok');
    const png = await __img(await z.file('GameUI_1080p_Assets/ok.png').async('blob'));
    const hover = await __img(await z.file('GameUI_1080p_Assets/ok_hover.png').async('blob'));
    const frame = await __img(await z.file('Frames_Only_NoIcons/ok_frame.png').async('blob'));
    const label = tscn.match(/\\[node name="Label" type="Label" parent="Ok"\\][^\\[]*/)[0];
    return JSON.stringify({
      name, scale: exportScale(), manifest: { res: manifest.resolution, design: manifest.designResolution, s: manifest.exportScale, pad: manifest.exportPadding,
        viewport: manifest.godot.projectSettings['display/window/size/viewport_width'] },
      ok: { dim: ok.dimensions, tex: ok.textureSize, pos: ok.positionIn1080pScene, texPos: ok.texturePositionInScene, nine: ok.nineSlice, edge: ok.nineSliceFromComponentEdge,
            godotPos: ok.godotSettings.position, godotMargin: ok.godotSettings.patchMargin, font: ok.text.fontSize },
      png: [png.w, png.h], hover: [hover.w, hover.h], frame: [frame.w, frame.h],
      labelRight: /offset_right = 544\\.0/.test(label) && /offset_left = 64\\.0/.test(label) && /font_size = 44/.test(label),
      rasterWarn: manifest.assets.find(x => x.name === 'Icone Raster').warnings.some(w => w.includes('borrado')),
      svgNoWarn: !manifest.assets.find(x => x.name === 'Icone Svg').warnings.some(w => w.includes('borrado'))
    });
  })()`));
  check('4K: escala 2', k4.scale === 2);
  check('4K: nome do ZIP com a resolução de saída', k4.name === 'GameUI_Batch_3840x2160.zip', k4.name);
  check('4K: manifest resolution 3840×2160 e designResolution 1920×1080', k4.manifest.res.width === 3840 && k4.manifest.res.height === 2160 && k4.manifest.design.width === 1920);
  check('4K: exportScale 2 e padding 64', k4.manifest.s === 2 && k4.manifest.pad === 64);
  check('4K: viewport da Godot 3840', k4.manifest.viewport === 3840);
  check('4K: dimensões 480×112 e textura 608×240', k4.ok.dim.width === 480 && k4.ok.dim.height === 112 && k4.ok.tex.width === 608 && k4.ok.tex.height === 240, JSON.stringify(k4.ok.tex));
  check('4K: PNG real tem o tamanho do manifest', k4.png[0] === 608 && k4.png[1] === 240, k4.png.join('×'));
  check('4K: estado e moldura no mesmo tamanho', k4.hover.join() === k4.png.join() && k4.frame.join() === k4.png.join());
  check('4K: posição 1680,1150 e textura em 1616,1086', k4.ok.pos.x === 1680 && k4.ok.pos.y === 1150 && k4.ok.texPos.x === 1616 && k4.ok.texPos.y === 1086);
  check('4K: margens 9-slice = 2 × borda + 64', ['left', 'right', 'top', 'bottom'].every(s => k4.ok.nine[s] === edge1x[s] * 2 + 64), JSON.stringify(k4.ok.nine));
  check('4K: borda do componente dobrada', ['left', 'top'].every(s => k4.ok.edge[s] === edge1x[s] * 2));
  check('4K: Godot na posição da textura e com as margens do 9-slice', k4.ok.godotPos.x === 1616 && k4.ok.godotMargin.left === k4.ok.nine.left);
  check('4K: fonte do texto dobrada (22 → 44)', k4.ok.font === 44, String(k4.ok.font));
  check('4K: Label da Godot escalado (64..544, fonte 44)', k4.labelRight);
  check('4K: aviso de ícone raster ampliado', k4.rasterWarn);
  check('4K: SVG sem aviso de borrado', k4.svgNoWarn);

  // ---- 2K, Item e Cena ----
  const k2 = JSON.parse(await page.evaluate(`(async () => {
    __setScale(1440);
    const { manifest } = await __zip();
    Studio.select('Ok');
    document.getElementById('btnExportSelected').click();
    const item = await __waitDownload('ok_');
    const itemImg = await __img(item.blob);
    __setScale(2160);
    document.getElementById('btnExportScene').click();
    const scene = await __waitDownload('scene_');
    const sceneImg = await __img(scene.blob);
    return JSON.stringify({ res: manifest.resolution, s: manifest.exportScale, itemName: item.name, item: [itemImg.w, itemImg.h], sceneName: scene.name, scene: [sceneImg.w, sceneImg.h] });
  })()`));
  check('2K: manifest 2560×1440, escala 1,3333', k2.res.width === 2560 && k2.res.height === 1440 && k2.s === 1.3333);
  // 240×56 × 1,3333 = 320×75 (nome); textura = round(320 + 2 × 42,67) × round(74,67 + 2 × 42,67) = 405×160.
  check('2K: Item exportado em escala (320×75, textura 405×160)', k2.itemName === 'ok_320x75.png' && k2.item[0] === 405 && k2.item[1] === 160, `${k2.itemName} ${k2.item}`);
  check('4K: Cena exportada em 3840×2160', k2.sceneName === 'scene_3840x2160.png' && k2.scene[0] === 3840 && k2.scene[1] === 2160, `${k2.sceneName} ${k2.scene}`);

  // ---- Preferência salva e cena 1440p ----
  await page.reload();
  const pref = await page.evaluate(`document.getElementById('exportScaleSelect').value`);
  check('escolha do export sobrevive a recarregar', pref === '2160', pref);
  const q = JSON.parse(await page.evaluate(`(() => {
    applyCanvasResolution('2560x1440');
    const opts = [...document.getElementById('exportScaleSelect').options].map(o => o.value);
    const keeps4k = exportScale() === 1.5;
    state.exportHeight = 1440; refreshExportScaleOptions();
    const resetTo0 = state.exportHeight === 0 && exportScale() === 1;
    applyCanvasResolution('1920x1080');
    return JSON.stringify({ opts: opts.join(), keeps4k, resetTo0 });
  })()`));
  check('cena 1440p: só nativo e 4K no seletor', q.opts === '0,2160', q.opts);
  check('cena 1440p: 4K = escala 1,5', q.keeps4k);
  check('cena 1440p: "2K" vira a nativa', q.resetTo0);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
