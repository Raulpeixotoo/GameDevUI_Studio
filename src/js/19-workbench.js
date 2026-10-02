    const SCRIPT_PRESETS = {
      upgradeStats: `// Tela "Upgrade Stats" (RPG de ação) com Texto, Anel e ícones SVG.
// "Upgrade Stats" screen (action RPG) with Text, Ring and SVG icons.
// Studio.tr('PT', 'EN'): os textos seguem o idioma da interface / texts follow the UI language.
// Tudo é criado em ordem: o que vem depois fica por cima / later items stack on top.
Studio.clear();
const tr = Studio.tr;
const { width: W, height: H } = Studio.canvas;
const bare = { fillOpacity: 0, borderWidth: 0, dropShadow: false, innerShadow: false, radius: 0 };
const label = (text, x, y, w, h, extra = {}) =>
  Studio.text(text, { name: tr('Texto: ', 'Text: ') + text.split('\\n')[0], x: Math.round(x), y: Math.round(y), w, h, fontFamily: 'Rajdhani', ...bare, ...extra });

// Fundo / Background
Studio.create('Painel', {
  name: tr('Fundo', 'Background'), x: 0, y: 0, w: W, h: H, radius: 0,
  fillType: 'gradient', gradientDir: 'radial', fillColor1: '#20252d', fillColor2: '#07080a',
  borderWidth: 0, dropShadow: false, innerShadow: false
});

// Cabeçalho / Header
const header = [
  label(tr('MELHORAR ATRIBUTOS', 'UPGRADE STATS'), W / 2 - 350, 28, 700, 64, { fontSize: 44, fontWeight: 300, letterSpacing: 6 }),
  label(tr('‹   L1   Resumo', '‹   L1   Summary'), 40, 36, 300, 44, { fontSize: 24, fontWeight: 500, textAlign: 'left', textColor: '#a1a1aa' }),
  label(tr('Cartas   R1   ›', 'Cards   R1   ›'), W - 340, 36, 300, 44, { fontSize: 24, fontWeight: 500, textAlign: 'right', textColor: '#a1a1aa' }),
  Studio.create('Barra', {
    name: tr('Selo: 3 DISPONÍVEIS', 'Badge: 3 AVAILABLE'), x: W - 250, y: 84, w: 210, h: 30, radius: 3, barValue: 100,
    gradientDir: 'vertical', fillColor1: '#1d4ed8', fillColor2: '#1e3a8a',
    borderWidth: 1, borderColor: '#60a5fa', borderStyle: 'glow', dropShadow: false, innerShadow: false,
    text: tr('3 DISPONÍVEIS', '3 AVAILABLE'), fontFamily: 'Rajdhani', fontSize: 17, fontWeight: 700, letterSpacing: 2
  })
];
Studio.group(header, tr('Cabeçalho', 'Header'));

// Cartas de atributo / Stat cards
const cardW = 384, cardH = 600, gap = 48, ringSize = 260;
const startX = Math.round((W - (cardW * 3 + gap * 2)) / 2), cardY = 140;
const stats = [
  { title: tr('AGILIDADE', 'AGILITY'), value: 9, pct: 45, c1: '#f97316', c2: '#fde047', cost: '500',
    bonus: tr('25 VEL ATQ\\n12 DEF', '25 ATK SPD\\n12 DEF'), next: tr('+3 VEL ATQ\\n+3 DEF', '+3 ATK SPD\\n+3 DEF'),
    perk: tr('GOLPE GÉLIDO', 'FROST STRIKE'), selected: true },
  { title: tr('VIDA', 'LIFE'), value: 12, pct: 60, c1: '#10b981', c2: '#86efac', cost: '1000',
    bonus: tr('220 PV\\n8,2 REGEN PV', '220 HP\\n8.2 HP REGEN'), next: tr('+12 PV\\n+2,1 REGEN PV', '+12 HP\\n+2.1 HP REGEN'),
    perk: tr('+POÇÃO AUTOMÁTICA', '+AUTO POTION') },
  { title: tr('MAGIA', 'MAGIC'), value: 4, pct: 22, c1: '#9333ea', c2: '#f0abfc', cost: '500',
    bonus: tr('25 DANO HAB\\n12 DEF', '25 ABL DMG\\n12 DEF'), next: tr('+3 DANO HAB\\n+3 DEF', '+3 ABL DMG\\n+3 DEF'),
    perk: tr('TEMPESTADE DE MANA', 'MANA STORM') }
];
const rings = [];

stats.forEach((s, i) => {
  const x = startX + i * (cardW + gap);
  const ringX = x + (cardW - ringSize) / 2, ringY = cardY + 36;
  const cy = ringY + ringSize / 2;
  const items = [
    Studio.create('Painel', {
      name: tr('Carta ', 'Card ') + s.title, x, y: cardY, w: cardW, h: cardH, radius: 3,
      fillType: 'gradient', gradientDir: 'diagonal',
      fillColor1: s.selected ? '#3a3d45' : '#16181c', fillColor2: s.selected ? '#111216' : '#0b0c0e', fillOpacity: 0.96,
      borderStyle: 'solid', borderWidth: s.selected ? 2 : 1, borderColor: s.selected ? '#a18a5b' : '#24272d',
      shadowBlur: 30, shadowOffsetY: 12, innerShadow: false
    }),
    // O arco termina no topo (-90°) e cresce para a esquerda / the arc ends at the top and grows left.
    Studio.create('Anel', {
      name: tr('Anel ', 'Ring ') + s.title, x: Math.round(ringX), y: ringY, w: ringSize, h: ringSize, text: '',
      ringValue: s.pct, ringThickness: 7, ringStart: -90 - s.pct * 3.6,
      ringColor1: s.c1, ringColor2: s.c2, ringTrackColor: '#0a0b0e', ringGlow: true
    }),
    label(String(s.value), x, cy - 70, cardW, 96, { fontSize: 88, fontWeight: 300 }),
    label(s.title, x, cy + 26, cardW, 32, { fontSize: 22, fontWeight: 500, letterSpacing: 4, textColor: '#d4d4d8' }),
    label('◉ ' + s.cost, x, cardY + 314, cardW, 36, { fontSize: 24, fontWeight: 600, textColor: '#e5c158' }),
    label(tr('BÔNUS\\n', 'BONUSES\\n') + s.bonus, x + 20, cardY + 380, cardW / 2 - 36, 96, { fontSize: 17, fontWeight: 600, textAlign: 'right', textVAlign: 'top', textColor: '#4ade80', lineHeight: 1.5 }),
    label(tr('PRÓXIMO\\n', 'NEXT\\n') + s.next, x + cardW / 2 + 16, cardY + 380, cardW / 2 - 36, 96, { fontSize: 17, fontWeight: 600, textAlign: 'left', textVAlign: 'top', textColor: '#4ade80', lineHeight: 1.5 }),
    label(s.perk, x, cardY + 492, cardW, 32, { fontSize: 18, fontWeight: 700, letterSpacing: 1.5, textColor: '#eab308' })
  ];
  rings.push({ cx: ringX + ringSize / 2, cy, r: ringSize / 2 - 5, items, title: s.title });
});

// Gemas: SVG desenhado 1:1 no tamanho do componente / Gems: SVG drawn 1:1 at the component size
const diamond = (s, fill, stroke, core) =>
  '<polygon points="' + s / 2 + ',2 ' + (s - 2) + ',' + s / 2 + ' ' + s / 2 + ',' + (s - 2) + ' 2,' + s / 2 + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>' +
  (core ? '<polygon points="' + s / 2 + ',' + s * 0.25 + ' ' + s * 0.75 + ',' + s / 2 + ' ' + s / 2 + ',' + s * 0.75 + ' ' + s * 0.25 + ',' + s / 2 + '" fill="' + core + '"/>' : '');
async function gem(ringIndex, angleDeg, size, fill, stroke, core) {
  const ring = rings[ringIndex];
  const a = angleDeg * Math.PI / 180;
  const g = Studio.create('Slot', {
    name: tr('Gema ', 'Gem ') + ring.title, ...bare,
    x: Math.round(ring.cx + ring.r * Math.cos(a) - size / 2), y: Math.round(ring.cy + ring.r * Math.sin(a) - size / 2), w: size, h: size
  });
  await Studio.setIcon(g, diamond(size, fill, stroke, core));
  ring.items.push(g);
}
await gem(0, -90, 44, '#18181b', '#78716c', '#ea580c');
await gem(0, 135, 50, '#431407', '#f59e0b', '#f97316');
await gem(0, 45, 44, '#141417', '#27272a', null);
await gem(1, -90, 44, '#111815', '#27352e', '#84cc16');
await gem(2, 135, 52, '#3b0764', '#e879f9', '#a855f7');
await gem(2, -20, 46, '#172554', '#60a5fa', '#3b82f6');
rings.forEach(r => Studio.group(r.items, tr('Carta ', 'Card ') + r.title));

// Ouro total e rodapé de comandos / Total gold and button prompts
label(tr('◉ 1.468', '◉ 1,468'), W / 2 - 200, cardY + cardH + 36, 400, 72, { fontSize: 56, fontWeight: 300, textColor: '#e5c158' });
const footer = [
  Studio.create('Painel', { name: tr('Rodapé', 'Footer'), x: 0, y: H - 72, w: W, h: 72, radius: 0, fillType: 'solid', fillColor1: '#050608', fillOpacity: 0.95, borderWidth: 1, borderColor: '#18181b', borderStyle: 'solid', dropShadow: false, innerShadow: false })
];
const prompts = [
  { key: '●', keyColor: '#ef4444', text: tr('Desfazer compra', 'Undo purchase'), x: 40 },
  { key: 'L2', keyColor: '#a1a1aa', text: tr('Inspecionar gemas', 'Inspect Gems'), x: 700 },
  { key: '✕', keyColor: '#60a5fa', text: tr('Comprar ponto de Agilidade', 'Buy Agility point'), x: 1040 },
  { key: '▼', keyColor: '#facc15', text: tr('Salvar e voltar', 'Save and Return'), x: W - 300 }
];
prompts.forEach(p => {
  footer.push(Studio.create('Slot', {
    name: tr('Tecla ', 'Key ') + p.key, x: p.x, y: H - 52, w: 34, h: 32, radius: 8, fillType: 'solid', fillColor1: '#18181b',
    borderWidth: 1.5, borderColor: '#52525b', borderStyle: 'solid', dropShadow: false, innerShadow: false,
    text: p.key, fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700, textColor: p.keyColor, textPadding: 0
  }));
  footer.push(label(p.text, p.x + 44, H - 56, 300, 40, { fontSize: 22, fontWeight: 500, textAlign: 'left', textColor: '#e4e4e7' }));
});
Studio.group(footer, tr('Rodapé', 'Footer'));
Studio.select([]);
console.log(tr('Upgrade Stats pronto: ', 'Upgrade Stats ready: ') + Studio.getAll().length + tr(' camadas.', ' layers.'));`,

      inventoryGrid: `// Grid de inventário 4x4 num painel com título, centralizado no canvas.
// 4x4 inventory grid in a titled panel, centered on the canvas.
const tr = Studio.tr;
const { width, height } = Studio.canvas;
const size = 96, gap = 12, cols = 4, rows = 4, pad = 40, header = 40;
const gridW = cols * size + (cols - 1) * gap;
const gridH = rows * size + (rows - 1) * gap;

const panel = Studio.create('Painel', {
  name: tr('Painel Inventário', 'Inventory Panel'),
  w: gridW + pad * 2,
  h: gridH + pad * 2 + header,
  x: Math.round((width - gridW) / 2 - pad),
  y: Math.round((height - gridH - header) / 2 - pad)
});

const title = Studio.text(tr('INVENTÁRIO', 'INVENTORY'), {
  name: tr('Título Inventário', 'Inventory Title'), x: panel.x + pad, y: panel.y + 22, w: gridW, h: 40,
  fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, letterSpacing: 3, textAlign: 'left', textColor: '#e4e4e7'
});

const slots = Studio.createGrid({
  rows, cols, size, gap, type: 'Slot', name: 'Inv',
  x: panel.x + pad, y: panel.y + pad + header, group: false
});

Studio.group([panel, title, ...slots], tr('Inventário 4x4', 'Inventory 4x4'));
console.log(tr('Criados ', 'Created ') + slots.length + ' slots.');`,

      rpgHud: `// HUD de RPG: retrato, barras de status com rótulo, XP e hotbar.
// RPG HUD: portrait, labeled status bars, XP and hotbar.
const tr = Studio.tr;
const { width, height } = Studio.canvas;
const m = 32;

const portrait = Studio.create('Slot', {
  name: tr('HUD Retrato', 'HUD Portrait'), x: m, y: m, w: 128, h: 128, radius: 64,
  borderStyle: 'glow', borderColor: '#f59e0b', borderWidth: 4
});

const bars = [
  { name: tr('HUD Vida', 'HUD Health'), text: tr('VIDA 850/1000', 'HEALTH 850/1000'), value: 85, c1: '#dc2626', c2: '#7f1d1d', border: '#ef4444' },
  { name: tr('HUD Mana', 'HUD Mana'), text: tr('MANA 420/600', 'MANA 420/600'), value: 70, c1: '#2563eb', c2: '#1e3a8a', border: '#60a5fa' },
  { name: tr('HUD Vigor', 'HUD Stamina'), text: tr('VIGOR 90%', 'STAMINA 90%'), value: 90, c1: '#16a34a', c2: '#14532d', border: '#4ade80' }
].map((b, i) => Studio.create('Barra', {
  name: b.name, x: m + 148, y: m + 12 + i * 40, w: 360, h: 28, barValue: b.value,
  fillColor1: b.c1, fillColor2: b.c2, borderColor: b.border,
  text: b.text, fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, letterSpacing: 1
}));

Studio.create('Barra', {
  name: tr('HUD XP', 'HUD XP'), x: m, y: height - m - 14, w: width - m * 2, h: 14, radius: 7,
  fillColor1: '#a855f7', fillColor2: '#581c87', borderColor: '#c084fc', borderWidth: 1
});

Studio.group([portrait, ...bars], tr('HUD Status', 'HUD Status'));
Studio.createGrid({ rows: 1, cols: 8, size: 72, gap: 8, name: tr('Atalho', 'Hotbar'), y: height - m - 14 - 16 - 72, group: tr('HUD Atalhos', 'HUD Hotbar') });
console.log(tr('HUD RPG criado.', 'RPG HUD created.'));`,

      hotbar: `// Hotbar de 1 a 8 centralizada na base da tela / 1-8 hotbar centered at the bottom
const tr = Studio.tr;
const { height } = Studio.canvas;
const slots = Studio.createGrid({
  rows: 1, cols: 8, size: 80, gap: 10, type: 'Slot',
  name: tr('Atalho', 'Hotbar'), y: height - 80 - 40, group: tr('Barra de atalhos 1-8', 'Hotbar 1-8')
});
console.log(slots.length + tr(' slots criados.', ' slots created.'));`,

      recolorButtons: `// Pinta todos os botões com um tema dourado / Paints every button with a gold theme
const tr = Studio.tr;
const botoes = Studio.updateAll('Botão', {
  fillColor1: '#8a6a1f', fillColor2: '#3d2c07',
  borderColor: '#fbbf24', borderStyle: 'bevel', borderWidth: 3
});
console.log(botoes.length + tr(' botão(ões) atualizado(s).', ' button(s) updated.'));`,

      alignH: `// Distribui a seleção na horizontal e alinha pelo centro vertical.
// Distributes the selection horizontally and aligns the vertical centers.
// (selecione os itens com Shift+clique ANTES de abrir a bancada / select with Shift+click first)
const tr = Studio.tr;
const sel = Studio.getSelected();
if (sel.length < 2) throw new Error(tr('Selecione 2 ou mais itens (Shift+clique).', 'Select 2 or more items (Shift+click).'));
Studio.distribute(sel, 'x');
Studio.align(sel, 'centerY');
console.log(sel.length + tr(' itens distribuídos.', ' items distributed.'));`
    };

    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    let scriptRunning = false;

    function formatLogValue(value) {
      if (typeof value === 'string') return value;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      try {
        // Esconde objetos Image e o base64 das imagens para o log continuar legível.
        return JSON.stringify(value, (key, val) => {
          if (key === 'icon') return undefined;
          if (key === 'iconSrc' && val) return '[imagem]';
          return val;
        }, 2);
      } catch (err) {
        return String(value);
      }
    }

    function appendScriptLog(kind, parts) {
      const colors = {
        log: 'text-zinc-300',
        warn: 'text-amber-300',
        error: 'text-red-400',
        result: 'text-emerald-400',
        meta: 'text-zinc-600'
      };
      const line = document.createElement('div');
      line.className = `${colors[kind] || colors.log} whitespace-pre-wrap break-words`;
      line.textContent = parts.map(formatLogValue).join(' ');
      scriptOutputLog.appendChild(line);
      scriptOutputLog.parentElement.scrollTop = scriptOutputLog.parentElement.scrollHeight;
    }

    async function runScript() {
      const code = scriptCodeInput.value;
      if (scriptRunning || !code.trim()) return;
      scriptRunning = true;
      btnRunScript.disabled = true;

      const scriptConsole = {
        log: (...args) => appendScriptLog('log', args),
        info: (...args) => appendScriptLog('log', args),
        warn: (...args) => appendScriptLog('warn', args),
        error: (...args) => appendScriptLog('error', args)
      };

      // Template pronto rodado sem edição: guarda o "antes" para refazer no outro idioma (setLanguage).
      const presetKey = Object.keys(SCRIPT_PRESETS).find(k => SCRIPT_PRESETS[k] === code) || null;
      const before = presetKey ? snapshotDocument() : null;

      const t0 = performance.now();
      try {
        const fn = new AsyncFunction('Studio', 'figma', 'console', code);
        const result = await fn(Studio, Studio, scriptConsole);
        lastPresetRun = presetKey ? { key: presetKey, before, signature: null } : null;
        if (result !== undefined) appendScriptLog('result', ['←', result]);
        appendScriptLog('meta', [t('✓ executado em {ms} ms', { ms: Math.round(performance.now() - t0) })]);
      } catch (err) {
        lastPresetRun = null;
        appendScriptLog('error', [`✗ ${err && err.name ? err.name : 'Erro'}: ${err && err.message ? err.message : err}`]);
      } finally {
        scriptRunning = false;
        btnRunScript.disabled = false;
        refreshAll();
        if (lastPresetRun && !lastPresetRun.signature) lastPresetRun.signature = sceneSignature();
      }
    }

    // ---- Templates bilíngues (R7) ----
    // Os templates usam Studio.tr. Se o último script rodado foi um template sem edição e a cena não
    // mudou desde então, trocar o idioma volta ao "antes" e roda o template de novo no outro idioma
    // (mesma ideia da cena de boas-vindas). Qualquer mudança na cena desliga isso.
    let lastPresetRun = null;

    async function rerunPresetInNewLanguage() {
      const run = lastPresetRun;
      if (!run || !run.signature || sceneSignature() !== run.signature) return false;
      restoreSnapshot(run.before);
      toastMuted = true;
      renderSuspended = true;
      try {
        await new AsyncFunction('Studio', 'figma', 'console', SCRIPT_PRESETS[run.key])(Studio, Studio, { log() {}, info() {}, warn() {}, error() {} });
      } catch (err) {
        console.warn('Template não pôde ser refeito:', err);
      } finally {
        toastMuted = false;
        renderSuspended = false;
      }
      refreshAll();
      run.signature = sceneSignature();
      return true;
    }

    btnRunScript.addEventListener('click', runScript);
    btnClearScriptCode.addEventListener('click', () => {
      scriptCodeInput.value = '';
      scriptCodeInput.focus();
    });
    btnClearScriptOutput.addEventListener('click', () => {
      scriptOutputLog.innerHTML = '';
    });

    SCRIPT_PRESETS.welcome = welcomeScenePresetCode();
    SCRIPT_PRESETS.showcase4k = showcaseScenePresetCode();

    document.querySelectorAll('.script-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = SCRIPT_PRESETS[btn.dataset.preset];
        if (!preset) return;
        scriptCodeInput.value = preset;
        scriptCodeInput.focus();
      });
    });

    scriptCodeInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runScript();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const start = scriptCodeInput.selectionStart;
        const end = scriptCodeInput.selectionEnd;
        scriptCodeInput.setRangeText('  ', start, end, 'end');
      }
    });

