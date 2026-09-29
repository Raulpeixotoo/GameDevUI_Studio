// Segurança do import (R6, @security-auditor): JSON de terceiros com tipos errados, HTML em campos
// numéricos/cor, URLs externas de imagem e resolução gigante não podem chegar ao DOM nem ao renderer.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('security', 9345);

const XSS = '"/><img src=x onerror="window.__pwned=1">';

try {
  await page.open();

  const a = JSON.parse(await page.evaluate(`(async () => {
    window.__pwned = 0;
    const ok = await loadProjectFromData({
      canvasWidth: 999999, canvasHeight: '1080', nextId: 'abc', nextGroupId: -5,
      groups: [{ id: 1, name: ${JSON.stringify(XSS)}, visible: 'no' }, { id: 'x' }, null],
      guides: [{ id: 1, axis: 'v', pos: 100 }, { id: 2, axis: '<b>', pos: 5 }, { id: 3, axis: 'h', pos: ${JSON.stringify(XSS)} }],
      sceneBackground: { mode: 'color', color: ${JSON.stringify(XSS)} },
      reference: { src: 'https://evil.example/track.png' },
      components: [
        { id: 1, type: 'Slot', name: ${JSON.stringify(XSS)}, x: ${JSON.stringify(XSS)}, y: '40', w: 96, h: 96,
          fillColor1: ${JSON.stringify(XSS)}, borderColor: '#abc', visible: 'false', groupId: 'g',
          iconSrc: 'https://evil.example/pixel.png' },
        { id: 1, type: 42, x: 10, y: 10 },
        null, 'lixo', [1, 2]
      ]
    });
    const comps = Studio.getAll();
    const c0 = comps[0];
    // Força as snap lines com as coordenadas carregadas (caminho que usa innerHTML).
    showSnapLines([c0.x, c0.x + c0.w], [c0.y]);
    await new Promise(r => setTimeout(r, 300));
    return JSON.stringify({
      ok, count: comps.length,
      res: [state.canvasWidth, state.canvasHeight],
      xNum: typeof c0.x === 'number', y: c0.y,
      colorOk: c0.fillColor1 !== ${JSON.stringify(XSS)}, borderKept: c0.borderColor === '#abc',
      visibleBool: typeof c0.visible === 'boolean',
      groupIdNull: c0.groupId === null,
      iconDropped: c0.iconSrc === null,
      nameIsText: c0.name === ${JSON.stringify(XSS)},
      typeStr: typeof comps[1].type === 'string',
      uniqueIds: new Set(comps.map(c => c.id)).size === comps.length,
      nextIdOk: state.nextId > Math.max(...comps.map(c => c.id)),
      groups: state.groups.length, groupVisible: state.groups[0] && state.groups[0].visible,
      guides: state.guides.map(g => g.axis + g.pos).join(),
      bgDefault: state.sceneBackground.color !== ${JSON.stringify(XSS)},
      refDropped: !state.reference.src,
      noImgInDom: document.querySelectorAll('img[src="x"]').length === 0,
      snapLinesOnly: [...snapLinesLayer.children].every(el => el.tagName.toLowerCase() === 'line'),
      pwned: window.__pwned
    });
  })()`));

  check('JSON malicioso ainda carrega o que é válido', a.ok && a.count === 2, `ok=${a.ok} count=${a.count}`);
  check('resolução fora da faixa é ignorada', a.res[0] <= 8192 && a.res[1] <= 8192, a.res.join('x'));
  check('x com HTML vira número', a.xNum);
  check('y string numérica é convertida', a.y === 40, String(a.y));
  check('cor com HTML volta ao padrão', a.colorOk);
  check('cor hex válida é mantida', a.borderKept);
  check('visible string vira boolean', a.visibleBool);
  check('groupId inválido vira null', a.groupIdNull);
  check('iconSrc externo (http) é descartado', a.iconDropped);
  check('nome com HTML fica como texto', a.nameIsText);
  check('type não-string é corrigido', a.typeStr);
  check('ids duplicados/ausentes não colidem', a.uniqueIds);
  check('nextId acima do maior id', a.nextIdOk);
  check('grupos inválidos filtrados', a.groups === 1 && a.groupVisible === true, `${a.groups}`);
  check('guias inválidas filtradas', a.guides === 'v100', a.guides);
  check('fundo com cor inválida volta ao padrão', a.bgDefault);
  check('rascunho com URL externa é descartado', a.refDropped);
  check('snap lines só com <line>', a.snapLinesOnly);
  check('nenhum HTML injetado executou', a.noImgInDom && !a.pwned);

  // Colar (Ctrl+V) um pacote de fora passa pela mesma normalização.
  const b = JSON.parse(await page.evaluate(`(async () => {
    Studio.clear();
    const pasted = await pasteComponents({ format: CLIPBOARD_FORMAT, components: [
      { type: 'Slot', x: 5, y: 5, w: 50, h: 50, textColor: ${JSON.stringify(XSS)}, iconSrc: 'javascript:alert(1)', opacity: 'NaN' }
    ] });
    const c = pasted[0];
    return JSON.stringify({ n: pasted.length, color: c.textColor, icon: c.iconSrc, opacity: c.opacity });
  })()`));
  check('colar: cor com HTML volta ao padrão', b.n === 1 && b.color === '#f4f4f5', b.color);
  check('colar: iconSrc javascript: descartado', b.icon === null, String(b.icon));
  check('colar: opacidade inválida volta ao padrão', b.opacity === 1, String(b.opacity));

  // Projeto legítimo continua idêntico depois da normalização.
  const c = JSON.parse(await page.evaluate(`(async () => {
    Studio.clear();
    Studio.create('Botão', { name: 'Ok', x: 12, y: 34, text: 'Jogar', fillColor1: '#112233' });
    const data = getSerializedProjectData(true);
    const before = JSON.stringify(data.components);
    await loadProjectFromData(JSON.parse(JSON.stringify(data)));
    return JSON.stringify({ same: JSON.stringify(getSerializedProjectData(true).components) === before });
  })()`));
  check('projeto válido reabre sem alteração', c.same);

  check('limite de tamanho do import definido', await page.evaluate('MAX_PROJECT_BYTES === 50 * 1048576'));
  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
