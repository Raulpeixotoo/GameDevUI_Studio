// Templates bilíngues (R7): cada template roda nos dois idiomas sem erro, gera nomes/textos no idioma
// da interface e, rodado sem edição, se refaz ao trocar o idioma enquanto a cena não mudar.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('templates-i18n', 9358);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);

try {
  await page.open();

  const all = await j(`
    localStorage.removeItem(WELCOME_KEY); // a cena de boas-vindas intocada se refaria sozinha ao trocar o idioma
    await welcomeQueue;
    const out = {};
    for (const lang of ['pt', 'en']) {
      setLanguage(lang);
      for (const key of Object.keys(SCRIPT_PRESETS).filter(k => k !== 'welcome')) {
        Studio.clear();
        Studio.create('Botão', { name: 'B1', x: 100, y: 100 }); Studio.create('Botão', { name: 'B2', x: 400, y: 100 });
        Studio.select(['B1', 'B2']);
        try {
          await new AsyncFunction('Studio', 'figma', 'console', SCRIPT_PRESETS[key])(Studio, Studio, { log() {} });
          out[lang + ':' + key] = { ok: true, names: Studio.getAll().map(c => c.name), groups: state.groups.map(g => g.name), texts: Studio.getAll().map(c => c.text).filter(Boolean),
            res: state.canvasWidth + 'x' + state.canvasHeight, anchored: Studio.getAll().filter(c => c.anchorH !== 'left' || c.anchorV !== 'top').length,
            icons: Studio.getAll().filter(c => c.icon).length };
          Studio.setResolution(1920, 1080);
        } catch (e) { out[lang + ':' + key] = { ok: false, err: e.message }; }
      }
    }
    setLanguage('pt');
    return out;
  `);
  const failed = Object.entries(all).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.err}`);
  const presetCount = await page.evaluate(`Object.keys(SCRIPT_PRESETS).filter(k => k !== 'welcome').length`);
  check('todos os templates rodam em PT e EN sem erro', failed.length === 0 && Object.keys(all).length === presetCount * 2 && presetCount >= 7, failed.join(' | ') || `${Object.keys(all).length} execuções`);
  const sc = all['pt:showcase4k'], scEn = all['en:showcase4k'];
  check('Vitrine 4K: cena 3840×2160 com 170+ peças em 16 grupos', sc.res === '3840x2160' && sc.names.length >= 170 && sc.groups.length === 16, `${sc.res} ${sc.names.length} peças ${sc.groups.length} grupos`);
  check('Vitrine 4K: blocos ancorados e ícones SVG carregados', sc.anchored > 100 && sc.icons >= 40, `${sc.anchored} ancorados, ${sc.icons} ícones`);
  check('Vitrine 4K: textos no idioma', sc.texts.includes('SENHOR DAS CINZAS') && scEn.texts.includes('LORD OF ASH') && scEn.groups.includes('07. Inventory'));
  check('Upgrade Stats em PT', all['pt:upgradeStats'].texts.includes('MELHORAR ATRIBUTOS') && all['pt:upgradeStats'].groups.includes('Rodapé'));
  check('Upgrade Stats em EN', all['en:upgradeStats'].texts.includes('UPGRADE STATS') && all['en:upgradeStats'].groups.includes('Footer'));
  check('Inventário: título e grupo no idioma', all['pt:inventoryGrid'].texts.includes('INVENTÁRIO') && all['en:inventoryGrid'].groups.includes('Inventory 4x4'));
  check('HUD: barras com rótulo no idioma', all['pt:rpgHud'].texts.includes('VIDA 850/1000') && all['en:rpgHud'].texts.includes('HEALTH 850/1000'));
  check('Hotbar: grupo no idioma', all['pt:hotbar'].groups.includes('Barra de atalhos 1-8') && all['en:hotbar'].groups.includes('Hotbar 1-8'));
  const leftovers = Object.entries(all).filter(([k]) => k.startsWith('en:')).flatMap(([k, v]) => (v.names || []).concat(v.groups || []).filter(n => /Painel|Rodapé|Retrato|Vida|Carta|Tecla|Gema|Título|Fundo|Atalho/.test(n)).map(n => k + ' → ' + n));
  check('em EN não sobra nome em PT', leftovers.length === 0, leftovers.slice(0, 6).join(' | '));

  const swap = await j(`
    setLanguage('pt');
    Studio.clear();
    Studio.create('Painel', { name: 'Já existia', x: 20, y: 20 });
    await new Promise(r => setTimeout(r, 700));
    scriptCodeInput.value = SCRIPT_PRESETS.inventoryGrid;
    await runScript();
    const pt = Studio.getAll().map(c => c.name);
    setLanguage('en');
    await new Promise(r => setTimeout(r, 100));
    const en = Studio.getAll().map(c => c.name);
    return { pt, en };
  `);
  check('trocar idioma refaz o template no outro idioma', swap.en.includes('Inventory Panel') && !swap.en.includes('Painel Inventário'), JSON.stringify(swap.en.slice(0, 4)));
  check('o que já existia antes do template continua (sem duplicar)', swap.en.filter(n => n === 'Já existia').length === 1 && swap.en.length === swap.pt.length, `${swap.pt.length} → ${swap.en.length}`);

  const edited = await j(`
    setLanguage('pt');
    Studio.clear();
    scriptCodeInput.value = SCRIPT_PRESETS.hotbar;
    await runScript();
    Studio.update(Studio.getAll()[0], { x: 5 }); // mexeu na cena
    setLanguage('en');
    await new Promise(r => setTimeout(r, 100));
    const groups = state.groups.map(g => g.name);
    setLanguage('pt');
    return groups;
  `);
  check('cena editada depois do template: trocar idioma não refaz', edited.includes('Barra de atalhos 1-8'), JSON.stringify(edited));

  const custom = await j(`
    setLanguage('pt');
    Studio.clear();
    scriptCodeInput.value = SCRIPT_PRESETS.hotbar + '\\n// editado';
    await runScript();
    setLanguage('en');
    await new Promise(r => setTimeout(r, 100));
    const groups = state.groups.map(g => g.name);
    setLanguage('pt');
    return groups;
  `);
  check('código de template editado não é refeito', custom.includes('Barra de atalhos 1-8'), JSON.stringify(custom));

  const api = await j(`setLanguage('en'); const a = [Studio.lang, Studio.tr('olá', 'hello')]; setLanguage('pt'); return a.concat([Studio.lang, Studio.tr('olá', 'hello')]);`);
  check('Studio.lang e Studio.tr', api.join() === 'en,hello,pt,olá', api.join());

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
