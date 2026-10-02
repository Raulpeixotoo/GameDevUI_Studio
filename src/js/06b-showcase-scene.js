    // ===== Vitrine 4K (R8) =====
    // Template "🏆 Vitrine 4K" da Bancada: um HUD de RPG completo em 3840×2160 que usa quase tudo que o Studio faz.
    // O preset mostra o corpo desta função (como a cena de boas-vindas), então editar aqui atualiza os dois.
    async function showcaseSceneScript(Studio) {
      // 🏆 VITRINE 4K — um HUD completo de RPG sci-fantasia usando praticamente tudo que o Studio faz.
      // 🏆 4K SHOWCASE — a full sci-fantasy RPG HUD using nearly everything the Studio can do.
      // Desenhado em unidades de 1920×1080 e multiplicado por S = 2 (3840×2160).
      // Cada bloco vira um grupo com âncoras próprias: troque a resolução (ex.: 2560×1440) e veja o HUD se ajustar.
      const tr = Studio.tr;
      const S = 2;
      const PX = ['x', 'y', 'w', 'h', 'radius', 'borderWidth', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'innerShadowSize',
        'fontSize', 'letterSpacing', 'textPadding', 'textStrokeWidth', 'ringThickness', 'scanlineSpacing'];
      const sc = (p) => { const o = { ...p }; PX.forEach(k => { if (typeof o[k] === 'number') o[k] = Math.round(o[k] * S * 100) / 100; }); return o; };
      let anchor = {};
      const make = (type, props) => Studio.create(type, sc({ ...anchor, ...props }));
      const bare = { fillOpacity: 0, borderWidth: 0, dropShadow: false, innerShadow: false, radius: 0 };
      const text = (content, props) => Studio.text(content, sc({ ...anchor, ...bare, fontFamily: 'Rajdhani', textAlign: 'left', ...props }));
      const svg = (body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + '</svg>';
      const icon = (comp, name, scale = 0.72) => Studio.setIcon(comp, svg(ICONS[name]), { fit: 'contain', scale, opacity: 1 });
      const card = (props) => make('Painel', {
        radius: 14, fillType: 'gradient', gradientDir: 'vertical', fillColor1: '#161c2c', fillColor2: '#0a0d16', fillOpacity: 0.94,
        borderStyle: 'solid', borderWidth: 1.5, borderColor: '#2a3550', shadowBlur: 30, shadowOffsetY: 12, shadowOpacity: 0.7, innerShadow: false, ...props
      });
      const heading = (t, x, y, w, color = '#7dd3fc') =>
        text(t, { name: tr('Título: ', 'Title: ') + t, x, y, w, h: 26, fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, letterSpacing: 3, textColor: color });
      // Cada seção vira um grupo, com a âncora dela aplicada a todas as peças.
      async function section(name, anchorH, anchorV, build) {
        const before = new Set(Studio.getAll().map(c => c.id));
        anchor = { anchorH, anchorV };
        await build();
        anchor = {};
        const created = Studio.getAll().filter(c => !before.has(c.id));
        if (created.length) Studio.group(created, name);
      }

      // Ícones em SVG (viewBox 64×64), aplicados com Studio.setIcon.
      const ICONS = {
        potion: '<path d="M26 6h12v6h-2v8c8 3 14 10 14 19 0 11-8 19-18 19S14 50 14 39c0-9 6-16 14-19v-8h-2z" fill="#3b0d14" stroke="#fda4af" stroke-width="2.5"/><path d="M17 40c0 9 7 15 15 15s15-6 15-15c-6 3-12-2-15 0s-9 3-15 0z" fill="#e11d48"/><circle cx="25" cy="44" r="3" fill="#fecdd3"/>',
        sword: '<polygon points="50,6 58,6 58,14 30,42 22,34" fill="#e2e8f0" stroke="#ffffff" stroke-width="1.5"/><line x1="17" y1="31" x2="33" y2="47" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/><line x1="24" y1="40" x2="11" y2="53" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><circle cx="9" cy="55" r="5" fill="#fbbf24"/>',
        shield: '<path d="M32 5l22 8v16c0 15-10 25-22 30C20 54 10 44 10 29V13z" fill="#1e3a8a" stroke="#93c5fd" stroke-width="3"/><path d="M32 14v36M18 26h28" stroke="#fbbf24" stroke-width="4"/>',
        gem: '<polygon points="32,6 54,24 32,58 10,24" fill="#7e22ce" stroke="#f0abfc" stroke-width="2.5"/><polygon points="32,6 42,24 32,58 22,24" fill="#c084fc"/><line x1="10" y1="24" x2="54" y2="24" stroke="#f5d0fe" stroke-width="2"/>',
        key: '<circle cx="20" cy="20" r="11" fill="none" stroke="#fbbf24" stroke-width="6"/><path d="M28 28l24 24M42 42l6-6M48 48l6-6" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>',
        scroll: '<rect x="14" y="12" width="36" height="40" rx="4" fill="#fef3c7" stroke="#b45309" stroke-width="3"/><circle cx="14" cy="16" r="6" fill="#d97706"/><circle cx="50" cy="48" r="6" fill="#d97706"/><path d="M22 24h20M22 32h20M22 40h14" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>',
        bow: '<path d="M16 6c26 8 26 44 0 52" fill="none" stroke="#a16207" stroke-width="6" stroke-linecap="round"/><line x1="16" y1="6" x2="16" y2="58" stroke="#e5e7eb" stroke-width="1.5"/><path d="M10 32h44M46 26l8 6-8 6" stroke="#e2e8f0" stroke-width="3" fill="none" stroke-linecap="round"/>',
        helmet: '<path d="M10 40c0-17 10-30 22-30s22 13 22 30v10H10z" fill="#475569" stroke="#cbd5e1" stroke-width="3"/><rect x="18" y="32" width="28" height="8" rx="2" fill="#0f172a"/><path d="M32 10v18" stroke="#f59e0b" stroke-width="4"/>',
        coin: '<circle cx="32" cy="32" r="24" fill="#ca8a04" stroke="#fde047" stroke-width="4"/><circle cx="32" cy="32" r="15" fill="none" stroke="#fef08a" stroke-width="2"/><path d="M32 22v20M26 27h12" stroke="#fef9c3" stroke-width="4" stroke-linecap="round"/>',
        heart: '<path d="M32 54L10 32C2 24 6 10 18 10c6 0 10 4 14 9 4-5 8-9 14-9 12 0 16 14 8 22z" fill="#e11d48" stroke="#fecdd3" stroke-width="2.5"/>',
        bolt: '<polygon points="36,4 12,36 30,36 26,60 52,26 34,26" fill="#facc15" stroke="#fef9c3" stroke-width="2"/>',
        skull: '<path d="M32 6c14 0 24 10 24 23 0 8-4 13-10 16v9H18v-9C12 42 8 37 8 29 8 16 18 6 32 6z" fill="#e5e7eb" stroke="#ffffff" stroke-width="2"/><circle cx="23" cy="30" r="6" fill="#111827"/><circle cx="41" cy="30" r="6" fill="#111827"/><path d="M26 54v-6M32 54v-6M38 54v-6" stroke="#111827" stroke-width="3"/>',
        fire: '<path d="M32 58c-12 0-20-8-20-19 0-12 10-18 12-30 6 6 8 12 8 16 2-4 4-8 3-14 10 8 17 18 17 28 0 11-8 19-20 19z" fill="#f97316" stroke="#fed7aa" stroke-width="2"/><path d="M32 56c-6 0-10-4-10-10 0-6 6-9 7-15 5 5 13 9 13 15 0 6-4 10-10 10z" fill="#fde047"/>',
        ice: '<path d="M32 6v52M10 19l44 26M54 19L10 45" stroke="#bae6fd" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="32" r="7" fill="#38bdf8"/>',
        check: '<path d="M14 34l12 12 24-26" fill="none" stroke="#4ade80" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
      };

      await Studio.batch(async () => {
        Studio.clear();
        Studio.clearGuides();
        Studio.setResolution(1920 * S, 1080 * S);

        // 01. Fundo: gradiente radial com grão de filme, runa decorativa girada. Trancados: o clique atravessa.
        await section(tr('01. Fundo', '01. Background'), 'stretch', 'stretch', async () => {
          make('Painel', { name: tr('Fundo', 'Background'), x: 0, y: 0, w: 1920, h: 1080, radius: 0, fillType: 'gradient', gradientDir: 'radial',
            fillColor1: '#1b2440', fillColor2: '#03040a', borderWidth: 0, dropShadow: false, innerShadow: false, noise: 0.06, locked: true });
          make('Forma', { name: tr('Runa decorativa', 'Decorative rune'), x: 640, y: 180, w: 640, h: 640, shapeKind: 'polygon', shapeSides: 6, rotation: 15,
            fillOpacity: 0.03, fillType: 'solid', fillColor1: '#38bdf8', borderStyle: 'dashed', borderWidth: 2, borderColor: '#38bdf8', opacity: 0.35,
            dropShadow: false, innerShadow: false, locked: true, anchorH: 'center', anchorV: 'middle' });
        });

        // 02. Barra superior: logo, título, moedas e menu.
        await section(tr('02. Barra superior', '02. Top bar'), 'stretch', 'top', async () => {
          make('Painel', { name: tr('Barra superior', 'Top bar'), x: 0, y: 0, w: 1920, h: 64, radius: 0, fillType: 'gradient', fillColor1: '#0d1322', fillColor2: '#060910',
            fillOpacity: 0.95, borderWidth: 1, borderColor: '#1f2a44', shadowBlur: 24, shadowOffsetY: 6, innerShadow: false });
          anchor = { anchorH: 'left', anchorV: 'top' };
          make('Forma', { name: tr('Logo', 'Logo'), x: 22, y: 12, w: 40, h: 40, shapeKind: 'star', shapeSides: 4, shapeInnerRatio: 0.4, fillColor1: '#fde047', fillColor2: '#f59e0b',
            borderStyle: 'glow', borderWidth: 2, borderColor: '#fbbf24', dropShadow: false });
          text('GAME DEV UI STUDIO', { x: 74, y: 8, w: 560, h: 30, fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, letterSpacing: 4, textColor: '#e0f2fe', textEffect: 'shadow' });
          text(tr('VITRINE 4K · CADA PEÇA DESTA TELA FOI CRIADA PELA API STUDIO', '4K SHOWCASE · EVERY PIECE ON THIS SCREEN WAS BUILT WITH THE STUDIO API'),
            { x: 76, y: 38, w: 820, h: 18, fontFamily: 'Inter', fontSize: 11, fontWeight: 500, letterSpacing: 1, textColor: '#64748b', textPadding: 2 });
          anchor = { anchorH: 'right', anchorV: 'top' };
          const chips = [['coin', tr('12.480', '12,480'), '#fde047'], ['gem', '356', '#e9d5ff'], ['bolt', '86/120', '#fef08a']];
          for (let i = 0; i < chips.length; i++) {
            const [ic, value, color] = chips[i], x = 1290 + i * 168;
            make('Painel', { name: tr('Moeda ', 'Currency ') + ic, x, y: 14, w: 152, h: 36, radius: 18, fillType: 'solid', fillColor1: '#0b1220',
              borderWidth: 1.5, borderColor: '#334155', dropShadow: false, innerShadow: true, innerShadowSize: 10, innerShadowOpacity: 0.6, innerHighlight: 0.05 });
            await icon(make('Slot', { name: tr('Ícone ', 'Icon ') + ic, x: x + 6, y: 16, w: 32, h: 32, ...bare }), ic, 0.85);
            text(value, { x: x + 42, y: 14, w: 100, h: 36, fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, textColor: color, textAlign: 'right', textPadding: 6 });
          }
          make('Botão', { name: 'Menu', x: 1800, y: 12, w: 100, h: 40, radius: 10, cornerStyle: 'chamfer', borderStyle: 'bevel', borderWidth: 2,
            fillColor1: '#1f2937', fillColor2: '#0b1220', borderColor: '#64748b', text: 'MENU', fontFamily: 'Orbitron', fontSize: 13, letterSpacing: 2, dropShadow: false });
        });

        // 03. Local e hora (canto superior esquerdo).
        await section(tr('03. Local', '03. Location'), 'left', 'top', async () => {
          text(tr('SANTUÁRIO DE ALDREN', 'ALDREN SANCTUARY'), { x: 30, y: 84, w: 420, h: 30, fontFamily: 'Cinzel', fontSize: 21, fontWeight: 700, letterSpacing: 2, textColor: '#e2e8f0', textEffect: 'shadow' });
          text(tr('Dia 17 · 23:40 · Lua de sangue', 'Day 17 · 23:40 · Blood moon'), { x: 30, y: 114, w: 420, h: 22, fontSize: 15, fontWeight: 500, textColor: '#f87171' });
        });

        // 04. Chefe: barra segmentada com brilho, centralizada no topo.
        await section(tr('04. Chefe', '04. Boss'), 'center', 'top', async () => {
          await icon(make('Slot', { name: tr('Ícone do chefe', 'Boss icon'), x: 506, y: 96, w: 44, h: 44, radius: 22, fillType: 'solid', fillColor1: '#1c0a0a',
            borderStyle: 'glow', borderWidth: 2, borderColor: '#ef4444', dropShadow: false, innerShadow: false }), 'skull', 0.7);
          text(tr('SENHOR DAS CINZAS', 'LORD OF ASH'), { x: 560, y: 80, w: 800, h: 30, fontFamily: 'Cinzel', fontSize: 20, fontWeight: 700, letterSpacing: 5,
            textColor: '#fecaca', textAlign: 'center', textEffect: 'shadow' });
          make('Barra', { name: tr('Vida do chefe', 'Boss health'), x: 560, y: 110, w: 800, h: 24, radius: 4, barValue: 68, barSegments: 20,
            fillColor1: '#ef4444', fillColor2: '#7f1d1d', borderStyle: 'glow', borderWidth: 2, borderColor: '#f87171', trackColor: '#1c0a0a',
            innerShadow: false, text: tr('FASE 2 · 68%', 'PHASE 2 · 68%'), fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 700, letterSpacing: 2 });
        });

        // 05. Personagem: anel de XP em volta do retrato, nível hexagonal, atributos, 3 barras e buffs.
        await section(tr('05. Personagem', '05. Character'), 'left', 'top', async () => {
          card({ name: tr('Carta do personagem', 'Character card'), x: 30, y: 150, w: 400, h: 420 });
          make('Anel', { name: tr('Anel de XP', 'XP ring'), x: 46, y: 166, w: 156, h: 156, ...bare, radius: 78, ringValue: 72, ringThickness: 7,
            ringColor1: '#22d3ee', ringColor2: '#a78bfa', ringTrackColor: '#111827', ringGlow: true, ringShowValue: false, text: '' });
          await icon(make('Slot', { name: tr('Retrato', 'Portrait'), x: 62, y: 182, w: 124, h: 124, radius: 62, fillType: 'gradient', gradientDir: 'radial',
            fillColor1: '#334155', fillColor2: '#0b1120', borderStyle: 'double', borderWidth: 4, borderColor: '#fbbf24', dropShadow: false }), 'helmet', 0.62);
          make('Forma', { name: tr('Nível', 'Level'), x: 150, y: 276, w: 50, h: 50, shapeKind: 'polygon', shapeSides: 6, fillColor1: '#fde047', fillColor2: '#b45309',
            borderWidth: 2, borderColor: '#fef3c7', shadowBlur: 10, shadowOffsetY: 3, text: '42', fontFamily: 'Orbitron', fontSize: 15, fontWeight: 700, textColor: '#1c1917', textPadding: 0 });
          text('KAEL', { x: 218, y: 172, w: 200, h: 34, fontFamily: 'Cinzel', fontSize: 26, fontWeight: 700, letterSpacing: 3, textColor: '#fde68a', textEffect: 'shadow' });
          text(tr('Guardião Arcano', 'Arcane Warden'), { x: 218, y: 204, w: 200, h: 22, fontSize: 16, fontWeight: 600, textColor: '#94a3b8' });
          text(tr('◆ ATQ   1.240\n◆ DEF     860\n◆ VEL     128', '◆ ATK   1,240\n◆ DEF     860\n◆ SPD     128'), { x: 218, y: 234, w: 200, h: 84,
            fontFamily: 'Roboto Condensed', fontSize: 15, fontWeight: 500, textColor: '#cbd5e1', textVAlign: 'top', lineHeight: 1.6 });
          const bars = [
            ['HP', tr('Vida', 'Health'), 82, '#f43f5e', '#881337', '#fb7185', 'bevel', 0, '1.640 / 2.000', '1,640 / 2,000'],
            ['MP', tr('Mana', 'Mana'), 58, '#3b82f6', '#1e3a8a', '#93c5fd', 'solid', 10, '580 / 1.000', '580 / 1,000'],
            ['ST', tr('Vigor', 'Stamina'), 94, '#22c55e', '#14532d', '#86efac', 'glow', 0, '94%', '94%']
          ];
          bars.forEach(([code, label, value, c1, c2, border, style, segments, pt, en], i) => {
            const y = 348 + i * 40;
            text(code, { name: tr('Rótulo ', 'Label ') + label, x: 48, y, w: 44, h: 24, fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, textColor: border, textPadding: 0 });
            make('Barra', { name: label, x: 94, y, w: 318, h: 24, radius: 12, barValue: value, barSegments: segments, fillColor1: c1, fillColor2: c2,
              borderStyle: style, borderWidth: 2, borderColor: border, trackColor: '#0b0f19', innerShadow: false, shadowBlur: 8, shadowOffsetY: 2,
              text: tr(pt, en), fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 700, textColor: '#ffffff', textStrokeWidth: 1, textStrokeColor: '#00000099' });
          });
          const buffs = [['fire', '#f97316', '12s'], ['ice', '#38bdf8', '8s'], ['shield', '#60a5fa', '30s'], ['bolt', '#facc15', '4s'], ['heart', '#f43f5e', '∞']];
          for (let i = 0; i < buffs.length; i++) {
            const [ic, color, time] = buffs[i];
            await icon(make('Slot', { name: 'Buff ' + ic, x: 48 + i * 74, y: 480, w: 60, h: 60, radius: 12, fillType: 'gradient', fillColor1: '#1e2536', fillColor2: '#0b0f19',
              borderStyle: i === 3 ? 'glow' : 'solid', borderWidth: 2, borderColor: color, dropShadow: false, innerShadow: true, innerShadowSize: 14,
              text: time, fontFamily: 'Rajdhani', fontSize: 13, fontWeight: 700, textAlign: 'right', textVAlign: 'bottom', textPadding: 4, textStrokeWidth: 2, textStrokeColor: '#000000' }), ic, 0.6);
          }
        });

        // 06. Missões: cartão chanfrado com checkbox, título, detalhe e progresso.
        await section(tr('06. Missões', '06. Quests'), 'left', 'bottom', async () => {
          card({ name: tr('Painel de missões', 'Quest panel'), x: 30, y: 594, w: 400, h: 300, cornerStyle: 'chamfer', radius: 20, borderColor: '#92400e', borderWidth: 2 });
          heading(tr('MISSÕES', 'QUESTS'), 52, 610, 300, '#fbbf24');
          const quests = [
            [tr('Purificar o Santuário', 'Cleanse the Shrine'), tr('Relíquias 3/5', 'Relics 3/5'), 60, '#f59e0b', false],
            [tr('Caçar o Wyvern de Gelo', 'Hunt the Frost Wyvern'), tr('Região: Picos Brancos', 'Region: White Peaks'), 25, '#38bdf8', false],
            [tr('Falar com a Oráculo', 'Talk to the Oracle'), tr('Concluída · +500 XP', 'Completed · +500 XP'), 100, '#22c55e', true]
          ];
          for (let i = 0; i < quests.length; i++) {
            const [title, detail, value, color, done] = quests[i], y = 650 + i * 78;
            const box = make('Slot', { name: 'Check ' + (i + 1), x: 52, y: y + 4, w: 26, h: 26, radius: 6, fillType: 'solid', fillColor1: done ? '#052e16' : '#0b0f19',
              borderWidth: 2, borderColor: done ? '#22c55e' : '#475569', dropShadow: false, innerShadow: false });
            if (done) await icon(box, 'check', 0.8);
            text(title, { x: 90, y, w: 320, h: 26, fontSize: 18, fontWeight: 700, textColor: done ? '#86efac' : '#f1f5f9', textPadding: 0 });
            text(detail, { x: 90, y: y + 24, w: 320, h: 20, fontFamily: 'Inter', fontSize: 12, fontWeight: 400, textColor: '#94a3b8', textPadding: 0 });
            make('Barra', { name: tr('Progresso ', 'Progress ') + (i + 1), x: 90, y: y + 50, w: 310, h: 8, radius: 4, barValue: value, fillColor1: color, fillColor2: color,
              borderWidth: 0, trackColor: '#1e293b', dropShadow: false, innerShadow: false });
          }
        });

        // 06b. Grupo (party): 3 aliados com retrato redondo, nome e mini barra de vida.
        await section(tr('06b. Grupo', '06b. Party'), 'left', 'bottom', async () => {
          const party = [['bow', 'Lyra', '#4ade80', 90], ['shield', 'Borin', '#60a5fa', 45], ['fire', 'Ember', '#f97316', 18]];
          for (let i = 0; i < party.length; i++) {
            const [ic, name, color, hp] = party[i], x = 30 + i * 136;
            card({ name: tr('Aliado ', 'Ally ') + name, x, y: 908, w: 128, h: 114, radius: 12, borderColor: hp < 25 ? '#ef4444' : '#2a3550',
              borderStyle: hp < 25 ? 'glow' : 'solid', shadowBlur: 16, shadowOffsetY: 6 });
            await icon(make('Slot', { name: tr('Retrato ', 'Portrait ') + name, x: x + 38, y: 918, w: 52, h: 52, radius: 26, fillType: 'gradient', gradientDir: 'radial',
              fillColor1: '#334155', fillColor2: '#0b1120', borderWidth: 2.5, borderColor: color, dropShadow: false, innerShadow: false }), ic, 0.6);
            text(name, { x, y: 972, w: 128, h: 24, fontFamily: 'Cinzel', fontSize: 15, fontWeight: 700, textColor: '#e2e8f0', textAlign: 'center', textPadding: 0 });
            make('Barra', { name: tr('Vida de ', 'Health of ') + name, x: x + 14, y: 1000, w: 100, h: 8, radius: 4, barValue: hp,
              fillColor1: hp < 25 ? '#ef4444' : '#22c55e', fillColor2: hp < 25 ? '#991b1b' : '#15803d', borderWidth: 0, trackColor: '#1e293b', dropShadow: false, innerShadow: false });
          }
        });

        // 07. Inventário: abas + grade 6×4 criada com Studio.createGrid; raridade pela cor da borda.
        await section(tr('07. Inventário', '07. Inventory'), 'center', 'middle', async () => {
          card({ name: tr('Painel do inventário', 'Inventory panel'), x: 460, y: 150, w: 620, h: 500, borderStyle: 'bevel', borderWidth: 3, borderColor: '#475569', bevelStrength: 0.3 });
          heading(tr('INVENTÁRIO', 'INVENTORY'), 484, 166, 300);
          text(tr('Peso 48 / 120', 'Weight 48 / 120'), { x: 860, y: 166, w: 200, h: 26, fontSize: 15, fontWeight: 600, textColor: '#64748b', textAlign: 'right' });
          [tr('TUDO', 'ALL'), tr('ARMAS', 'WEAPONS'), tr('ITENS', 'ITEMS'), tr('RAROS', 'RARE')].forEach((label, i) => make('Botão', {
            name: tr('Aba ', 'Tab ') + label, x: 484 + i * 118, y: 204, w: 110, h: 34, radius: 8,
            fillColor1: i === 0 ? '#0e7490' : '#111827', fillColor2: i === 0 ? '#164e63' : '#0b0f19', borderStyle: i === 0 ? 'glow' : 'solid', borderWidth: 1.5,
            borderColor: i === 0 ? '#22d3ee' : '#334155', text: label, fontSize: 15, letterSpacing: 1.5, textColor: i === 0 ? '#ecfeff' : '#94a3b8', dropShadow: false, exportStates: true
          }));
          const RARITY = { c: '#64748b', r: '#3b82f6', e: '#a855f7', l: '#f59e0b' };
          const items = [['sword', 'e', ''], ['potion', 'c', '12'], ['shield', 'r', ''], ['gem', 'l', '3'], ['key', 'c', '2'], ['scroll', 'r', '5'],
            ['bow', 'r', ''], ['heart', 'c', '7'], ['coin', 'c', '99+'], ['fire', 'e', ''], ['ice', 'e', ''], ['helmet', 'l', ''],
            ['potion', 'c', '4'], ['skull', 'r', '1'], ['gem', 'r', '8'], ['bolt', 'r', '20'], ['scroll', 'c', '1'], ['key', 'l', ''],
            ['shield', 'c', ''], null, null, null, null, null];
          const grid = Studio.createGrid({ rows: 4, cols: 6, size: 84 * S, gap: 12 * S, x: 484 * S, y: 250 * S, name: 'Inv', group: false,
            props: { ...anchor, radius: 10 * S, fillType: 'gradient', fillColor1: '#1e2536', fillColor2: '#0c101b', borderWidth: 2 * S, borderColor: '#1f2937',
              dropShadow: false, innerShadow: true, innerShadowSize: 18 * S, fontFamily: 'Rajdhani', fontSize: 14 * S, fontWeight: 700, textAlign: 'right', textVAlign: 'bottom',
              textPadding: 5 * S, textStrokeWidth: 2 * S, textStrokeColor: '#000000' } });
          for (let i = 0; i < grid.length; i++) {
            const it = items[i];
            if (!it) continue;
            const [ic, rarity, qty] = it;
            Studio.update(grid[i], { borderColor: RARITY[rarity], borderStyle: rarity === 'l' ? 'glow' : 'solid', text: qty,
              ...(i === 0 ? { borderStyle: 'glow', borderWidth: 3 * S, borderColor: '#e879f9', fillColor1: '#3b0764', fillColor2: '#1a0b2e' } : {}) });
            await icon(grid[i], ic, 0.66);
          }
        });

        // 08. Detalhe do item: moldura épica com brilho, atributos, citação e botões com estados.
        await section(tr('08. Detalhe do item', '08. Item detail'), 'center', 'middle', async () => {
          card({ name: tr('Carta do item', 'Item card'), x: 1100, y: 150, w: 370, h: 500, borderStyle: 'glow', borderWidth: 2, borderColor: '#a855f7',
            fillColor1: '#1a1030', fillColor2: '#0b0716' });
          await icon(make('Slot', { name: tr('Ícone do item', 'Item icon'), x: 1122, y: 172, w: 112, h: 112, radius: 16, fillType: 'gradient', gradientDir: 'radial',
            fillColor1: '#6b21a8', fillColor2: '#1e0b36', borderStyle: 'double', borderWidth: 4, borderColor: '#e879f9', shadowColor: '#a855f7', shadowBlur: 24, shadowOffsetY: 0 }), 'sword', 0.7);
          text(tr('LÂMINA\nETÉREA', 'ETHEREAL\nBLADE'), { x: 1248, y: 170, w: 210, h: 64, fontFamily: 'Cinzel', fontSize: 21, fontWeight: 700, textColor: '#f5d0fe', textVAlign: 'top', lineHeight: 1.15, letterSpacing: 1, textEffect: 'glow' });
          text(tr('ÉPICA · ESPADA', 'EPIC · SWORD'), { x: 1248, y: 238, w: 210, h: 22, fontSize: 14, fontWeight: 700, letterSpacing: 2, textColor: '#c084fc' });
          text(tr('Requer nível 38', 'Requires level 38'), { x: 1248, y: 260, w: 210, h: 22, fontFamily: 'Inter', fontSize: 12, fontWeight: 400, textColor: '#94a3b8' });
          make('Painel', { name: tr('Divisória', 'Divider'), x: 1122, y: 302, w: 326, h: 2, radius: 1, fillType: 'solid', fillColor1: '#4c1d95', borderWidth: 0, dropShadow: false, innerShadow: false });
          text(tr('+312   Dano físico\n+18%   Chance crítica\n+4%    Roubo de vida\n◆ Encantamento: Geada', '+312   Physical damage\n+18%   Critical chance\n+4%    Life steal\n◆ Enchantment: Frost'),
            { x: 1122, y: 314, w: 330, h: 116, fontSize: 18, fontWeight: 600, textColor: '#e2e8f0', textVAlign: 'top', lineHeight: 1.5 });
          text(tr('"Forjada no vazio entre as estrelas.\nCorta o que ainda não existe."', '"Forged in the void between the stars.\nIt cuts what does not exist yet."'),
            { x: 1122, y: 440, w: 330, h: 56, fontFamily: 'Inter', fontSize: 12, fontWeight: 300, textColor: '#a78bfa', textVAlign: 'top', lineHeight: 1.5 });
          text(tr('▲ +48 DPS em relação à arma equipada', '▲ +48 DPS compared to equipped weapon'), { x: 1122, y: 496, w: 330, h: 22, fontSize: 15, fontWeight: 700, textColor: '#4ade80' });
          text(tr('Durabilidade', 'Durability'), { x: 1122, y: 526, w: 160, h: 20, fontFamily: 'Inter', fontSize: 11, fontWeight: 500, textColor: '#94a3b8', textPadding: 0 });
          text('86 / 100', { x: 1290, y: 526, w: 160, h: 20, fontFamily: 'Inter', fontSize: 11, fontWeight: 600, textColor: '#cbd5e1', textAlign: 'right', textPadding: 0 });
          make('Barra', { name: tr('Durabilidade', 'Durability'), x: 1122, y: 550, w: 328, h: 8, radius: 4, barValue: 86, barSegments: 10, fillColor1: '#c084fc', fillColor2: '#7e22ce',
            borderWidth: 0, trackColor: '#1e1033', dropShadow: false, innerShadow: false });
          make('Botão', { name: tr('Equipar', 'Equip'), x: 1122, y: 580, w: 160, h: 50, radius: 10, borderStyle: 'bevel', borderWidth: 2,
            fillColor1: '#2563eb', fillColor2: '#1e3a8a', borderColor: '#93c5fd', text: tr('EQUIPAR', 'EQUIP'), fontSize: 19, letterSpacing: 2, exportStates: true });
          make('Botão', { name: tr('Vender', 'Sell'), x: 1294, y: 580, w: 156, h: 50, radius: 10, borderStyle: 'inset', borderWidth: 2,
            fillColor1: '#78350f', fillColor2: '#451a03', borderColor: '#fbbf24', text: tr('VENDER ◉ 840', 'SELL ◉ 840'), fontSize: 17, letterSpacing: 1, textColor: '#fde68a', exportStates: true });
        });

        // 09. Diálogo: caixa chanfrada com borda dupla, crachá do NPC e escolhas.
        await section(tr('09. Diálogo', '09. Dialogue'), 'center', 'bottom', async () => {
          make('Painel', { name: tr('Caixa de diálogo', 'Dialogue box'), x: 460, y: 684, w: 1010, h: 200, radius: 22, cornerStyle: 'chamfer', fillType: 'gradient',
            gradientDir: 'horizontal', fillColor1: '#0c1a2e', fillColor2: '#0b0f19', fillOpacity: 0.95, borderStyle: 'double', borderWidth: 4, borderColor: '#38bdf8',
            shadowBlur: 36, shadowOffsetY: 14, innerShadow: false });
          make('Painel', { name: tr('Crachá do NPC', 'NPC badge'), x: 490, y: 666, w: 230, h: 38, radius: 10, cornerStyle: 'chamfer', fillType: 'gradient',
            fillColor1: '#0ea5e9', fillColor2: '#075985', borderWidth: 2, borderColor: '#bae6fd', shadowBlur: 12, shadowOffsetY: 4, innerShadow: false,
            text: tr('ORÁCULO DE ALDREN', 'ORACLE OF ALDREN'), fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700, letterSpacing: 2 });
          text(tr('"O selo da Montanha Branca está enfraquecendo, Guardião. Se o Wyvern despertar, nem a luz do santuário vai nos proteger."',
            '"The seal of the White Mountain is weakening, Warden. If the Wyvern awakens, not even the shrine\'s light will protect us."'),
            { x: 490, y: 716, w: 690, h: 120, fontFamily: 'Inter', fontSize: 18, fontWeight: 400, textColor: '#e2e8f0', textVAlign: 'top', lineHeight: 1.55 });
          [[tr('▸ Eu vou até o pico', '▸ I will climb the peak'), true], [tr('▸ Preciso me preparar', '▸ I need to prepare'), false]].forEach(([label, hot], i) => make('Botão', {
            name: tr('Escolha ', 'Choice ') + (i + 1), x: 1200, y: 720 + i * 56, w: 244, h: 44, radius: 8, fillType: 'gradient', fillColor1: hot ? '#0c4a6e' : '#111827',
            fillColor2: hot ? '#082f49' : '#0b0f19', borderStyle: hot ? 'glow' : 'solid', borderWidth: 1.5, borderColor: hot ? '#38bdf8' : '#334155',
            text: label, fontSize: 17, fontWeight: 600, textAlign: 'left', textPadding: 14, textColor: hot ? '#e0f2fe' : '#94a3b8', dropShadow: false, exportStates: true
          }));
          make('Forma', { name: tr('Continuar', 'Continue'), x: 1432, y: 846, w: 22, h: 16, shapeKind: 'arrow', rotation: 90, fillColor1: '#38bdf8', fillColor2: '#0ea5e9',
            borderWidth: 0, dropShadow: false });
          // Dicas de tecla (keycaps) no rodapé da caixa.
          [['E', tr('Continuar', 'Continue')], ['Esc', tr('Pular', 'Skip')], ['L', tr('Histórico', 'Log')]].forEach(([key, label], i) => {
            const x = 490 + i * 150;
            make('Slot', { name: tr('Tecla ', 'Key ') + key, x, y: 838, w: key.length > 1 ? 44 : 30, h: 30, radius: 6, fillType: 'gradient', fillColor1: '#334155', fillColor2: '#1e293b',
              borderStyle: 'bevel', borderWidth: 2, borderColor: '#64748b', dropShadow: false, innerShadow: false,
              text: key, fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 700, textPadding: 0 });
            text(label, { x: x + (key.length > 1 ? 52 : 38), y: 838, w: 100, h: 30, fontSize: 16, fontWeight: 600, textColor: '#94a3b8', textPadding: 0 });
          });
        });

        // 10. Hotbar: 8 atalhos com ícone e tecla; dois em recarga (Anel por cima); XP embaixo.
        await section(tr('10. Hotbar', '10. Hotbar'), 'center', 'bottom', async () => {
          make('Painel', { name: tr('Fundo da hotbar', 'Hotbar backdrop'), x: 560, y: 904, w: 800, h: 118, radius: 22, fillType: 'gradient', fillColor1: '#0f1522', fillColor2: '#05070d',
            fillOpacity: 0.92, borderWidth: 1.5, borderColor: '#1e293b', shadowBlur: 30, shadowOffsetY: 10, innerShadow: false });
          const skills = ['sword', 'fire', 'ice', 'bolt', 'shield', 'heart', 'potion', 'scroll'];
          for (let i = 0; i < skills.length; i++) {
            const x = 582 + i * 96;
            const slot = make('Slot', { name: tr('Atalho ', 'Hotbar ') + (i + 1), x, y: 918, w: 84, h: 84, radius: 12, fillType: 'gradient', fillColor1: '#1e2536', fillColor2: '#0b0f19',
              borderStyle: i === 0 ? 'glow' : 'solid', borderWidth: 2, borderColor: i === 0 ? '#fbbf24' : '#334155', dropShadow: false, innerShadow: true, innerShadowSize: 16,
              text: String(i + 1), fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700, textAlign: 'left', textVAlign: 'top', textPadding: 6, textColor: '#cbd5e1',
              textStrokeWidth: 2, textStrokeColor: '#000000', exportStates: true });
            await icon(slot, skills[i], 0.62);
            if (i === 1 || i === 3) {
              // Disco escuro por cima do ícone (o Anel tem preenchimento próprio) + arco de recarga + segundos restantes.
              make('Anel', { name: tr('Recarga ', 'Cooldown ') + (i + 1), x: x + 6, y: 924, w: 72, h: 72, ...bare, radius: 36, fillType: 'solid', fillColor1: '#000000', fillOpacity: 0.55,
                ringValue: i === 1 ? 35 : 70, ringThickness: 5,
                ringColor1: '#fbbf24', ringColor2: '#f97316', ringTrackColor: '#00000000', ringGlow: true, ringShowValue: false,
                text: i === 1 ? '3.2' : '1.1', fontFamily: 'Orbitron', fontSize: 18, fontWeight: 700, textColor: '#fef3c7', textStrokeWidth: 2, textStrokeColor: '#000000' });
            }
          }
          make('Barra', { name: 'XP', x: 582, y: 1008, w: 756, h: 8, radius: 4, barValue: 72, fillColor1: '#a78bfa', fillColor2: '#22d3ee', gradientDir: 'horizontal',
            borderWidth: 0, trackColor: '#111827', dropShadow: false, innerShadow: false });
        });

        // 11. Conquista (toast): borda com brilho dourado e estrela.
        await section(tr('11. Conquista', '11. Achievement'), 'right', 'top', async () => {
          make('Painel', { name: tr('Toast de conquista', 'Achievement toast'), x: 1490, y: 78, w: 400, h: 70, radius: 12, fillType: 'gradient', gradientDir: 'horizontal',
            fillColor1: '#422006', fillColor2: '#140c02', borderStyle: 'glow', borderWidth: 2, borderColor: '#f59e0b', shadowBlur: 20, shadowOffsetY: 6, innerShadow: false });
          make('Forma', { name: tr('Estrela', 'Star'), x: 1504, y: 88, w: 50, h: 50, shapeKind: 'star', shapeSides: 5, fillColor1: '#fde047', fillColor2: '#f59e0b',
            borderWidth: 2, borderColor: '#fef3c7', shadowColor: '#f59e0b', shadowBlur: 18, shadowOffsetY: 0, rotation: -8 });
          text(tr('CONQUISTA DESBLOQUEADA', 'ACHIEVEMENT UNLOCKED'), { x: 1566, y: 86, w: 310, h: 22, fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, letterSpacing: 2, textColor: '#fbbf24', textPadding: 0 });
          text(tr('Mestre das Interfaces · +500 XP', 'Interface Master · +500 XP'), { x: 1566, y: 108, w: 310, h: 30, fontSize: 19, fontWeight: 700, textColor: '#fef3c7', textPadding: 0 });
        });

        // 12. Minimapa: elipse com textura de terreno, borda dupla, marcadores (estrela, triângulos, seta girada).
        await section(tr('12. Mapa', '12. Map'), 'right', 'top', async () => {
          card({ name: tr('Carta do mapa', 'Map card'), x: 1490, y: 166, w: 400, h: 330 });
          heading(tr('MAPA', 'MAP'), 1512, 180, 150);
          text(tr('Picos Brancos', 'White Peaks'), { x: 1680, y: 180, w: 190, h: 26, fontSize: 15, fontWeight: 600, textColor: '#67e8f9', textAlign: 'right' });
          make('Forma', { name: tr('Terreno', 'Terrain'), x: 1560, y: 214, w: 260, h: 260, shapeKind: 'ellipse', fillType: 'gradient', gradientDir: 'radial',
            fillColor1: '#155e75', fillColor2: '#062530', borderStyle: 'double', borderWidth: 5, borderColor: '#67e8f9', noise: 0.25, shadowBlur: 24, shadowOffsetY: 0, shadowColor: '#0891b2' });
          make('Forma', { name: tr('Lago', 'Lake'), x: 1600, y: 380, w: 90, h: 50, shapeKind: 'ellipse', rotation: -20, fillType: 'solid', fillColor1: '#0c4a6e', fillOpacity: 0.9,
            borderWidth: 1, borderColor: '#38bdf8', dropShadow: false });
          text('N', { x: 1676, y: 214, w: 28, h: 24, fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, textColor: '#ecfeff', textAlign: 'center', textPadding: 0 });
          make('Forma', { name: tr('Objetivo', 'Objective'), x: 1612, y: 262, w: 32, h: 32, shapeKind: 'star', fillColor1: '#fde047', fillColor2: '#f59e0b', borderWidth: 1.5, borderColor: '#78350f', shadowBlur: 8, shadowOffsetY: 2 });
          [[1740, 318], [1706, 404], [1762, 372]].forEach(([x, y], i) => make('Forma', { name: tr('Inimigo ', 'Enemy ') + (i + 1), x, y, w: 22, h: 22,
            shapeKind: 'polygon', shapeSides: 3, rotation: 180, fillColor1: '#f87171', fillColor2: '#b91c1c', borderWidth: 1.5, borderColor: '#450a0a', dropShadow: false }));
          make('Forma', { name: tr('Jogador', 'Player'), x: 1672, y: 332, w: 40, h: 28, shapeKind: 'arrow', rotation: -35, fillColor1: '#ecfeff', fillColor2: '#22d3ee',
            borderStyle: 'glow', borderWidth: 1.5, borderColor: '#22d3ee', dropShadow: false });
          text('X 1024 · Y 388', { x: 1512, y: 462, w: 200, h: 22, fontFamily: 'Roboto Condensed', fontSize: 13, fontWeight: 500, textColor: '#64748b' });
        });

        // 13. Terminal CRT: scanlines + ruído + sombra interna; fonte pixel com brilho.
        await section(tr('13. Terminal', '13. Terminal'), 'right', 'middle', async () => {
          make('Painel', { name: 'CRT', x: 1490, y: 516, w: 400, h: 214, radius: 14, fillType: 'gradient', gradientDir: 'radial', fillColor1: '#0f3d24', fillColor2: '#02100a',
            borderStyle: 'solid', borderWidth: 3, borderColor: '#1f6f45', shadowBlur: 24, shadowOffsetY: 8, innerShadow: true, innerShadowSize: 40, innerShadowOpacity: 0.7,
            innerHighlight: 0.06, scanlines: 0.35, scanlineSpacing: 5, noise: 0.14 });
          text(tr('> SISTEMA ONLINE\n> SCAN: 3 HOSTIS\n> ESCUDO: 86%\n> AGUARDANDO_', '> SYSTEM ONLINE\n> SCAN: 3 HOSTILES\n> SHIELD: 86%\n> AWAITING_'),
            { x: 1512, y: 536, w: 360, h: 132, fontFamily: 'Press Start 2P', fontSize: 13, fontWeight: 400, textColor: '#4ade80', textVAlign: 'top', lineHeight: 2, textEffect: 'glow' });
          text(tr('UPLOAD DO MAPA', 'MAP UPLOAD'), { x: 1512, y: 670, w: 240, h: 18, fontFamily: 'Press Start 2P', fontSize: 9, fontWeight: 400, textColor: '#22c55e', textPadding: 0 });
          text('62%', { x: 1780, y: 670, w: 92, h: 18, fontFamily: 'Press Start 2P', fontSize: 9, fontWeight: 400, textColor: '#86efac', textAlign: 'right', textPadding: 0 });
          make('Barra', { name: tr('Upload', 'Upload'), x: 1512, y: 692, w: 360, h: 16, radius: 0, barValue: 62, barSegments: 16, fillType: 'solid', fillColor1: '#4ade80',
            borderStyle: 'solid', borderWidth: 1.5, borderColor: '#22c55e', trackColor: '#03170c', dropShadow: false, innerShadow: false });
        });

        // 14. Estilos de botão: as 6 bordas, com e sem chanfro, todos com estados hover/pressed no ZIP.
        await section(tr('14. Estilos de botão', '14. Button styles'), 'right', 'bottom', async () => {
          card({ name: tr('Carta de botões', 'Buttons card'), x: 1490, y: 750, w: 400, h: 272 });
          heading(tr('ESTILOS DE BOTÃO', 'BUTTON STYLES'), 1512, 764, 360);
          const styles = [['solid', '#1d4ed8', '#1e3a8a', '#60a5fa', 'round'], ['bevel', '#b45309', '#78350f', '#fbbf24', 'round'], ['inset', '#334155', '#0f172a', '#94a3b8', 'round'],
            ['glow', '#0e7490', '#083344', '#22d3ee', 'chamfer'], ['dashed', '#166534', '#052e16', '#4ade80', 'round'], ['double', '#9f1239', '#4c0519', '#fb7185', 'chamfer']];
          styles.forEach(([style, c1, c2, border, corner], i) => make('Botão', {
            name: tr('Botão ', 'Button ') + style, x: 1512 + (i % 2) * 188, y: 804 + Math.floor(i / 2) * 68, w: 170, h: 52, radius: 10, cornerStyle: corner,
            fillColor1: c1, fillColor2: c2, borderStyle: style, borderWidth: style === 'double' ? 4 : 2, borderColor: border,
            text: style.toUpperCase(), fontFamily: i % 2 ? 'Teko' : 'Bebas Neue', fontSize: i % 2 ? 26 : 22, fontWeight: i % 2 ? 500 : 400, letterSpacing: 2, exportStates: true
          }));
        });

        // 15. Fontes: as 12 fontes embutidas, cada uma escrita nela mesma.
        await section(tr('15. Fontes', '15. Fonts'), 'stretch', 'bottom', async () => {
          make('Painel', { name: tr('Faixa de fontes', 'Font strip'), x: 0, y: 1036, w: 1920, h: 44, radius: 0, fillType: 'solid', fillColor1: '#04060c', fillOpacity: 0.92,
            borderWidth: 1, borderColor: '#111827', dropShadow: false, innerShadow: false });
          const fonts = ['Inter', 'Rajdhani', 'Oswald', 'Orbitron', 'Chakra Petch', 'Cinzel', 'Teko', 'Exo 2', 'Roboto Condensed', 'Bebas Neue', 'Press Start 2P', 'Russo One'];
          fonts.forEach((f, i) => text(f, { name: tr('Fonte ', 'Font ') + f, x: 24 + i * 157, y: 1040, w: 152, h: 36, fontFamily: f,
            fontSize: f === 'Press Start 2P' ? 10 : f === 'Teko' || f === 'Bebas Neue' ? 22 : 16, fontWeight: f === 'Bebas Neue' || f === 'Press Start 2P' ? 400 : 600,
            textColor: i % 2 ? '#94a3b8' : '#cbd5e1', textAlign: 'center', anchorH: 'left' }));
        });

        Studio.select([]);
      });
      console.log(tr('Vitrine 4K pronta: ', '4K showcase ready: ') + Studio.getAll().length + tr(' peças em ', ' pieces at ') + Studio.canvas.width + '×' + Studio.canvas.height + '.');
    }

    function showcaseScenePresetCode() {
      return presetCodeFrom(showcaseSceneScript);
    }
