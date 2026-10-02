    // ===== Cena de boas-vindas =====
    // Abre na primeira visita (sem autosave) e é o preset "👋 Boas-vindas" da Bancada: o preset mostra
    // o corpo desta função, então editar aqui atualiza os dois. O idioma segue o <html lang>.
    async function welcomeSceneScript(Studio) {
      // ============================================================================
      // WELCOME PLAYGROUND & SHOWCASE (PT / EN) — CENA INICIAL INTERATIVA
      // ============================================================================
      Studio.clear();
      Studio.clearGuides();

      const { width: W, height: H } = Studio.canvas;
      const tr = Studio.tr; // tr('texto PT', 'EN text'): segue o idioma da interface

      // 0. FUNDO TRANCADO (locked: true -> o clique atravessa e não atrapalha!)
      Studio.create('Painel', {
        name: tr('🔒 Fundo Escuro (Trancado)', '🔒 Dark Backdrop (Locked)'),
        x: 0, y: 0, w: W, h: H, radius: 0, locked: true,
        fillType: 'gradient', gradientDir: 'radial',
        fillColor1: '#181c26', fillColor2: '#090b10', fillOpacity: 1,
        borderWidth: 0, dropShadow: false, innerShadow: false
      });

      // ============================================================================
      // 1. HEADER DE BOAS-VINDAS (TOPO)
      // ============================================================================
      const headerGroup = [];

      headerGroup.push(Studio.text('GAME DEV UI STUDIO', {
        name: tr('Título Principal', 'Main Title'),
        x: 80, y: 36, w: 720, h: 52,
        fontFamily: 'Orbitron', fontSize: 36, fontWeight: 700,
        letterSpacing: 3, textColor: '#f4f4f5', textAlign: 'left', textEffect: 'glow'
      }));

      headerGroup.push(Studio.text(
        tr(
          'Bem-vindo! Clique em qualquer peça abaixo para editar no painel à direita, ou arraste para testar.',
          'Welcome! Click any piece below to edit in the right panel, or drag to test.'
        ),
        {
          name: tr('Subtítulo Boas-vindas', 'Welcome Subtitle'),
          x: 80, y: 88, w: 1100, h: 32,
          fontFamily: 'Inter', fontSize: 18, fontWeight: 400,
          textColor: '#94a3b8', textAlign: 'left'
        }
      ));

      headerGroup.push(Studio.create('Botão', {
        name: tr('Dica: Bancada de Scripts', 'Tip: Script Workbench'),
        x: W - 460, y: 46, w: 380, h: 52,
        cornerStyle: 'chamfer', radius: 10,
        fillType: 'gradient', gradientDir: 'horizontal',
        fillColor1: '#451a03', fillColor2: '#1c1917',
        borderStyle: 'glow', borderWidth: 2, borderColor: '#f59e0b',
        text: tr('⚡ DICA: APERTE CTRL+J PARA SCRIPTS', '⚡ TIP: PRESS CTRL+J FOR SCRIPTS'),
        fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, letterSpacing: 1.5, textColor: '#fde68a'
      }));

      Studio.group(headerGroup, tr('01. Boas-vindas (Header)', '01. Welcome Header'));

      // ============================================================================
      // 2. COLUNA ESQUERDA: GUIA RÁPIDO (PASSO A PASSO)
      // ============================================================================
      const guideGroup = [];
      const gx = 80, gy = 156, gw = 460, gh = 840;

      guideGroup.push(Studio.create('Painel', {
        name: tr('Painel: Guia Rápido', 'Panel: Quick Guide'),
        x: gx, y: gy, w: gw, h: gh, radius: 16,
        fillType: 'gradient', gradientDir: 'vertical',
        fillColor1: '#161922', fillColor2: '#0e1017', fillOpacity: 0.95,
        borderStyle: 'bevel', borderWidth: 2, borderColor: '#2e3446'
      }));

      guideGroup.push(Studio.text(tr('🚀 COMO COMEÇAR', '🚀 QUICK START GUIDE'), {
        name: tr('Título Guia', 'Guide Title'),
        x: gx + 32, y: gy + 28, w: gw - 64, h: 36,
        fontFamily: 'Rajdhani', fontSize: 26, fontWeight: 700,
        letterSpacing: 2, textColor: '#38bdf8', textAlign: 'left'
      }));

      const steps = [
        {
          num: '1', color: '#38bdf8',
          title: tr('CLIQUE E EDITE TUDO', 'CLICK & EDIT ANYTHING'),
          desc: tr('Selecione qualquer item na tela. Mude cores, cantos, texto e sombras no Inspector à direita.', 'Select any item on canvas. Change colors, corners, text & shadows in the right Inspector.')
        },
        {
          num: '2', color: '#a855f7',
          title: tr('CRIE OU USE TEMPLATES', 'CREATE OR USE TEMPLATES'),
          desc: tr('Use os botões "+ Slot / + Barra" no topo ou abra "⚡ Scripts" (Ctrl+J) para gerar HUDs prontos.', 'Use the "+ Slot / + Bar" top buttons or open "⚡ Scripts" (Ctrl+J) to generate full HUDs.')
        },
        {
          num: '3', color: '#10b981',
          title: tr('RASCUNHO E IMAGENS', 'MOCKUPS & ICONS'),
          desc: tr('Arraste PNGs/SVGs do seu PC direto sobre um Slot, ou cole prints da área de transferência (Ctrl+V).', 'Drop PNGs/SVGs from your PC onto any Slot, or paste screenshots from clipboard (Ctrl+V).')
        },
        {
          num: '4', color: '#f59e0b',
          title: tr('EXPORTE PARA A ENGINE', 'EXPORT TO YOUR ENGINE'),
          desc: tr('Clique em "Batch ZIP" no topo: PNGs 9-Slice + manifesto para Unity e Unreal + cena .tscn pronta para Godot!', 'Click "Batch ZIP" at the top: 9-Slice PNGs + Unity & Unreal manifest + ready .tscn scene for Godot!')
        }
      ];

      steps.forEach((s, i) => {
        const sy = gy + 86 + i * 152;
        guideGroup.push(Studio.create('Slot', {
          name: tr(`Passo ${s.num}`, `Step ${s.num}`),
          x: gx + 32, y: sy, w: 44, h: 44, radius: 12,
          fillType: 'solid', fillColor1: '#1e2433',
          borderStyle: 'glow', borderWidth: 2, borderColor: s.color,
          dropShadow: false,
          text: s.num, fontFamily: 'Orbitron', fontSize: 20, fontWeight: 700, textColor: s.color
        }));
        guideGroup.push(Studio.text(s.title, {
          name: tr(`Título Passo ${s.num}`, `Step ${s.num} Title`),
          x: gx + 92, y: sy - 2, w: gw - 120, h: 28,
          fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700,
          letterSpacing: 1, textColor: '#f4f4f5', textAlign: 'left'
        }));
        guideGroup.push(Studio.text(s.desc, {
          name: tr(`Texto Passo ${s.num}`, `Step ${s.num} Text`),
          x: gx + 92, y: sy + 28, w: gw - 120, h: 96,
          fontFamily: 'Inter', fontSize: 14, fontWeight: 400,
          lineHeight: 1.45, textColor: '#94a3b8', textAlign: 'left', textVAlign: 'top'
        }));
      });

      // Caixa de Atalhos Úteis na base do Guia
      guideGroup.push(Studio.create('Painel', {
        name: tr('Caixa de Atalhos', 'Shortcuts Box'),
        x: gx + 28, y: gy + 700, w: gw - 56, h: 112, radius: 10,
        fillType: 'solid', fillColor1: '#0b0d13',
        borderStyle: 'solid', borderWidth: 1, borderColor: '#27272a', dropShadow: false
      }));

      guideGroup.push(Studio.text(
        tr(
          '⌨ ATALHOS\n[Espaço+Arrastar] Pan  •  [Roda] Zoom\n[Ctrl+D] Duplicar  •  [Ctrl+Z] Desfazer\n[/] Buscar propriedade  •  [Del] Excluir',
          '⌨ SHORTCUTS\n[Space+Drag] Pan  •  [Wheel] Zoom\n[Ctrl+D] Duplicate  •  [Ctrl+Z] Undo\n[/] Search property  •  [Del] Delete'
        ),
        {
          name: tr('Lista de Atalhos', 'Shortcuts List'),
          x: gx + 40, y: gy + 712, w: gw - 80, h: 88,
          fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 500,
          lineHeight: 1.6, textColor: '#a1a1aa', textAlign: 'left'
        }
      ));

      Studio.group(guideGroup, tr('02. Guia Rápido (Esquerda)', '02. Quick Guide (Left)'));

      // ============================================================================
      // 3. COLUNA CENTRAL: MINI-HUD RPG INTERATIVO (EXEMPLO PRÁTICO)
      // ============================================================================
      const hudGroup = [];
      const cx = 580, cy = 156, cw = 600, ch = 840;

      hudGroup.push(Studio.create('Painel', {
        name: tr('Painel Mochila RPG', 'RPG Backpack Panel'),
        x: cx, y: cy, w: cw, h: ch, radius: 18,
        fillType: 'gradient', gradientDir: 'vertical',
        fillColor1: '#1b1e2b', fillColor2: '#10121a',
        borderStyle: 'bevel', borderWidth: 4, borderColor: '#434c66'
      }));

      hudGroup.push(Studio.text(tr('⚔ EXEMPLO: JANELA DE PERSONAGEM', '⚔ EXAMPLE: CHARACTER WINDOW'), {
        name: tr('Título Janela RPG', 'RPG Window Title'),
        x: cx + 36, y: cy + 28, w: cw - 72, h: 36,
        fontFamily: 'Cinzel', fontSize: 22, fontWeight: 700,
        letterSpacing: 2, textColor: '#fbbf24', textAlign: 'center', textEffect: 'shadow'
      }));

      // Barras de Status (Vida, Mana Segmentada)
      hudGroup.push(Studio.create('Barra', {
        name: tr('Barra de Vida (HP)', 'Health Bar (HP)'),
        x: cx + 48, y: cy + 88, w: cw - 96, h: 34, radius: 8,
        barValue: 85, fillColor1: '#ef4444', fillColor2: '#7f1d1d', trackColor: '#1a0909',
        borderStyle: 'glow', borderWidth: 2, borderColor: '#f87171',
        text: 'HP  850 / 1000', fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, textEffect: 'shadow'
      }));

      hudGroup.push(Studio.create('Barra', {
        name: tr('Barra de Mana (10 Segmentos)', 'Mana Bar (10 Segments)'),
        x: cx + 48, y: cy + 134, w: cw - 96, h: 28, radius: 6,
        barValue: 70, barSegments: 10,
        fillColor1: '#3b82f6', fillColor2: '#1e3a8a', trackColor: '#091124',
        borderStyle: 'solid', borderWidth: 2, borderColor: '#60a5fa',
        text: 'MP  70%', fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700
      }));

      // 4 Slots de Equipamento (Todos preenchidos com ícones vetoriais!)
      const slotItems = [
        {
          name: tr('Slot: Poção de Vida', 'Slot: Health Potion'), border: '#f43f5e', tag: 'x5',
          svg: `<path d="M36 14h24M40 14v10l-14 22a18 18 0 0 0 15 28h14a18 18 0 0 0 15-28L56 24V14" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 52h44l-6 16H32z" fill="#f43f5e" fill-opacity="0.45"/>`
        },
        {
          name: tr('Slot: Elixir de Mana', 'Slot: Mana Elixir'), border: '#38bdf8', tag: 'x3',
          svg: `<polygon points="48,14 72,44 60,78 36,78 24,44" fill="#0284c7" fill-opacity="0.35" stroke="#38bdf8" stroke-width="4" stroke-linejoin="round"/><circle cx="48" cy="50" r="8" fill="#e0f2fe"/>`
        },
        {
          name: tr('Slot: Lâmina Rúnica', 'Slot: Runic Blade'), border: '#f59e0b', tag: '+9',
          svg: `<path d="M68 20L28 60M56 18h14v14M22 54l20 20M18 78l10-10" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`
        },
        {
          name: tr('Slot: Escudo Real', 'Slot: Royal Shield'), border: '#a855f7', tag: 'DEF',
          svg: `<path d="M48 16l26 10v22c0 18-12 28-26 34-14-6-26-16-26-34V26l26-10z" fill="#581c87" fill-opacity="0.4" stroke="#c084fc" stroke-width="4" stroke-linejoin="round"/><path d="M48 26v44M32 44h32" stroke="#e9d5ff" stroke-width="3"/>`
        }
      ];

      let firstSlot = null;
      for (let i = 0; i < slotItems.length; i++) {
        const it = slotItems[i];
        const s = Studio.create('Slot', {
          name: it.name,
          x: cx + 48 + i * 132, y: cy + 196, w: 108, h: 108, radius: 16,
          fillColor1: '#262b3d', fillColor2: '#151824',
          borderStyle: 'bevel', borderWidth: 3, borderColor: it.border,
          text: it.tag, fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700,
          textAlign: 'right', textVAlign: 'bottom', textPadding: 10, textStrokeWidth: 2, textStrokeColor: '#000000'
        });
        await Studio.setIcon(s, `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${it.svg}</svg>`, { scale: 0.78, opacity: 0.95 });
        if (i === 0) firstSlot = s;
        hudGroup.push(s);
      }

      // Sub-painel de atributos + Medidor Circular de Nível
      hudGroup.push(Studio.create('Painel', {
        name: tr('Subpainel: Atributos', 'Subpanel: Stats'),
        x: cx + 48, y: cy + 334, w: cw - 96, h: 350, radius: 14,
        fillType: 'solid', fillColor1: '#0c0e15', fillOpacity: 0.9,
        borderStyle: 'inset', borderWidth: 2, borderColor: '#252a3a', dropShadow: false
      }));

      hudGroup.push(Studio.create('Anel', {
        name: tr('Anel de Nível (LVL)', 'Level Ring (LVL)'),
        x: cx + 82, y: cy + 378, w: 190, h: 190,
        ringValue: 78, ringThickness: 12, ringStart: -90,
        ringColor1: '#f59e0b', ringColor2: '#fde047', ringTrackColor: '#1b1f2e', ringGlow: true,
        ringShowValue: false, text: 'LVL\n42',
        fontFamily: 'Orbitron', fontSize: 34, fontWeight: 700, textColor: '#fef08a'
      }));

      hudGroup.push(Studio.text(
        tr(
          'ATRIBUTOS DO HERÓI\n\n• Ataque Físico:   245 (+32)\n• Defesa Mágica:  180\n• Veloc. Crítico:  28.5%\n• Peso da Carga:   42 / 90 kg\n\n[Duplo clique para editar texto]',
          'HERO ATTRIBUTES\n\n• Physical Attack:  245 (+32)\n• Magic Defense:    180\n• Crit Speed:       28.5%\n• Carry Weight:     42 / 90 kg\n\n[Double-click to edit text]'
        ),
        {
          name: tr('Lista de Atributos', 'Attributes List'),
          x: cx + 300, y: cy + 368, w: 236, h: 280,
          fontFamily: 'Inter', fontSize: 15, fontWeight: 500,
          lineHeight: 1.45, textColor: '#cbd5e1', textAlign: 'left', textVAlign: 'top'
        }
      ));

      // Botões de Ação na base da Mochila (Geram _hover e _pressed no ZIP automaticamente!)
      hudGroup.push(Studio.create('Botão', {
        name: tr('Botão: Equipar Item', 'Button: Equip Item'),
        x: cx + 48, y: cy + 720, w: 242, h: 64, radius: 12,
        fillColor1: '#0284c7', fillColor2: '#1e3a8a',
        borderStyle: 'bevel', borderWidth: 3, borderColor: '#38bdf8',
        text: tr('EQUIPAR ITEM', 'EQUIP ITEM'), fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, letterSpacing: 2
      }));

      hudGroup.push(Studio.create('Botão', {
        name: tr('Botão: Melhorar', 'Button: Upgrade'),
        x: cx + 310, y: cy + 720, w: 242, h: 64, radius: 12,
        fillColor1: '#b45309', fillColor2: '#451a03',
        borderStyle: 'glow', borderWidth: 2, borderColor: '#fbbf24',
        text: tr('★ MELHORAR', '★ UPGRADE'), fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, letterSpacing: 2, textColor: '#fef08a'
      }));

      Studio.group(hudGroup, tr('03. Mini-HUD Interativo (Centro)', '03. Interactive Mini-HUD (Center)'));

      // ============================================================================
      // 4. COLUNA DIREITA: MOSTRUÁRIO DE COMPONENTES ("COISAS DISPONÍVEIS")
      // ============================================================================
      const kitGroup = [];
      const kx = 1220, ky = 156, kw = 620, kh = 840;

      kitGroup.push(Studio.create('Painel', {
        name: tr('Painel: Mostruário de Peças', 'Panel: Component Showcase'),
        x: kx, y: ky, w: kw, h: kh, radius: 16,
        fillType: 'gradient', gradientDir: 'vertical',
        fillColor1: '#161922', fillColor2: '#0e1017', fillOpacity: 0.95,
        borderStyle: 'bevel', borderWidth: 2, borderColor: '#2e3446'
      }));

      kitGroup.push(Studio.text(tr('🎨 PEÇAS DISPONÍVEIS (COPIE E USE!)', '🎨 AVAILABLE PIECES (COPY & USE!)'), {
        name: tr('Título Mostruário', 'Showcase Title'),
        x: kx + 32, y: ky + 28, w: kw - 64, h: 36,
        fontFamily: 'Rajdhani', fontSize: 26, fontWeight: 700,
        letterSpacing: 2, textColor: '#f472b6', textAlign: 'left'
      }));

      // A) Formas Poligonais & Estrelas (Tipo 'Forma')
      kitGroup.push(Studio.text(tr('FORMAS GEOMÉTRICAS (ESTRELA, LOSANGO, HEXÁGONO, SETA)', 'SHAPES (STAR, DIAMOND, HEXAGON, ARROW)'), {
        name: tr('Rótulo: Formas', 'Label: Shapes'), x: kx + 32, y: ky + 82, w: kw - 64, h: 24,
        fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600, textColor: '#94a3b8', textAlign: 'left'
      }));

      kitGroup.push(Studio.create('Forma', {
        name: tr('Forma: Estrela 5 Pontas', 'Shape: 5-Point Star'),
        shapeKind: 'star', shapeSides: 5, shapeInnerRatio: 0.45,
        x: kx + 40, y: ky + 118, w: 116, h: 116,
        fillColor1: '#fde047', fillColor2: '#ca8a04', borderStyle: 'glow', borderWidth: 2, borderColor: '#fef08a'
      }));

      kitGroup.push(Studio.create('Forma', {
        name: tr('Forma: Gema Losango', 'Shape: Diamond Gem'),
        shapeKind: 'polygon', shapeSides: 4,
        x: kx + 184, y: ky + 118, w: 116, h: 116,
        fillColor1: '#c084fc', fillColor2: '#581c87', borderStyle: 'double', borderWidth: 4, borderColor: '#f3e8ff',
        text: 'GEM', fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700
      }));

      kitGroup.push(Studio.create('Forma', {
        name: tr('Forma: Badge Hexágono', 'Shape: Hexagon Badge'),
        shapeKind: 'polygon', shapeSides: 6,
        x: kx + 328, y: ky + 118, w: 116, h: 116,
        fillColor1: '#2dd4bf', fillColor2: '#115e59', borderStyle: 'bevel', borderWidth: 3, borderColor: '#99f6e4',
        text: 'RANK\nS', fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700
      }));

      kitGroup.push(Studio.create('Forma', {
        name: tr('Forma: Seta Direcional', 'Shape: Directional Arrow'),
        shapeKind: 'arrow',
        x: kx + 472, y: ky + 136, w: 112, h: 80,
        fillColor1: '#f43f5e', fillColor2: '#881337', borderStyle: 'solid', borderWidth: 2, borderColor: '#fda4af'
      }));

      // B) Cantos Chanfrados (Sci-Fi / Cyberpunk) vs Cantos Livres
      kitGroup.push(Studio.text(tr('ESTILOS DE CANTO & MOLDURAS (CHANFRADO / DUPLA / TRACEJADA)', 'CORNER & BORDER STYLES (CHAMFER / DOUBLE / DASHED)'), {
        name: tr('Rótulo: Cantos', 'Label: Corners'), x: kx + 32, y: ky + 266, w: kw - 64, h: 24,
        fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600, textColor: '#94a3b8', textAlign: 'left'
      }));

      kitGroup.push(Studio.create('Painel', {
        name: tr('Card Sci-Fi (Canto Chanfrado)', 'Sci-Fi Card (Chamfer Corner)'),
        x: kx + 40, y: ky + 302, w: 265, h: 130,
        cornerStyle: 'chamfer', independentRadius: true, radiusTL: 22, radiusTR: 0, radiusBR: 22, radiusBL: 0,
        fillColor1: '#0f293a', fillColor2: '#07131c',
        borderStyle: 'glow', borderWidth: 2, borderColor: '#22d3ee',
        text: tr('CANTO CHANFRADO\n(Sci-Fi / Militar)', 'CHAMFERED CORNER\n(Sci-Fi / Tactical)'),
        fontFamily: 'Chakra Petch', fontSize: 18, fontWeight: 700, textColor: '#67e8f9'
      }));

      kitGroup.push(Studio.create('Painel', {
        name: tr('Card Gótico (Borda Dupla)', 'Gothic Card (Double Border)'),
        x: kx + 325, y: ky + 302, w: 260, h: 130,
        radius: 16, fillColor1: '#27171c', fillColor2: '#11090c',
        borderStyle: 'double', borderWidth: 6, borderColor: '#f59e0b',
        text: tr('BORDA DUPLA\n(RPG / Fantasia)', 'DOUBLE BORDER\n(RPG / Fantasy)'),
        fontFamily: 'Cinzel', fontSize: 17, fontWeight: 700, textColor: '#fde68a'
      }));

      // C) Medidores Circulares Radiais (Cooldown / Velocímetro / Stamina)
      kitGroup.push(Studio.text(tr('MEDIDORES CIRCULARES (ANEL RADIAL COM VALOR AUTOMÁTICO)', 'CIRCULAR GAUGES (RADIAL RING WITH AUTO VALUE)'), {
        name: tr('Rótulo: Anéis', 'Label: Rings'), x: kx + 32, y: ky + 464, w: kw - 64, h: 24,
        fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600, textColor: '#94a3b8', textAlign: 'left'
      }));

      kitGroup.push(Studio.create('Anel', {
        name: tr('Anel: Stamina Verde', 'Ring: Green Stamina'),
        x: kx + 48, y: ky + 502, w: 148, h: 148,
        ringValue: 65, ringThickness: 10, ringStart: -90,
        ringColor1: '#10b981', ringColor2: '#86efac', ringTrackColor: '#091914', ringGlow: true,
        ringShowValue: true, fontFamily: 'Rajdhani', fontSize: 40, fontWeight: 700, textColor: '#a7f3d0'
      }));

      kitGroup.push(Studio.create('Anel', {
        name: tr('Anel: Magia Arcana', 'Ring: Arcane Magic'),
        x: kx + 236, y: ky + 502, w: 148, h: 148,
        ringValue: 40, ringThickness: 10, ringStart: 135,
        ringColor1: '#9333ea', ringColor2: '#f0abfc', ringTrackColor: '#190b28', ringGlow: true,
        ringShowValue: true, fontFamily: 'Rajdhani', fontSize: 40, fontWeight: 700, textColor: '#f5d0fe'
      }));

      kitGroup.push(Studio.create('Anel', {
        name: tr('Anel: Cooldown Skill', 'Ring: Skill Cooldown'),
        x: kx + 424, y: ky + 502, w: 148, h: 148,
        ringValue: 90, ringThickness: 8, ringStart: -90,
        ringColor1: '#0284c7', ringColor2: '#38bdf8', ringTrackColor: '#0c1928', ringGlow: true,
        ringShowValue: false, text: '2.4s', fontFamily: 'JetBrains Mono', fontSize: 30, fontWeight: 700, textColor: '#bae6fd'
      }));

      // D) Mostra de Fontes de Jogos Embutidas
      kitGroup.push(Studio.create('Painel', {
        name: tr('Mostra de Fontes', 'Fonts Showcase'),
        x: kx + 40, y: ky + 682, w: kw - 80, h: 126, radius: 12,
        fillType: 'solid', fillColor1: '#0b0d13',
        borderStyle: 'dashed', borderWidth: 2, borderColor: '#3f3f46', dropShadow: false,
        text: tr(
          '13 FONTES DE JOGO PRONTAS PARA PNG / SVG / GODOT:\nOrbitron  •  Cinzel  •  Rajdhani  •  Chakra Petch  •  Press Start 2P',
          '13 GAME FONTS READY FOR PNG / SVG / GODOT:\nOrbitron  •  Cinzel  •  Rajdhani  •  Chakra Petch  •  Press Start 2P'
        ),
        fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 600, lineHeight: 1.5, textColor: '#e4e4e7'
      }));

      Studio.group(kitGroup, tr('04. Mostruário de Peças (Direita)', '04. Component Showcase (Right)'));

      // Deixa o primeiro slot de poção selecionado para o Inspector já abrir preenchido e vivo!
      if (firstSlot) Studio.select(firstSlot);
      return tr('🎉 Cena de Boas-Vindas criada!', '🎉 Welcome Scene created!');
    }

    // Texto de um preset que é uma função de verdade: o corpo dela, sem a indentação do arquivo.
    function presetCodeFrom(fn) {
      const src = fn.toString();
      return src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'))
        .split('\n').map(line => line.replace(/^ {6}/, '')).join('\n').trim() + '\n';
    }

    function welcomeScenePresetCode() {
      return presetCodeFrom(welcomeSceneScript);
    }

    // Trocar PT ⇄ EN refaz a cena de boas-vindas enquanto ninguém mexeu nela. A assinatura (hash do
    // conteúdo) fica no localStorage para valer também depois de recarregar a página.
    const WELCOME_KEY = 'game_dev_ui_studio_welcome';
    let welcomeQueue = Promise.resolve();

    function sceneSignature() {
      const text = JSON.stringify([
        state.components.map(({ icon, iconSrc, ...rest }) => rest),
        state.groups.map(g => [g.id, g.name, g.visible]),
        state.guides
      ]);
      let h = 0x811c9dc5; // FNV-1a
      for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
      return `${text.length}:${(h >>> 0).toString(16)}`;
    }

    function isPristineWelcomeScene() {
      if (state.components.length === 0) return false;
      try { return localStorage.getItem(WELCOME_KEY) === sceneSignature(); } catch (err) { return false; }
    }

    function buildWelcomeScene() {
      welcomeQueue = welcomeQueue.then(async () => {
        if (state.canvasWidth !== 1920 || state.canvasHeight !== 1080) {
          applyCanvasResolution('1920x1080');
          canvasResSelect.value = '1920x1080';
        }
        // Sem "Criado: grupo..." pipocando na abertura e sem redesenhar a cena a cada peça (48 itens).
        toastMuted = true;
        renderSuspended = true;
        try { await welcomeSceneScript(Studio); } finally { toastMuted = false; renderSuspended = false; }
        refreshAll();
        fitCanvasToViewport();
        // A cena inicial é o ponto de partida: Ctrl+Z não desmonta ela peça por peça.
        history.undo = [];
        history.redo = [];
        history.current = snapshotDocument();
        updateHistoryButtons();
        try { localStorage.setItem(WELCOME_KEY, sceneSignature()); } catch (err) {}
      }).catch(err => console.warn('Cena de boas-vindas falhou:', err));
      return welcomeQueue;
    }

