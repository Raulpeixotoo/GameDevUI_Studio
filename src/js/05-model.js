    // Padding transparente em volta de cada PNG exportado (espaço para drop shadow e glow não serem cortados).
    const EXPORT_PAD = 32;

    // Margens 9-slice. "component" é medido a partir da borda do componente (guias no canvas).
    // "texture" é medido no PNG exportado, que tem EXPORT_PAD em cada lado; é isso que a engine precisa.
    function computeNineSlice(comp, scale = 1) {
      const rTL = comp.independentRadius ? comp.radiusTL : comp.radius;
      const rTR = comp.independentRadius ? comp.radiusTR : comp.radius;
      const rBR = comp.independentRadius ? comp.radiusBR : comp.radius;
      const rBL = comp.independentRadius ? comp.radiusBL : comp.radius;
      const edge = (r) => Math.max(r + comp.borderWidth + 2, 6);
      const maxH = Math.max(0, Math.floor(comp.w / 2 - 1));
      const maxV = Math.max(0, Math.floor(comp.h / 2 - 1));

      const component = {
        left: Math.min(edge(Math.max(rTL, rBL)), maxH),
        right: Math.min(edge(Math.max(rTR, rBR)), maxH),
        top: Math.min(edge(Math.max(rTL, rTR)), maxV),
        bottom: Math.min(edge(Math.max(rBL, rBR)), maxV)
      };

      const pad = EXPORT_PAD * scale;
      const texture = {
        left: Math.round(component.left * scale + pad),
        right: Math.round(component.right * scale + pad),
        top: Math.round(component.top * scale + pad),
        bottom: Math.round(component.bottom * scale + pad)
      };

      return {
        component,
        texture,
        pad: Math.round(pad),
        textureWidth: Math.round(comp.w * scale + pad * 2),
        textureHeight: Math.round(comp.h * scale + pad * 2)
      };
    }

    // Situações em que o sprite fatiado vai distorcer ao ser esticado na engine.
    function getNineSliceWarnings(comp, slice) {
      const warnings = [];
      if (comp.icon && comp.exportWithIcon !== false) {
        warnings.push('Imagem embutida no centro será esticada no modo Sliced. Use a versão de Frames_Only_NoIcons e coloque o ícone como Image separada.');
      }
      if (comp.innerShadow && (comp.fillOpacity ?? 1) > 0.05) {
        const shadowDepth = Math.min(comp.innerShadowSize ?? 24, comp.h * 0.5);
        if (shadowDepth > slice.component.top) {
          warnings.push(`Sombra interna (${Math.round(shadowDepth)}px) passa da margem superior (${slice.component.top}px) e vai esticar junto com o centro.`);
        }
      }
      if (hasTexture(comp)) {
        warnings.push('Textura (ruído/scanlines) estica junto com o centro no modo Sliced. Use Tiled no centro ou aplique a textura na engine.');
      }
      if (componentLabel(comp) && comp.exportWithText !== false) {
        warnings.push('Texto embutido no PNG distorce no modo Sliced. Use o frameFile e recrie o texto na engine (dados em "text").');
      }
      if (comp.type === 'Barra' && (comp.barValue ?? 100) < 100) {
        warnings.push('Barra parcialmente cheia não deve ser fatiada: use trackFile + fillFile (pasta Bars_Track_And_Fill) com Image Filled.');
      }
      if (comp.type === 'Anel') {
        warnings.push('Anel não é 9-slice: use Image Type Filled / Radial 360 na engine.');
      }
      if (comp.type === 'Forma') {
        warnings.push('Forma não é fatiável: importe como sprite simples (Image Type Simple / Draw As Image).');
      }
      return warnings;
    }

    function hexToRgba(hex, alpha = 1) {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Valor padrão de TODAS as propriedades de um componente. Projetos antigos são completados com
    // isto ao carregar (normalizeComponent), então o renderer nunca lida com campo ausente.
    const COMPONENT_DEFAULTS = {
      groupId: null, x: 100, y: 100, w: 96, h: 96, visible: true, locked: false, opacity: 1, rotation: 0,
      independentRadius: false, radius: 12, radiusTL: 12, radiusTR: 12, radiusBR: 12, radiusBL: 12, cornerStyle: 'round',
      fillType: 'gradient', gradientDir: 'vertical', fillOpacity: 1, fillColor1: '#262938', fillColor2: '#161822',
      borderStyle: 'solid', borderWidth: 3, borderColor: '#4e5b7a', bevelStrength: 0.35,
      dropShadow: true, shadowColor: '#000000', shadowOpacity: 0.6, shadowBlur: 18, shadowOffsetX: 0, shadowOffsetY: 8,
      innerShadow: true, innerShadowColor: '#000000', innerShadowOpacity: 0.55, innerShadowSize: 24, innerHighlight: 0.12,
      icon: null, iconSrc: null, iconOpacity: 0.8, iconScale: 0.7, iconFit: 'contain', iconOffsetX: 0, iconOffsetY: 0,
      iconFilter: 'none', exportWithIcon: true,
      text: '', fontFamily: 'Inter', fontSize: 24, fontWeight: 600, textColor: '#f4f4f5', textAlign: 'center', textVAlign: 'middle',
      letterSpacing: 0, lineHeight: 1.2, textUppercase: false, textEffect: 'none', textStrokeWidth: 0, textStrokeColor: '#000000',
      textPadding: 8, exportWithText: true,
      barValue: 100, barDirection: 'ltr', barSegments: 0, trackColor: '#0c0d12',
      ringValue: 75, ringThickness: 10, ringStart: -90, ringColor1: '#f97316', ringColor2: '#fde047', ringTrackColor: '#1f2129', ringGlow: true,
      ringShowValue: false,
      exportStates: false,
      shapeKind: 'star', shapeSides: 5, shapeInnerRatio: 0.45,
      noise: 0, scanlines: 0, scanlineSpacing: 4,
      anchorH: 'left', anchorV: 'top'
    };

    // ---- Âncoras (R8, TDD no DOCS 2.9) ----
    // Frações na convenção do Studio (Y para baixo). Esticar = de 0 a 1 no eixo.
    const ANCHOR_H = ['left', 'center', 'right', 'stretch'];
    const ANCHOR_V = ['top', 'middle', 'bottom', 'stretch'];
    const ANCHOR_FRAC = { left: 0, center: 0.5, right: 1, top: 0, middle: 0.5, bottom: 1 };
    const anchorRange = (mode) => (mode === 'stretch' ? [0, 1] : [ANCHOR_FRAC[mode], ANCHOR_FRAC[mode]]);
    const round2 = (v) => { const n = Math.round(v * 100) / 100; return Object.is(n, -0) ? 0 : n; };

    // rect = retângulo do componente e texRect = retângulo da textura (com padding), ambos em px de saída.
    function describeAnchors(comp, rect, texRect, W, H) {
      const [hMin, hMax] = anchorRange(comp.anchorH);
      const [vMin, vMax] = anchorRange(comp.anchorV);
      const stretchH = comp.anchorH === 'stretch', stretchV = comp.anchorV === 'stretch';
      const pt = (x, y) => ({ x: round2(x), y: round2(y) });

      // Unity: Y para cima. offsetMin/offsetMax = cantos do rect em relação às âncoras.
      const uMinY = 1 - vMax, uMaxY = 1 - vMin;
      const left = rect.x, right = rect.x + rect.w, top = H - rect.y, bottom = H - (rect.y + rect.h);
      const unity = {
        anchorMin: pt(hMin, uMinY), anchorMax: pt(hMax, uMaxY),
        pivot: pt(stretchH ? 0.5 : hMin, stretchV ? 0.5 : 1 - vMin),
        offsetMin: pt(left - hMin * W, bottom - uMinY * H),
        offsetMax: pt(right - hMax * W, top - uMaxY * H)
      };

      // Unreal (CanvasPanel Slot, Y para baixo): eixo de ponto = posição do alinhamento + tamanho; esticado = margens.
      const axis = (stretch, pos, size, total, frac) => (stretch ? [pos, total - (pos + size)] : [pos + frac * size - frac * total, size]);
      const [ol, or] = axis(stretchH, rect.x, rect.w, W, hMin);
      const [ot, ob] = axis(stretchV, rect.y, rect.h, H, vMin);
      const unreal = {
        minimum: pt(hMin, vMin), maximum: pt(hMax, vMax), alignment: pt(stretchH ? 0 : hMin, stretchV ? 0 : vMin),
        offsets: { left: round2(ol), top: round2(ot), right: round2(or), bottom: round2(ob) }
      };

      // Godot: retângulo da textura, como no .tscn.
      const godot = {
        anchor_left: hMin, anchor_top: vMin, anchor_right: hMax, anchor_bottom: vMax,
        offset_left: round2(texRect.x - hMin * W), offset_top: round2(texRect.y - vMin * H),
        offset_right: round2(texRect.x + texRect.w - hMax * W), offset_bottom: round2(texRect.y + texRect.h - vMax * H)
      };
      return { horizontal: comp.anchorH, vertical: comp.anchorV, unity, unreal, godot };
    }

    // Prévia responsiva: reposiciona pelas âncoras quando a resolução muda (como as constraints do Figma).
    function relayoutByAnchors(oldW, oldH, newW, newH) {
      const axis = (mode, pos, size, oldT, newT) => {
        if (mode === 'right' || mode === 'bottom') return [pos + (newT - oldT), size];
        if (mode === 'center' || mode === 'middle') return [pos + (newT - oldT) / 2, size];
        if (mode === 'stretch') return [pos, Math.max(8, size + (newT - oldT))];
        return [pos, size];
      };
      let moved = 0;
      state.components.forEach(c => {
        const [x, w] = axis(c.anchorH, c.x, c.w, oldW, newW);
        const [y, h] = axis(c.anchorV, c.y, c.h, oldH, newH);
        if (x !== c.x || y !== c.y || w !== c.w || h !== c.h) moved++;
        Object.assign(c, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      });
      return moved;
    }

    // Auto: âncora pela posição do centro do item (terços da cena); item com mais de 80% do eixo estica.
    function autoAnchor(comp) {
      const pick = (pos, size, total, modes) => {
        if (size >= total * 0.8) return 'stretch';
        const c = (pos + size / 2) / total;
        return c < 1 / 3 ? modes[0] : c > 2 / 3 ? modes[2] : modes[1];
      };
      comp.anchorH = pick(comp.x, comp.w, state.canvasWidth, ['left', 'center', 'right']);
      comp.anchorV = pick(comp.y, comp.h, state.canvasHeight, ['top', 'middle', 'bottom']);
    }

    const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
    const isImageDataUrl = (src) => typeof src === 'string' && /^data:image\//i.test(src);

    // Completa campos ausentes e força o tipo de cada campo pelo tipo do padrão. Projetos e colagens
    // vêm de fora (JSON de terceiros), então um "x" string ou uma cor com HTML não pode chegar ao
    // renderer, ao innerHTML das snap lines nem aos exports.
    function normalizeComponent(comp) {
      // Estados hover/pressed: Botão gera por padrão, inclusive em projetos de antes da R5.
      if (comp.exportStates === undefined) comp.exportStates = comp.type === 'Botão';
      for (const [key, value] of Object.entries(COMPONENT_DEFAULTS)) {
        const cur = comp[key];
        if (cur === undefined) {
          comp[key] = value;
        } else if (typeof value === 'number') {
          const n = Number(cur);
          comp[key] = Number.isFinite(n) ? n : value;
        } else if (value !== null && typeof cur !== typeof value) {
          comp[key] = value;
        } else if (typeof value === 'string' && /Color\d?$/.test(key)) {
          if (!HEX_COLOR_RE.test(comp[key])) comp[key] = value;
        }
      }
      if (!ANCHOR_H.includes(comp.anchorH)) comp.anchorH = 'left';
      if (!ANCHOR_V.includes(comp.anchorV)) comp.anchorV = 'top';
      if (comp.groupId !== null && !Number.isFinite(comp.groupId)) comp.groupId = null;
      if (comp.iconSrc !== null && !isImageDataUrl(comp.iconSrc)) comp.iconSrc = null;
      if (typeof comp.name !== 'string') comp.name = String(comp.name ?? '');
      if (typeof comp.type !== 'string') comp.type = 'Slot';
      return comp;
    }

    // Campos de nível de projeto de um JSON importado (componentes passam por normalizeComponent).
    function sanitizeProjectData(data) {
      const int = (v, min, max) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
      };
      data.components = data.components.filter(c => c && typeof c === 'object' && !Array.isArray(c));
      // id ausente, não numérico ou repetido quebraria seleção e grupos: ganha um novo.
      const seen = new Set();
      data.components.forEach(c => {
        if (!Number.isFinite(c.id) || seen.has(c.id)) c.id = undefined; else seen.add(c.id);
      });
      let maxId = Math.max(0, ...seen);
      data.components.forEach(c => { if (c.id === undefined) c.id = ++maxId; });

      // Canvas gigante estoura a memória da aba: fora da faixa, mantém a resolução atual.
      data.canvasWidth = int(data.canvasWidth, 16, 8192);
      data.canvasHeight = int(data.canvasHeight, 16, 8192);
      data.nextId = Math.max(int(data.nextId, 1, 1e9) || 1, maxId + 1);

      data.groups = (Array.isArray(data.groups) ? data.groups : [])
        .filter(g => g && Number.isFinite(g.id))
        .map(g => ({ id: g.id, name: String(g.name ?? ''), visible: g.visible !== false, collapsed: g.collapsed === true }));
      data.nextGroupId = Math.max(int(data.nextGroupId, 1, 1e9) || 1, ...data.groups.map(g => g.id + 1));

      data.guides = (Array.isArray(data.guides) ? data.guides : [])
        .filter(g => g && (g.axis === 'h' || g.axis === 'v') && Number.isFinite(g.pos) && Number.isFinite(g.id));
      data.nextGuideId = Math.max(int(data.nextGuideId, 1, 1e9) || 1, ...data.guides.map(g => g.id + 1));

      const bg = data.sceneBackground;
      data.sceneBackground = bg && typeof bg.mode === 'string' && HEX_COLOR_RE.test(bg.color)
        ? { mode: bg.mode, color: bg.color } : undefined;

      if (data.reference && !isImageDataUrl(data.reference.src)) data.reference = null;
      return data;
    }

    // Anel com "Mostrar valor no centro": o rótulo é o próprio valor, calculado no desenho
    // (acompanha o slider e os scripts sem copiar nada para comp.text).
    function componentLabel(comp) {
      if (comp.type === 'Anel' && comp.ringShowValue) return String(Math.round(comp.ringValue ?? 0));
      return comp.text;
    }

    // Quem define o texto de um Anel passa a mandar nele: desliga o valor automático.
    function releaseRingLabel(comps) {
      let changed = false;
      comps.forEach(c => {
        if (c.type === 'Anel' && c.ringShowValue) { c.ringShowValue = false; changed = true; }
      });
      return changed;
    }

    // Transparente, sem borda e sem sombras: base de Texto e Anel.
    const BARE_BOX = { fillOpacity: 0, borderWidth: 0, dropShadow: false, innerShadow: false };

    function createComponentPreset(type) {
      const id = state.nextId++;
      const preset = normalizeComponent({ id, name: `${t(type)} ${id}`, type });

      if (type === 'Slot') {
        Object.assign(preset, {
          w: 96, h: 96, radius: 14, borderWidth: 3,
          fillColor1: '#272b3a', fillColor2: '#171924', borderColor: '#495570'
        });
      } else if (type === 'Botão') {
        Object.assign(preset, {
          w: 200, h: 54, radius: 10, borderWidth: 2, borderStyle: 'bevel',
          fillColor1: '#1f3b5c', fillColor2: '#0d2238', borderColor: '#0d99ff',
          text: t('Botão').toUpperCase(), fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, letterSpacing: 1.5
        });
      } else if (type === 'Barra') {
        Object.assign(preset, {
          w: 340, h: 32, radius: 6, borderWidth: 2, borderStyle: 'glow',
          fillColor1: '#dc2626', fillColor2: '#7f1d1d', borderColor: '#ef4444',
          barValue: 75, trackColor: '#1a0909', innerShadow: false
        });
      } else if (type === 'Painel') {
        Object.assign(preset, {
          w: 520, h: 380, radius: 18, borderWidth: 4, borderStyle: 'bevel', bevelStrength: 0.2,
          fillColor1: '#191a22', fillColor2: '#101116', borderColor: '#383b48'
        });
      } else if (type === 'Texto') {
        Object.assign(preset, BARE_BOX, {
          w: 360, h: 64, radius: 0,
          text: t('Novo texto'), fontFamily: 'Rajdhani', fontSize: 36, fontWeight: 600
        });
      } else if (type === 'Forma') {
        Object.assign(preset, {
          w: 160, h: 160, radius: 0, borderWidth: 3, borderStyle: 'solid', innerShadow: false,
          fillColor1: '#fde047', fillColor2: '#f59e0b', borderColor: '#78350f',
          shapeKind: 'star', shapeSides: 5, shapeInnerRatio: 0.45
        });
      } else if (type === 'Anel') {
        Object.assign(preset, BARE_BOX, {
          w: 180, h: 180, radius: 90,
          ringValue: 75, ringShowValue: true, text: '', fontSize: 48, fontWeight: 300
        });
      }

      preset.x = Math.round(state.canvasWidth / 2 - preset.w / 2 + (Math.random() * 80 - 40));
      preset.y = Math.round(state.canvasHeight / 2 - preset.h / 2 + (Math.random() * 80 - 40));

      return preset;
    }

