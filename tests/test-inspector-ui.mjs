// R5: Inspector com seções recolhíveis e busca de propriedades.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('inspector', 9342);

const HELPERS = `
  window.__vis = (el) => !!el && el.getClientRects().length > 0;
  window.__sec = (key) => inspSections.find(s => s.key === key);
  window.__search = (q) => { inspSearch.value = q; inspSearch.dispatchEvent(new Event('input', { bubbles: true })); };
  true`;

try {
  await page.open();
  await page.evaluate(HELPERS);
  const r = JSON.parse(await page.evaluate(`(() => {
    const o = {};
    Studio.clear();
    Studio.create('Slot', { name: 'Alvo' });
    Studio.select('Alvo');
    try { localStorage.removeItem(INSPECTOR_UI_KEY); } catch (e) {}
    inspSections.forEach(s => s.el.classList.remove('insp-collapsed'));

    o.keys = inspSections.map(s => s.key).join('|');
    o.detected = inspSections.length >= 10 && ['sectionText', 'sectionRing', 'Efeitos', 'Cantos', 'Preenchimento', 'Borda / Moldura'].every(k => __sec(k));

    // Recolher pelo título
    const fx = __sec('Efeitos');
    const firstBody = fx.el.children[1];
    o.openByDefault = __vis(firstBody);
    fx.header.click();
    o.collapses = fx.el.classList.contains('insp-collapsed') && !__vis(firstBody) && __vis(fx.header);
    fx.header.click();
    o.expands = __vis(firstBody);

    // Controle dentro do título não recolhe (checkbox "Mostrar" da seção 9-Slice)
    const nine = inspSections.find(s => s.header.querySelector('#propShowGuides'));
    document.getElementById('propShowGuides').click();
    o.headerControlDoesNotToggle = !nine.el.classList.contains('insp-collapsed');
    document.getElementById('propShowGuides').click();

    // Recolher / expandir tudo
    inspToggleAll.click();
    o.collapseAll = inspSections.every(s => s.el.classList.contains('insp-collapsed'));
    inspToggleAll.click();
    o.expandAll = inspSections.every(s => !s.el.classList.contains('insp-collapsed'));

    // Busca: sem acento, parcial, por linha
    __search('rotacao');
    o.rotationRowShown = __vis(document.getElementById('propRotation'));
    o.otherRowsHidden = !__vis(document.getElementById('propX')) && !__vis(document.getElementById('propOpacity'));
    o.otherSectionsHidden = !__vis(__sec('Cantos').el) && !__vis(__sec('sectionText').el);
    o.separatorsHidden = [...inspectorContent.children].filter(el => el.classList.contains('h-[1px]')).every(el => !__vis(el));

    __search('sombra');
    o.titleMatchShowsWholeSection = __vis(__sec('Efeitos').el) && __vis(document.getElementById('propShadowBlur')) && __vis(document.getElementById('propInnerShadow'));

    __search('shadowBlur');
    o.scriptPropNameFinds = __vis(document.getElementById('propShadowBlur'));

    __search('radius');
    o.englishPropKeyFinds = __vis(__sec('Cantos').el);

    __search('');
    fx.header.click();
    __search('sombra');
    o.searchOpensCollapsed = __vis(document.getElementById('propShadowBlur'));
    __search('');
    o.collapsedAgainAfterSearch = !__vis(document.getElementById('propShadowBlur'));
    fx.header.click();

    __search('xyz_nada');
    o.emptyMessage = __vis(inspSearchEmpty);
    o.emptyHidesAll = inspSections.every(s => !__vis(s.el));

    inspSearch.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    o.escClears = inspSearch.value === '' && __vis(document.getElementById('propX')) && !__vis(inspSearchEmpty) && __vis(__sec('Cantos').el);

    // Seção de outro tipo continua escondida mesmo casando com a busca
    __search('anel');
    o.typeHiddenStaysHidden = !__vis(__sec('sectionRing').el);
    __search('');

    // Atalho "/"
    document.body.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    o.slashFocuses = document.activeElement === inspSearch;
    inspSearch.blur();

    // Idioma: títulos mudam, chaves e busca em PT continuam valendo
    setLanguage('en');
    o.enHeader = __sec('Efeitos').header.textContent.includes('Effects');
    __search('effects');
    o.enSearch = __vis(document.getElementById('propShadowBlur'));
    __search('sombra');
    o.ptTermInEn = __vis(document.getElementById('propShadowBlur'));
    __search('');
    fx.header.click();
    o.chevronSurvivesTranslation = getComputedStyle(fx.header, '::before').content.includes('▸');
    fx.header.click();
    setLanguage('pt');

    // Persistência
    __sec('Borda / Moldura').header.click();
    return JSON.stringify(o);
  })()`));
  delete r.keys;
  for (const [k, v] of Object.entries(r)) check(k, v);

  await page.reload();
  await page.evaluate(HELPERS);
  const p = JSON.parse(await page.evaluate(`JSON.stringify({
    persisted: __sec('Borda / Moldura').el.classList.contains('insp-collapsed'),
    othersOpen: !__sec('Efeitos').el.classList.contains('insp-collapsed')
  })`));
  check('recolhido sobrevive a recarregar', p.persisted);
  check('só a seção recolhida volta recolhida', p.othersOpen);
  await page.evaluate(`localStorage.removeItem(INSPECTOR_UI_KEY); true`);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
