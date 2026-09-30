// Script da seleção (R7, B2; TDD no DOCS 2.8). Critério de aceite: round-trip da cena de boas-vindas.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('selection-script', 9355);
const j = (expr) => page.evaluate(`(async () => JSON.stringify(await (async () => { ${expr} })()))()`).then(JSON.parse);

// Foto comparável da cena: todas as props do modelo menos id/groupId, mais a imagem e o nome do grupo.
const SNAP = `
  const snap = () => Studio.getAll().map(c => {
    const o = {};
    Object.keys(COMPONENT_DEFAULTS).forEach(k => { if (!['groupId', 'icon'].includes(k)) o[k] = typeof c[k] === 'number' ? Math.round(c[k] * 100) / 100 : c[k]; });
    o.name = c.name; o.type = c.type;
    o.group = c.groupId ? (state.groups.find(g => g.id === c.groupId) || {}).name : null;
    return o;
  });
  const run = (code) => new (Object.getPrototypeOf(async function () {}).constructor)('Studio', 'figma', 'console', code)(Studio, Studio, console);
`;

try {
  await page.open();

  const rt = await j(`${SNAP}
    const before = snap();
    const code = selectionToScript(null);
    Studio.clear();
    await run(code);
    const after = snap();
    const diffs = [];
    if (before.length !== after.length) diffs.push('count ' + before.length + ' vs ' + after.length);
    before.forEach((b, i) => {
      const a = after[i] || {};
      Object.keys(b).forEach(k => { if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) diffs.push(b.name + '.' + k + ': ' + JSON.stringify(b[k]).slice(0, 40) + ' → ' + JSON.stringify(a[k]).slice(0, 40)); });
    });
    return { n: before.length, icons: before.filter(c => c.iconSrc).length, groups: new Set(before.map(c => c.group).filter(Boolean)).size, diffs: diffs.slice(0, 12), lines: code.split('\\n').length };
  `);
  check('round-trip da cena de boas-vindas: idêntica', rt.diffs.length === 0 && rt.n >= 40, JSON.stringify(rt));
  check('round-trip cobre ícones e grupos', rt.icons >= 4 && rt.groups === 4, `${rt.icons} ícones, ${rt.groups} grupos`);

  const lean = await j(`
    Studio.clear();
    Studio.create('Slot', { name: 'Só posição', x: 100, y: 50 });
    const code = Studio.toScript('Só posição', { relative: false });
    return code.split('\\n').find(l => l.startsWith('const '));
  `);
  check('só entram props que diferem do preset', lean === `const soPosicao = Studio.create("Slot", { name: "Só posição", x: 100, y: 50, w: 96, h: 96 });`, lean);

  const rel = await j(`${SNAP}
    Studio.clear();
    Studio.create('Painel', { name: 'Janela', x: 600, y: 300, w: 400, h: 200 });
    Studio.text('TÍTULO', { name: 'Título', x: 620, y: 310, w: 360, h: 40 });
    Studio.group(['Janela', 'Título'], 'Janela Inv');
    const code = Studio.toScript(['Janela', 'Título']);
    Studio.clear();
    await run(code.replace('const ox = 600, oy = 300;', 'const ox = 100, oy = 50;'));
    return { code, got: Studio.getAll().map(c => [c.name, c.x, c.y]), group: state.groups.map(g => g.name) };
  `);
  check('posição relativa: ox/oy no topo e x: ox + dx', rel.code.includes('const ox = 600, oy = 300;') && rel.code.includes('x: ox + 20, y: oy + 10'), rel.code);
  check('mudar ox/oy recria o conjunto em outro lugar', JSON.stringify(rel.got) === '[["Janela",100,50],["Título",120,60]]', JSON.stringify(rel.got));
  check('grupo recriado com o nome', rel.group.join() === 'Janela Inv');
  check('Texto usa Studio.text', rel.code.includes('Studio.text("TÍTULO", {'));

  const evil = await j(`${SNAP}
    Studio.clear();
    Studio.create('Botão', { name: 'a"); alert(1); ("', text: '</script><img src=x>\\nlinha 2' });
    Studio.create('Slot', { name: 'class' });
    Studio.create('Slot', { name: 'Slot' });
    Studio.create('Slot', { name: 'Slot' });
    Studio.create('Slot', { name: '3 corações ♥' });
    const before = snap();
    const code = Studio.toScript(Studio.getAll());
    let alerted = false;
    const origAlert = window.alert; window.alert = () => { alerted = true; };
    Studio.clear();
    await run(code);
    window.alert = origAlert;
    const vars = [...code.matchAll(/^const (\\w+) = Studio/gm)].map(m => m[1]);
    return { same: JSON.stringify(snap()) === JSON.stringify(before), alerted, vars };
  `);
  check('nome e texto maliciosos viram string, não código', evil.same && !evil.alerted, JSON.stringify(evil));
  check('variáveis únicas e válidas (palavra reservada, repetidos, número no início)', evil.vars.join() === 'aAlert1,classItem,slot,slot2,item3Coracoes', evil.vars.join());

  const icons = await j(`
    Studio.clear();
    const small = Studio.create('Slot', { name: 'Pequeno' });
    await Studio.setIcon(small, '<circle cx="48" cy="48" r="30" fill="#f00"/>');
    const big = Studio.create('Slot', { name: 'Grande' });
    big.iconSrc = 'data:image/png;base64,' + 'A'.repeat(300 * 1024);
    const embed = Studio.toScript(['Pequeno', 'Grande']);
    const omit = Studio.toScript(['Pequeno'], { icons: 'omit' });
    big.iconSrc = null;
    return {
      smallEmbedded: /await Studio\\.setIcon\\(pequeno, "data:image\\/svg\\+xml/.test(embed),
      bigOmitted: /\\/\\/ await Studio\\.setIcon\\(grande, 'data:image\\/\\.\\.\\.'\\); \\/\\/ imagem de 301 KB omitida/.test(embed),
      omitOption: !omit.includes('await Studio.setIcon(pequeno, "data') && omit.includes('// await Studio.setIcon(pequeno')
    };
  `);
  check('imagem pequena vai embutida', icons.smallEmbedded);
  check('imagem acima de 200 KB vira comentário', icons.bigOmitted);
  check('opção icons: "omit"', icons.omitOption);

  const pure = await j(`
    Studio.clear();
    Studio.create('Slot', { name: 'A' }); Studio.create('Botão', { name: 'B' });
    Studio.select('A');
    const before = JSON.stringify({ n: state.nextId, sel: state.selectedIds, g: state.nextGroupId, h: history.undo.length, count: state.components.length });
    Studio.toScript();
    selectionToScript(null);
    const after = JSON.stringify({ n: state.nextId, sel: state.selectedIds, g: state.nextGroupId, h: history.undo.length, count: state.components.length });
    return before === after;
  `);
  check('gerar não mexe no state (nextId, seleção, histórico)', pure);

  const ui = await j(`
    Studio.clear();
    Studio.create('Slot', { name: 'Um' }); Studio.create('Slot', { name: 'Dois' });
    Studio.select('Dois');
    document.getElementById('btnExportScript').click();
    const code = document.getElementById('scriptCodeInput').value;
    const open = !document.getElementById('scriptWorkbenchModal').classList.contains('hidden');
    toggleScriptModal(false);
    Studio.select([]);
    document.getElementById('btnScriptFromSelection').click();
    const all = document.getElementById('scriptCodeInput').value;
    toggleScriptModal(false);
    return { open, one: code.includes('name: "Dois"') && !code.includes('name: "Um"'), all: all.includes('"Um"') && all.includes('"Dois"'), count: Studio.getAll().length };
  `);
  check('menu Exportar → Script abre a Bancada com a seleção', ui.open && ui.one, JSON.stringify(ui));
  check('📋 Da seleção sem seleção gera a cena e não executa', ui.all && ui.count === 2, JSON.stringify(ui));

  check('sem erros no console', page.errors.length === 0, page.errors.join(' | '));
} catch (err) {
  check('execução sem exceção', false, err.message);
} finally {
  page.close();
  finish();
}
