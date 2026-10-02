// R5: export SVG vetorial. Fidelidade (SVG renderizado × PNG do canvas, pixel a pixel), estrutura,
// segurança (escape), fontes, cena, ZIP e seletor de formato.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('svg', 9344);

const HELPERS = `
  window.__svgImg = (text) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('SVG não carregou como imagem'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
  });
  // Diferença entre o PNG do canvas e o SVG renderizado: média (0..255) e % de pixels muito diferentes.
  window.__diff = async (name) => {
    const comp = Studio.get(name);
    const png = await createImageBitmap(await renderSingleComponentToBlob(comp, 1));
    const svg = await __svgImg(componentSvgString(comp, 1));
    const W = png.width, H = png.height;
    const a = new OffscreenCanvas(W, H).getContext('2d'); a.drawImage(png, 0, 0);
    const b = new OffscreenCanvas(W, H).getContext('2d'); b.drawImage(svg, 0, 0, W, H);
    const da = a.getImageData(0, 0, W, H).data, db = b.getImageData(0, 0, W, H).data;
    let sum = 0, bad = 0, ink = 0;
    for (let i = 0; i < da.length; i += 4) {
      // Cor pré-multiplicada pelo alpha: na franja de um brilho (alpha 1/255) o RGB é ruído de
      // arredondamento que ninguém vê, e comparado cru acusava "255 de diferença".
      const pa = da[i + 3] / 255, pb = db[i + 3] / 255;
      const d = Math.max(Math.abs(da[i] * pa - db[i] * pb), Math.abs(da[i + 1] * pa - db[i + 1] * pb), Math.abs(da[i + 2] * pa - db[i + 2] * pb), Math.abs(da[i + 3] - db[i + 3]));
      sum += d; if (d > 48) bad++; if (da[i + 3] > 0) ink++;
    }
    return { mean: +(sum / (W * H)).toFixed(2), bad: +(bad / (W * H) * 100).toFixed(2), ink };
  };
  window.__parse = (text) => {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    return { ok: !doc.querySelector('parsererror'), doc };
  };
  true`;

try {
  await page.open();
  await page.evaluate(HELPERS);
  await page.evaluate(`(async () => {
    Studio.clear();
    Studio.create('Painel', { name: 'Cartao', x: 100, y: 100, w: 260, h: 160, radius: 18, fillType: 'gradient', gradientDir: 'vertical',
      fillColor1: '#3b82f6', fillColor2: '#1e3a8a', borderStyle: 'bevel', borderWidth: 4, borderColor: '#94a3b8', dropShadow: true, innerShadow: true, text: '' });
    Studio.create('Slot', { name: 'Chanfro', x: 400, y: 100, w: 120, h: 120, cornerStyle: 'chamfer', independentRadius: true, radiusTL: 24, radiusTR: 4, radiusBR: 24, radiusBL: 4,
      borderStyle: 'solid', borderWidth: 3, borderColor: '#f59e0b', dropShadow: false, innerShadow: false, fillColor1: '#111827', fillType: 'solid', text: '' });
    Studio.create('Forma', { name: 'Estrela', x: 560, y: 100, w: 140, h: 140, shapeKind: 'star', dropShadow: false, text: '' });
    Studio.create('Forma', { name: 'Elipse', x: 740, y: 100, w: 180, h: 110, shapeKind: 'ellipse', fillType: 'gradient', gradientDir: 'radial', fillColor1: '#fde047', fillColor2: '#9a3412', dropShadow: false, text: '' });
    Studio.create('Barra', { name: 'Barra', x: 100, y: 320, w: 400, h: 36, barValue: 60, barSegments: 5, dropShadow: false, text: '' });
    Studio.create('Slot', { name: 'Tracejado', x: 560, y: 320, w: 110, h: 110, borderStyle: 'dashed', borderWidth: 3, dropShadow: false, innerShadow: false, text: '' });
    Studio.create('Slot', { name: 'Dupla', x: 700, y: 320, w: 110, h: 110, borderStyle: 'double', borderWidth: 6, dropShadow: false, innerShadow: false, text: '' });
    Studio.create('Anel', { name: 'Anel', x: 100, y: 450, w: 180, h: 180, ringValue: 70, ringShowValue: false, text: '', ringGlow: false });
    Studio.create('Anel', { name: 'Anel Brilho', x: 320, y: 450, w: 180, h: 180, ringValue: 35, ringShowValue: false, text: '', ringGlow: true });
    const ic = Studio.create('Slot', { name: 'Icone', x: 560, y: 480, w: 110, h: 110, dropShadow: false, innerShadow: false, text: '', iconFilter: 'grayscale' });
    await Studio.setIcon(ic, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="28" fill="#ef4444"/></svg>');
    Studio.update(ic, { iconFilter: 'grayscale' });
    const sil = Studio.create('Slot', { name: 'Silhueta', x: 700, y: 480, w: 110, h: 110, dropShadow: false, innerShadow: false, text: '' });
    await Studio.setIcon(sil, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect x="8" y="8" width="48" height="48" fill="#22c55e"/></svg>');
    Studio.update(sil, { iconFilter: 'silhouette' });
    Studio.create('Slot', { name: 'Girado', x: 900, y: 480, w: 120, h: 80, rotation: 30, dropShadow: true, text: '' });
    Studio.create('Botão', { name: 'Texto <b> & "aspas"', x: 1100, y: 100, w: 300, h: 60, text: 'Olá <mundo> & "cia"\\nlinha 2', fontFamily: 'Rajdhani',
      textStrokeWidth: 2, textEffect: 'glow', exportStates: false });
    Studio.create('Slot', { name: 'Oculto', x: 1100, y: 300, visible: false, text: '' });
    Studio.select([]);
    return true;
  })()`);

  // ---- Fidelidade: SVG × PNG ----
  // Partes exatas: diferença média < 2/255 e < 1% de pixels muito diferentes (bordas com antialias à parte).
  const exact = ['Cartao', 'Chanfro', 'Estrela', 'Elipse', 'Barra', 'Tracejado', 'Dupla', 'Icone', 'Silhueta'];
  for (const name of exact) {
    const d = JSON.parse(await page.evaluate(`__diff(${JSON.stringify(name)}).then(JSON.stringify)`));
    check(`fiel ao PNG: ${name}`, d.ink > 0 && d.mean < 2 && d.bad < 1, `média ${d.mean}, ${d.bad}% muito diferentes`);
  }
  // Anel: sem gradiente cônico no SVG (segmentos) e brilho por blur: tolerância maior.
  for (const name of ['Anel', 'Anel Brilho']) {
    const d = JSON.parse(await page.evaluate(`__diff(${JSON.stringify(name)}).then(JSON.stringify)`));
    check(`próximo do PNG: ${name}`, d.mean < 6 && d.bad < 4, `média ${d.mean}, ${d.bad}% muito diferentes`);
  }

  // ---- Estrutura, segurança e texto ----
  const s = JSON.parse(await page.evaluate(`(async () => {
    const o = {};
    const item = await Studio.svg('Texto <b> & "aspas"');
    const p = __parse(item);
    o.wellFormed = p.ok;
    o.noScript = !/<script/i.test(item);
    const texts = [...p.doc.querySelectorAll('text')].map(t => t.textContent);
    o.textEscapedAndPreserved = texts[0] === 'Olá <mundo> & "cia"' && texts[1] === 'linha 2';
    o.nameEscaped = p.doc.querySelector('g[data-name]').getAttribute('data-name') === 'Texto <b> & "aspas"';
    o.fontImport = item.includes("@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@") && !item.includes('family=Oswald');
    o.textStrokePaintOrder = p.doc.querySelector('text').getAttribute('paint-order') === 'stroke' && p.doc.querySelector('text').getAttribute('stroke-width') === '4';
    o.glowFilter = !!p.doc.querySelector('filter feDropShadow');
    o.textIsVector = !p.doc.querySelector('image');
    const i1 = componentSvgString(Studio.get('Cartao'));
    const i2 = componentSvgString(Studio.get('Cartao'));
    const ids = (t) => [...t.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    o.uniqueIdsBetweenFiles = ids(i1).length > 0 && ids(i1).every(id => !ids(i2).includes(id));
    const card = __parse(i1).doc.documentElement;
    o.itemViewBox = card.getAttribute('viewBox') === '0 0 324 224' && card.getAttribute('width') === '324';
    o.itemIsVector = !i1.includes('data:image/png');
    o.hiddenItemStillExports = __parse(componentSvgString(Studio.get('Oculto'))).doc.querySelectorAll('path').length > 0;
    o.rotationInScene = /rotate\\(30 /.test(sceneSvgString(1));
    o.itemWithoutRotation = !/rotate\\(/.test(componentSvgString(Studio.get('Girado')));
    return JSON.stringify(o);
  })()`));
  for (const [k, v] of Object.entries(s)) check(`svg: ${k}`, v);

  // ---- Cena, escala, ZIP, seletor ----
  const z = JSON.parse(await page.evaluate(`(async () => {
    const o = {};
    const downloads = [];
    const blobs = new Map();
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { const u = orig(b); blobs.set(u, b); return u; };
    HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, blob: blobs.get(this.href) }); };
    const waitFor = async (prefix) => { for (let i = 0; i < 150; i++) { const d = downloads.find(x => x.name.startsWith(prefix)); if (d) return d; await new Promise(r => setTimeout(r, 100)); } throw new Error('sem download ' + prefix); };

    state.sceneBackground = { mode: 'color', color: '#101014' };
    const scene = sceneSvgString(1);
    const sp = __parse(scene);
    o.sceneWellFormed = sp.ok;
    o.sceneBackground = sp.doc.querySelector('svg > rect') && sp.doc.querySelector('svg > rect').getAttribute('fill') === '#101014';
    o.sceneSkipsHidden = !scene.includes('data-name="Oculto"');
    o.sceneOrder = scene.indexOf('data-name="Cartao"') < scene.indexOf('data-name="Girado"');
    const sceneImg = await __svgImg(scene);
    o.sceneRenders = sceneImg.width === 1920;
    state.sceneBackground = { mode: 'transparent', color: '#101014' };

    document.getElementById('exportScaleSelect').value = '2160';
    document.getElementById('exportScaleSelect').dispatchEvent(new Event('change'));
    const fmt = document.getElementById('exportFormatSelect');
    fmt.value = 'svg'; fmt.dispatchEvent(new Event('change'));
    Studio.select('Cartao');
    document.getElementById('btnExportSelected').click();
    const item = await waitFor('cartao_');
    o.itemButtonSvg = item.name === 'cartao_520x320.svg' && item.blob.type === 'image/svg+xml';
    const itemDoc = __parse(await item.blob.text()).doc.documentElement;
    o.item4kSizeVectorViewBox = itemDoc.getAttribute('width') === '648' && itemDoc.getAttribute('viewBox') === '0 0 324 224';
    document.getElementById('btnExportScene').click();
    const sc = await waitFor('scene_');
    o.sceneButtonSvg = sc.name === 'scene_3840x2160.svg';

    document.getElementById('btnExportBatch').click();
    const zipD = await waitFor('GameUI_Batch_');
    const zip = await JSZip.loadAsync(zipD.blob);
    const manifest = JSON.parse(await zip.file('GameUI_1080p_Assets/ui_engine_manifest.json').async('string'));
    const svgFiles = Object.keys(zip.files).filter(f => f.startsWith('SVG/') && f.endsWith('.svg'));
    o.zipSvgFolder = svgFiles.length === Studio.getAll().length;
    o.zipManifestSvgFile = manifest.assets.every(a => zip.file('SVG/' + a.svgFile));
    o.zipSvgWellFormed = __parse(await zip.file('SVG/' + manifest.assets[0].svgFile).async('string')).ok;
    o.zipStillHasPng = !!zip.file('GameUI_1080p_Assets/' + manifest.assets[0].file);

    fmt.value = 'png'; fmt.dispatchEvent(new Event('change'));
    Studio.select('Cartao');
    document.getElementById('btnExportSelected').click();
    const png = await waitFor('cartao_520x320.png');
    o.pngStillDefault = png.blob.type === 'image/png';
    fmt.value = 'svg'; fmt.dispatchEvent(new Event('change'));
    return JSON.stringify(o);
  })()`));
  for (const [k, v] of Object.entries(z)) check(`export: ${k}`, v);

  await page.reload();
  const fmt = await page.evaluate(`document.getElementById('exportFormatSelect').value`);
  check('formato escolhido sobrevive a recarregar', fmt === 'svg', fmt);
  await page.evaluate(`(() => { const f = document.getElementById('exportFormatSelect'); f.value = 'png'; f.dispatchEvent(new Event('change')); return true; })()`);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
