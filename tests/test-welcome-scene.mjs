// Cena de boas-vindas (R6): monta em PT na primeira visita, refaz ao trocar o idioma enquanto
// ninguém mexeu, preserva a cena depois de editada e existe como preset da Bancada.
import fs from 'node:fs';
import { launch, reporter, sleep } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('welcome', 9347);
const SHOT = process.env.WELCOME_SHOT; // caminho opcional para salvar um screenshot da cena

const scene = () => page.evaluate(`JSON.stringify({
  lang: document.documentElement.lang,
  n: Studio.getAll().length,
  names: Studio.getAll().map(c => c.name),
  groups: state.groups.map(g => g.name),
  bgLocked: Studio.getAll()[0].locked === true,
  selected: (Studio.getSelected()[0] || {}).name,
  icons: Studio.getAll().filter(c => c.type === 'Slot' && c.icon && c.icon.naturalWidth > 0).length,
  undo: history.undo.length,
  pristine: isPristineWelcomeScene()
})`).then(JSON.parse);

try {
  await page.open();
  const a = await scene();
  check('primeira visita abre em PT', a.lang === 'pt-BR', a.lang);
  check('cena de boas-vindas montada', a.names.includes('Título Principal') && a.n >= 40, `${a.n} itens`);
  check('4 grupos em PT', a.groups.length === 4 && a.groups[0] === '01. Boas-vindas (Header)', a.groups.join(' | '));
  check('fundo trancado', a.bgLocked);
  check('poção selecionada', a.selected === 'Slot: Poção de Vida', a.selected);
  check('4 ícones SVG carregados', a.icons === 4, String(a.icons));
  check('Ctrl+Z não desmonta a cena inicial', a.undo === 0, String(a.undo));
  check('cena marcada como intocada', a.pristine);

  if (SHOT) {
    await page.evaluate('fitCanvasToViewport(), true');
    await sleep(400);
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'));
  }

  // Trocar para EN refaz a cena
  await page.evaluate(`(async () => { setLanguage('en'); await welcomeQueue; return true; })()`);
  const b = await scene();
  check('trocar para EN refaz a cena em inglês', b.names.includes('Main Title') && !b.names.includes('Título Principal'));
  check('grupos em EN', b.groups[0] === '01. Welcome Header', b.groups[0]);
  check('mesma quantidade de itens', b.n === a.n, `${b.n} vs ${a.n}`);

  // Recarregar mantém EN e a troca continua funcionando
  await sleep(700);
  await page.reload();
  const c = await scene();
  check('recarregar mantém a cena em EN (autosave)', c.lang === 'en' && c.names.includes('Main Title'));
  check('continua intocada depois de recarregar', c.pristine);
  await page.evaluate(`(async () => { setLanguage('pt'); await welcomeQueue; return true; })()`);
  const d = await scene();
  check('volta para PT depois de recarregar', d.names.includes('Título Principal'));

  // Depois de editada, a troca de idioma não apaga o trabalho
  await page.evaluate(`(async () => {
    Studio.update('Título Principal', { text: 'MEU JOGO' });
    setLanguage('en'); await welcomeQueue; return true;
  })()`);
  const e = await page.evaluate(`JSON.stringify({ kept: !!Studio.get('Título Principal') && Studio.get('Título Principal').text === 'MEU JOGO', ui: t('Excluir') !== undefined })`).then(JSON.parse);
  check('cena editada não é refeita ao trocar o idioma', e.kept);

  // Preset da Bancada
  const f = JSON.parse(await page.evaluate(`(async () => {
    const code = SCRIPT_PRESETS.welcome;
    const btn = document.querySelector('.script-preset-btn[data-preset="welcome"]');
    const fn = new AsyncFunction('Studio', 'figma', 'console', code);
    const result = await fn(Studio, Studio, console);
    return JSON.stringify({ hasCode: code.startsWith('//') && code.includes('Studio.clear()'), btn: btn && btn.textContent.trim(),
      result, n: Studio.getAll().length, en: !!Studio.get('Main Title') });
  })()`));
  check('preset "Boas-vindas" com o código da cena', f.hasCode);
  check('botão do preset traduzido', f.btn === '👋 Welcome', f.btn);
  check('preset roda na Bancada e remonta a cena', f.n === a.n && f.en && /Welcome Scene/.test(f.result), `${f.n} ${f.result}`);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução do teste', false, err.stack || String(err));
} finally {
  page.close();
}
finish();
