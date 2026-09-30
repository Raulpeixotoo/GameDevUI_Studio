// Resoluções mobile (R7): presets agrupados, girar, área segura, export pelo lado menor e manifest v6.
import fs from 'node:fs';
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('mobile-res', 9353);
const SHOT = process.env.MOBILE_SHOT;
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);
const pick = (value) => page.evaluate(`(() => { const s = document.getElementById('canvasResSelect'); s.value = '${value}'; s.dispatchEvent(new Event('change')); return true; })()`);
const view = () => j(`
  const s = document.getElementById('canvasResSelect');
  const band = (side) => { const el = document.querySelector('.safe-band[data-side="' + side + '"]'); return [parseFloat(el.style.left), parseFloat(el.style.top), parseFloat(el.style.width), parseFloat(el.style.height)]; };
  return {
    w: state.canvasWidth, h: state.canvasHeight, value: s.value,
    selectedText: s.options[s.selectedIndex] && s.options[s.selectedIndex].textContent,
    custom: [...s.querySelectorAll('optgroup[data-custom] option')].map(o => o.value),
    group: s.options[s.selectedIndex] && s.options[s.selectedIndex].parentElement.label,
    overlay: !document.getElementById('safeAreaOverlay').classList.contains('hidden'),
    btnDisabled: document.getElementById('btnToggleSafeArea').disabled,
    top: band('top'), bottom: band('bottom'), left: band('left'), right: band('right'),
    api: Studio.safeArea,
    scaleOpts: [...document.getElementById('exportScaleSelect').options].map(o => o.value + '|' + o.textContent)
  };
`);

try {
  await page.open();

  const groups = await j(`return [...document.querySelectorAll('#canvasResSelect optgroup')].map(g => g.label + ':' + [...g.children].map(o => o.value).join(','));`);
  check('3 grupos de resolução (desktop, celular, tablet)', groups.length === 3 && groups[1].startsWith('Celular (retrato):1080x1920,1080x2400,1170x2532') && groups[2].includes('2732x2048'), groups.join(' | '));

  let v = await view();
  check('desktop 1920×1080 sem área segura', !v.overlay && v.btnDisabled && v.api === null, JSON.stringify(v));

  await pick('1170x2532');
  v = await view();
  check('iPhone: cena 1170×2532', v.w === 1170 && v.h === 2532);
  check('iPhone: área segura visível (notch 141, home 102)', v.overlay && !v.btnDisabled && v.top[3] === 141 && v.bottom[1] === 2532 - 102 && v.bottom[3] === 102, JSON.stringify([v.top, v.bottom]));
  check('Studio.safeArea devolve os insets', v.api && v.api.top === 141 && v.api.bottom === 102);
  check('export em retrato usa o lado menor (2K = 1440×3116)', v.scaleOpts.includes('1440|2K 1440×3116') && v.scaleOpts.includes('2160|4K 2160×4674'), v.scaleOpts.join(', '));

  await page.evaluate(`document.getElementById('btnRotateRes').click(), true`);
  v = await view();
  check('girar: 2532×1170 com notch nas laterais', v.w === 2532 && v.h === 1170 && v.left[2] === 141 && v.right[0] === 2532 - 141 && v.bottom[3] === 63, JSON.stringify([v.left, v.right, v.bottom]));
  check('resolução girada entra como Personalizada', v.custom.join() === '2532x1170' && v.value === '2532x1170' && v.selectedText === '2532×1170' && v.group === 'Personalizada', JSON.stringify(v.custom) + v.selectedText + v.group);

  await page.evaluate(`document.getElementById('btnRotateRes').click(), true`);
  v = await view();
  check('girar de volta remove a Personalizada', v.w === 1170 && v.custom.length === 0 && v.value === '1170x2532');

  await page.evaluate(`document.getElementById('btnToggleSafeArea').click(), true`);
  v = await view();
  check('botão esconde a área segura', !v.overlay && !v.btnDisabled);
  await page.evaluate(`document.getElementById('btnToggleSafeArea').click(), true`);

  const snap = await j(`return snapTargets(new Set()).ys.includes(141) && snapTargets(new Set()).ys.includes(2532 - 102);`);
  check('bordas da área segura entram no snap', snap);

  // Manifest v6 numa cena 1080×1920 exportada em 4K (escala 2)
  await pick('1080x1920');
  const man = await j(`
    const blobs = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { blobs.push(b); return orig(b); };
    HTMLAnchorElement.prototype.click = function () {};
    Studio.clear();
    Studio.create('Botão', { name: 'Jogar', x: 340, y: 1600, w: 400, h: 120 });
    const s = document.getElementById('exportScaleSelect'); s.value = '2160'; s.dispatchEvent(new Event('change'));
    document.getElementById('btnExportBatch').click();
    for (let i = 0; i < 150 && !blobs.some(b => b.type === 'application/zip'); i++) await new Promise(r => setTimeout(r, 200));
    const z = await JSZip.loadAsync(blobs.find(b => b.type === 'application/zip'));
    const m = JSON.parse(await z.file('GameUI_1080p_Assets/ui_engine_manifest.json').async('string'));
    s.value = '0'; s.dispatchEvent(new Event('change'));
    return { v: m.manifestVersion, res: m.resolution, o: m.orientation, safe: m.safeArea, unity: m.unityCanvasScaler, godot: m.godot.projectSettings, pos: m.assets[0].positionIn1080pScene };
  `);
  check('manifest v6 em retrato', man.v === 6 && man.o === 'portrait', JSON.stringify(man));
  check('resolução de saída 2160×3840', man.res.width === 2160 && man.res.height === 3840);
  check('safeArea escalada para a saída (72 → 144)', man.safe && man.safe.top === 144 && man.safe.bottom === 0);
  check('Unity Canvas Scaler: referência 2160×3840, casa a largura', man.unity.referenceResolution.x === 2160 && man.unity.referenceResolution.y === 3840 && man.unity.matchWidthOrHeight === 0);
  check('Godot: retrato e keep_width', man.godot['display/window/handheld/orientation'] === 1 && man.godot['display/window/stretch/aspect'] === 'keep_width');
  check('posição do item escalada (340,1600 → 680,3200)', man.pos.x === 680 && man.pos.y === 3200);

  // Salvar/abrir mantém a resolução mobile; undo da troca de resolução volta à anterior
  const persist = await j(`
    await loadProjectFromData(JSON.parse(JSON.stringify(getSerializedProjectData())));
    return document.getElementById('canvasResSelect').value;
  `);
  check('projeto mobile reabre com a resolução certa', persist === '1080x1920', persist);

  const custom = await j(`
    await loadProjectFromData({ canvasWidth: 800, canvasHeight: 600, components: [] });
    const s = document.getElementById('canvasResSelect');
    return s.value + '|' + s.options[s.selectedIndex].textContent + '|' + s.options[s.selectedIndex].parentElement.label;
  `);
  check('resolução fora da lista vira Personalizada ao abrir', custom === '800x600|800×600|Personalizada', custom);

  await page.evaluate(`setLanguage('en'), true`);
  const en = await j(`return [...document.querySelectorAll('#canvasResSelect optgroup')].map(g => g.label).join(',') + '|' + document.getElementById('canvasResSelect').selectedOptions[0].parentElement.label;`);
  check('grupos e Personalizada traduzidos para EN', en === 'Desktop / Console,Phone (portrait),Tablet (landscape),Custom|Custom', en);
  await page.evaluate(`setLanguage('pt'), true`);

  if (SHOT) {
    await pick('1170x2532');
    await page.evaluate(`Studio.clear(); Studio.create('Painel', { name: 'HUD', x: 60, y: 160, w: 1050, h: 300 }); fitCanvasToViewport(), true`);
    await sleep(300);
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'));
  }

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
