// Textura (R7): ruído e scanlines. Determinística, ancorada no item, recortada pela forma, no SVG e no Inspector.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('texture', 9357);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);
const PIX = `
  const region = (x, y, w, h) => Array.from(ctx.getImageData(x, y, w, h).data);
  const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1);
`;

try {
  await page.open();

  const r = await j(`${PIX}
    Studio.clear();
    const p = Studio.create('Painel', { name: 'T', x: 100, y: 100, w: 300, h: 200, fillType: 'solid', fillColor1: '#406080',
      borderWidth: 0, dropShadow: false, innerShadow: false, radius: 0 });
    renderScene(); const plain = region(150, 150, 64, 64);
    Studio.update(p, { noise: 0.6 }); renderScene(); const noisy = region(150, 150, 64, 64);
    renderScene(); const noisy2 = region(150, 150, 64, 64);
    Studio.update(p, { x: 237, y: 173 }); renderScene(); const moved = region(287, 223, 64, 64);
    return { changed: !same(plain, noisy), deterministic: same(noisy, noisy2), anchored: same(noisy, moved) };
  `);
  check('ruído muda os pixels do preenchimento', r.changed);
  check('ruído determinístico (mesma imagem a cada render)', r.deterministic);
  check('ruído ancorado no item (mover não "cintila")', r.anchored);

  const s = await j(`
    Studio.clear();
    Studio.create('Painel', { name: 'S', x: 100, y: 100, w: 300, h: 200, fillType: 'solid', fillColor1: '#808080',
      borderWidth: 0, dropShadow: false, innerShadow: false, radius: 0, scanlines: 1, scanlineSpacing: 8 });
    renderScene();
    const lum = (y) => ctx.getImageData(250, y, 1, 1).data[0];
    return { line: lum(100 + 16 + 1), between: lum(100 + 16 + 5) };
  `);
  check('scanlines: linha escura a cada espaçamento', s.line < 20 && s.between > 100, JSON.stringify(s));

  const clip = await j(`
    Studio.clear();
    Studio.create('Forma', { name: 'E', x: 100, y: 100, w: 200, h: 200, shapeKind: 'ellipse', dropShadow: false, borderWidth: 0, noise: 1, scanlines: 1 });
    renderScene();
    return ctx.getImageData(104, 104, 1, 1).data[3];
  `);
  check('textura recortada pela forma (canto fora da elipse continua transparente)', clip === 0, String(clip));

  const svg = await j(`
    Studio.clear();
    Studio.create('Painel', { name: 'A', x: 50, y: 50, noise: 0.4, scanlines: 0.3 });
    Studio.create('Painel', { name: 'B', x: 700, y: 50, noise: 0.4 });
    const doc = await Studio.svg();
    return { images: (doc.match(/<image /g) || []).length, patterns: (doc.match(/<pattern /g) || []).length, png: doc.includes('href="data:image/png;base64,') };
  `);
  check('SVG: um ladrilho de ruído por documento e patterns por item', svg.images === 1 && svg.patterns === 3 && svg.png, JSON.stringify(svg));

  const insp = await j(`
    Studio.clear();
    const c = Studio.create('Botão', { name: 'I' });
    Studio.select(c);
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    set('propNoise', 35); set('propScanlines', 50); set('propScanlineSpacing', 99);
    return { noise: c.noise, scan: c.scanlines, gap: c.scanlineSpacing, label: document.getElementById('noiseVal').textContent };
  `);
  check('Inspector edita ruído, scanlines e espaçamento (com limite)', insp.noise === 0.35 && insp.scan === 0.5 && insp.gap === 32 && insp.label === '35%', JSON.stringify(insp));

  const extra = await j(`
    Studio.clear();
    const c = Studio.create('Painel', { name: 'W', noise: 0.2 });
    const code = Studio.toScript(c);
    const w = getNineSliceWarnings(c, computeNineSlice(c));
    const old = normalizeComponent({ id: 99, type: 'Slot', name: 'antigo' });
    return { script: code.includes('noise: 0.2'), warn: w.some(x => x.startsWith('Textura')), old: old.noise === 0 && old.scanlines === 0 && old.scanlineSpacing === 4 };
  `);
  check('script da seleção leva a textura', extra.script);
  check('manifest avisa que a textura estica no 9-slice', extra.warn);
  check('projeto antigo abre sem textura (padrão 0)', extra.old);

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
