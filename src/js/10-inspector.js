    // ===== Inspector =====
    function getSelectedComponents() {
      const ids = state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
      return state.components.filter(c => ids.includes(c.id));
    }

    // Presets de sombra: um clique aplica um conjunto coerente; mexer à mão mostra "Personalizado".
    const EFFECT_PRESETS = {
      none: { dropShadow: false, innerShadow: false },
      soft: { dropShadow: true, shadowColor: '#000000', shadowOpacity: 0.35, shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 4, innerShadow: false },
      deep: { dropShadow: true, shadowColor: '#000000', shadowOpacity: 0.6, shadowBlur: 18, shadowOffsetX: 0, shadowOffsetY: 8,
              innerShadow: true, innerShadowColor: '#000000', innerShadowOpacity: 0.55, innerShadowSize: 24, innerHighlight: 0.12 },
      floating: { dropShadow: true, shadowColor: '#000000', shadowOpacity: 0.45, shadowBlur: 40, shadowOffsetX: 0, shadowOffsetY: 20, innerShadow: false },
      socket: { dropShadow: false, innerShadow: true, innerShadowColor: '#000000', innerShadowOpacity: 0.8, innerShadowSize: 18, innerHighlight: 0.08 }
    };
    const EFFECT_KEYS = new Set(['dropShadow', 'shadowColor', 'shadowOpacity', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
      'innerShadow', 'innerShadowColor', 'innerShadowOpacity', 'innerShadowSize', 'innerHighlight']);

    function matchEffectPreset(comp) {
      for (const [name, preset] of Object.entries(EFFECT_PRESETS)) {
        // Detalhes de uma sombra desligada não contam na comparação.
        const same = Object.entries(preset).every(([key, value]) => {
          if (key.startsWith('shadow') && !preset.dropShadow) return true;
          if ((key.startsWith('innerShadow') && key !== 'innerShadow') || key === 'innerHighlight') {
            if (!preset.innerShadow) return true;
          }
          return comp[key] === value;
        });
        if (same) return name;
      }
      return 'custom';
    }

    function updateEffectPresetDisplay(comp) {
      const select = document.getElementById('propEffectPreset');
      if (select && comp) select.value = matchEffectPreset(comp);
    }

    const SHAPE_PRESETS = {
      star: { shapeKind: 'star', shapeSides: 5 },
      triangle: { shapeKind: 'polygon', shapeSides: 3 },
      diamond: { shapeKind: 'polygon', shapeSides: 4 },
      hexagon: { shapeKind: 'polygon', shapeSides: 6 },
      polygon: { shapeKind: 'polygon', shapeSides: 5 },
      ellipse: { shapeKind: 'ellipse' },
      arrow: { shapeKind: 'arrow' }
    };

    function matchShapePreset(comp) {
      if (comp.shapeKind === 'star' || comp.shapeKind === 'ellipse' || comp.shapeKind === 'arrow') return comp.shapeKind;
      return { 3: 'triangle', 4: 'diamond', 6: 'hexagon' }[comp.shapeSides] || 'polygon';
    }

    // Cada binding liga um controle do Inspector a uma propriedade do componente.
    // scope 'primary' = só o item principal (nome, posição, tamanho); o padrão aplica a TODA a seleção.
    // kind define leitura/escrita: int, float, percent (0..1 exibido como 0..100), text, select,
    // selectInt, color, hex (só grava hex completo) e check.
    const INSPECTOR_BINDINGS = [
      { id: 'propName', key: 'name', kind: 'text', scope: 'primary', after: 'layers' },
      { id: 'propX', key: 'x', kind: 'int', scope: 'primary' },
      { id: 'propY', key: 'y', kind: 'int', scope: 'primary' },
      { id: 'propW', key: 'w', kind: 'int', scope: 'primary', min: 8 },
      { id: 'propH', key: 'h', kind: 'int', scope: 'primary', min: 8 },
      { id: 'propRotation', key: 'rotation', kind: 'float', min: -360, max: 360 },
      { id: 'propShapeSides', key: 'shapeSides', kind: 'int', min: 3, max: 12, label: 'shapeSidesVal', after: 'inspector' },
      { id: 'propShapeInnerRatio', key: 'shapeInnerRatio', kind: 'percent', label: 'shapeInnerVal' },
      { id: 'propOpacity', key: 'opacity', kind: 'percent', label: 'opacityVal' },
      { id: 'propAnchorH', key: 'anchorH', kind: 'select' },
      { id: 'propAnchorV', key: 'anchorV', kind: 'select' },

      { id: 'propText', key: 'text', kind: 'text' },
      { id: 'propFontFamily', key: 'fontFamily', kind: 'select' },
      { id: 'propFontWeight', key: 'fontWeight', kind: 'selectInt' },
      { id: 'propFontSize', key: 'fontSize', kind: 'int', min: 6, max: 400 },
      { id: 'propTextColor', key: 'textColor', kind: 'color' },
      { id: 'propTextHex', key: 'textColor', kind: 'hex' },
      { id: 'propLetterSpacing', key: 'letterSpacing', kind: 'float', min: -20, max: 100 },
      { id: 'propLineHeight', key: 'lineHeight', kind: 'float', min: 0.5, max: 3 },
      { id: 'propTextEffect', key: 'textEffect', kind: 'select' },
      { id: 'propTextStrokeWidth', key: 'textStrokeWidth', kind: 'float', min: 0, max: 20 },
      { id: 'propTextStrokeColor', key: 'textStrokeColor', kind: 'color' },
      { id: 'propTextUppercase', key: 'textUppercase', kind: 'check' },
      { id: 'propExportWithText', key: 'exportWithText', kind: 'check' },

      { id: 'propBarValue', key: 'barValue', kind: 'int', min: 0, max: 100 },
      { id: 'propBarValueNum', key: 'barValue', kind: 'int', min: 0, max: 100 },
      { id: 'propBarDirection', key: 'barDirection', kind: 'select' },
      { id: 'propBarSegments', key: 'barSegments', kind: 'int', min: 0, max: 50 },
      { id: 'propTrackColor', key: 'trackColor', kind: 'color' },

      { id: 'propRingValue', key: 'ringValue', kind: 'int', min: 0, max: 100 },
      { id: 'propRingValueNum', key: 'ringValue', kind: 'int', min: 0, max: 100 },
      { id: 'propRingThickness', key: 'ringThickness', kind: 'int', min: 1, max: 200 },
      { id: 'propRingStart', key: 'ringStart', kind: 'int', min: -360, max: 360 },
      { id: 'propRingColor1', key: 'ringColor1', kind: 'color' },
      { id: 'propRingColor2', key: 'ringColor2', kind: 'color' },
      { id: 'propRingTrackColor', key: 'ringTrackColor', kind: 'color' },
      { id: 'propRingGlow', key: 'ringGlow', kind: 'check' },
      { id: 'propRingShowValue', key: 'ringShowValue', kind: 'check' },
      { id: 'propExportStates', key: 'exportStates', kind: 'check' },

      { id: 'propIconFit', key: 'iconFit', kind: 'select' },
      { id: 'propIconScale', key: 'iconScale', kind: 'percent', label: 'iconScaleText' },
      { id: 'propIconOpacity', key: 'iconOpacity', kind: 'percent', label: 'iconOpacityText' },
      { id: 'propIconOffsetX', key: 'iconOffsetX', kind: 'int' },
      { id: 'propIconOffsetY', key: 'iconOffsetY', kind: 'int' },
      { id: 'propIconFilter', key: 'iconFilter', kind: 'select' },
      { id: 'propExportWithIcon', key: 'exportWithIcon', kind: 'check' },

      { id: 'propCornerStyle', key: 'cornerStyle', kind: 'select' },
      { id: 'propRadius', key: 'radius', kind: 'int', min: 0 },
      { id: 'propRadiusNum', key: 'radius', kind: 'int', min: 0 },
      { id: 'propRadiusTL', key: 'radiusTL', kind: 'int', min: 0 },
      { id: 'propRadiusTR', key: 'radiusTR', kind: 'int', min: 0 },
      { id: 'propRadiusBR', key: 'radiusBR', kind: 'int', min: 0 },
      { id: 'propRadiusBL', key: 'radiusBL', kind: 'int', min: 0 },

      { id: 'propFillType', key: 'fillType', kind: 'select', after: 'inspector' },
      { id: 'propGradientDir', key: 'gradientDir', kind: 'select' },
      { id: 'propFillOpacity', key: 'fillOpacity', kind: 'percent', label: 'fillOpacityVal' },
      { id: 'propFillColor1', key: 'fillColor1', kind: 'color' },
      { id: 'propFillHex1', key: 'fillColor1', kind: 'hex' },
      { id: 'propFillColor2', key: 'fillColor2', kind: 'color' },
      { id: 'propFillHex2', key: 'fillColor2', kind: 'hex' },

      { id: 'propBorderStyle', key: 'borderStyle', kind: 'select', after: 'inspector' },
      { id: 'propBorderWidth', key: 'borderWidth', kind: 'int', min: 0, max: 64 },
      { id: 'propBorderWidthNum', key: 'borderWidth', kind: 'int', min: 0, max: 64 },
      { id: 'propBorderColor', key: 'borderColor', kind: 'color' },
      { id: 'propBorderHex', key: 'borderColor', kind: 'hex' },
      { id: 'propBevelStrength', key: 'bevelStrength', kind: 'percent', label: 'bevelStrengthVal' },

      { id: 'propDropShadow', key: 'dropShadow', kind: 'check', after: 'inspector' },
      { id: 'propShadowColor', key: 'shadowColor', kind: 'color' },
      { id: 'propShadowHex', key: 'shadowColor', kind: 'hex' },
      { id: 'propShadowOpacity', key: 'shadowOpacity', kind: 'percent', label: 'shadowOpacityVal' },
      { id: 'propShadowBlur', key: 'shadowBlur', kind: 'int', min: 0, max: 120 },
      { id: 'propShadowOffsetY', key: 'shadowOffsetY', kind: 'int', min: -60, max: 60 },
      { id: 'propShadowOffsetX', key: 'shadowOffsetX', kind: 'int', min: -60, max: 60 },
      { id: 'propInnerShadow', key: 'innerShadow', kind: 'check', after: 'inspector' },
      { id: 'propInnerShadowColor', key: 'innerShadowColor', kind: 'color' },
      { id: 'propInnerShadowHex', key: 'innerShadowColor', kind: 'hex' },
      { id: 'propInnerShadowOpacity', key: 'innerShadowOpacity', kind: 'percent', label: 'innerShadowOpacityVal' },
      { id: 'propInnerShadowSize', key: 'innerShadowSize', kind: 'int', min: 1, max: 200 },
      { id: 'propInnerHighlight', key: 'innerHighlight', kind: 'percent', label: 'innerHighlightVal' },
      { id: 'propNoise', key: 'noise', kind: 'percent', label: 'noiseVal' },
      { id: 'propScanlines', key: 'scanlines', kind: 'percent', label: 'scanlinesVal' },
      { id: 'propScanlineSpacing', key: 'scanlineSpacing', kind: 'int', min: 2, max: 32 }
    ];

    // Lê o valor digitado; undefined = entrada incompleta (ex.: "-" ou hex pela metade), não grava.
    function readControl(b, el) {
      switch (b.kind) {
        case 'check': return el.checked;
        case 'text': return el.value;
        case 'select': return el.value;
        case 'selectInt': return parseInt(el.value, 10);
        case 'color': return el.value;
        case 'hex': return /^#[0-9a-f]{6}$/i.test(el.value) ? el.value.toLowerCase() : undefined;
        case 'percent': return Math.max(0, parseFloat(el.value) || 0) / 100;
        case 'int':
        case 'float': {
          let v = b.kind === 'int' ? parseInt(el.value, 10) : parseFloat(el.value);
          if (Number.isNaN(v)) return undefined;
          if (b.min !== undefined) v = Math.max(b.min, v);
          if (b.max !== undefined) v = Math.min(b.max, v);
          return v;
        }
      }
      return undefined;
    }

    function writeControl(b, value) {
      const el = document.getElementById(b.id);
      if (!el || value === undefined || value === null) return;
      switch (b.kind) {
        case 'check': el.checked = !!value; break;
        case 'int': el.value = Math.round(value); break;
        case 'float': el.value = Math.round(value * 100) / 100; break;
        case 'percent': el.value = Math.round(value * 100); break;
        case 'hex': el.value = String(value).toUpperCase(); break;
        default: el.value = String(value);
      }
      if (b.label) {
        const lbl = document.getElementById(b.label);
        if (lbl) lbl.textContent = b.kind === 'percent' ? `${Math.round(value * 100)}%` : String(Math.round(value));
      }
    }

    function updateAspectLabel(comp) {
      aspectRatioLabel.textContent = `${(comp.w / comp.h).toFixed(2)}:1`;
    }

    function syncInspector() {
      if (renderSuspended) return;
      const comp = getSelectedComponent();
      const selection = getSelectedComponents();

      inspectorEmpty.classList.toggle('hidden', !!comp);
      inspectorContent.classList.toggle('hidden', !comp);
      propName.disabled = !comp;

      if (!comp) {
        propName.value = '';
        propTypeBadge.textContent = '—';
        inspMultiHint.classList.add('hidden');
        updateGizmo();
        return;
      }

      propTypeBadge.textContent = t(comp.type);
      inspMultiHint.classList.toggle('hidden', selection.length < 2);
      inspMultiHint.textContent = t('{n} selecionados · estilo vale para todos, posição só para o principal', { n: selection.length });

      INSPECTOR_BINDINGS.forEach(b => writeControl(b, comp[b.key]));
      updateAspectLabel(comp);

      // Seções que só fazem sentido para um tipo ou configuração
      document.getElementById('sectionBar').classList.toggle('hidden', comp.type !== 'Barra');
      document.getElementById('sectionRing').classList.toggle('hidden', comp.type !== 'Anel');
      document.getElementById('sectionShape').classList.toggle('hidden', comp.type !== 'Forma');
      document.getElementById('propShapePreset').value = matchShapePreset(comp);
      document.getElementById('shapeSidesRow').classList.toggle('hidden', !(comp.shapeKind === 'star' || comp.shapeKind === 'polygon'));
      document.getElementById('shapeInnerRow').classList.toggle('hidden', comp.shapeKind !== 'star');
      document.getElementById('innerShadowDetails').classList.toggle('hidden', !comp.innerShadow);
      updateEffectPresetDisplay(comp);
      const isGradient = comp.fillType === 'gradient';
      document.getElementById('gradientDirRow').classList.toggle('hidden', !isGradient);
      gradientColorContainer.classList.toggle('hidden', !isGradient);
      document.getElementById('bevelRow').classList.toggle('hidden', !(comp.borderStyle === 'bevel' || comp.borderStyle === 'inset'));
      document.getElementById('shadowDetails').classList.toggle('hidden', !comp.dropShadow);

      iconSettingsPanel.classList.toggle('hidden', !comp.icon);
      btnRemoveIcon.classList.toggle('hidden', !comp.icon);
      iconUploadBtnText.textContent = comp.icon ? t('Trocar Imagem') : t('Escolher Imagem (PNG/JPG)');

      uniformRadiusContainer.classList.toggle('hidden', comp.independentRadius);
      independentRadiusContainer.classList.toggle('hidden', !comp.independentRadius);
      btnToggleIndependentCorners.textContent = comp.independentRadius ? t('Canto Único') : t('Cantos Livres');

      document.querySelectorAll('#textAlignGroup .align-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === comp.textAlign);
      });
      document.querySelectorAll('#textVAlignGroup .align-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.valign === comp.textVAlign);
      });

      updateGizmo();
    }

    // Helper robusto para carregar imagem no componente
    function loadIconIntoComponent(comp, file) {
      if (!comp) {
        showToast(t('Selecione um item na tela antes de adicionar a imagem!'));
        return;
      }
      if (!file || (!file.type.startsWith('image/') && !file.name.match(/\.(png|jpe?g|webp|svg)$/i))) {
        showToast(t('Formato inválido! Envie PNG, JPG, WebP ou SVG.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          comp.icon = img;
          comp.iconSrc = ev.target.result;
          syncInspector();
          renderLayersList();
          renderScene();
          triggerAutoSave();
          showToast(t('Imagem carregada em "{name}"!', { name: comp.name }));
        };
        img.onerror = () => {
          showToast(t('Erro ao processar imagem.'));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    // ===== Inspector: seções recolhíveis e busca de propriedades (R5) =====
    // As seções são os filhos diretos de #inspectorContent (menos barra de busca, alinhar e divisórias);
    // o primeiro filho de cada seção é o título. Nada no HTML das seções precisa mudar.
    const INSPECTOR_UI_KEY = 'game_dev_ui_studio_inspector_ui';
    const inspSearch = document.getElementById('inspSearch');
    const inspSearchClear = document.getElementById('inspSearchClear');
    const inspSearchEmpty = document.getElementById('inspSearchEmpty');
    const inspToggleAll = document.getElementById('inspToggleAll');
    let inspSections = [];

    // Sem acento e minúsculo: "sombra" acha "Sombra", "opacidade" acha "Opacidade".
    const foldText = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // Texto pesquisável de um trecho: o que está na tela (idioma atual), as chaves PT originais,
    // tooltips, opções dos selects e o nome da prop de script (ex.: "shadowBlur", "radius").
    function searchableText(el) {
      const parts = [el.textContent];
      el.querySelectorAll('[data-i18n-key]').forEach(n => parts.push(n.dataset.i18nKey));
      el.querySelectorAll('[title]').forEach(n => parts.push(n.getAttribute('title'), n.dataset.i18nTitleKey));
      if (el.getAttribute && el.getAttribute('title')) parts.push(el.getAttribute('title'), el.dataset.i18nTitleKey);
      el.querySelectorAll('[id]').forEach(n => {
        const b = INSPECTOR_BINDINGS.find(x => x.id === n.id);
        if (b) parts.push(b.key);
      });
      return foldText(parts.join(' '));
    }

    function loadInspectorUiPrefs() {
      try { return JSON.parse(localStorage.getItem(INSPECTOR_UI_KEY) || '{}'); } catch (err) { return {}; }
    }

    function saveInspectorUiPrefs() {
      try {
        const collapsed = inspSections.filter(s => s.el.classList.contains('insp-collapsed')).map(s => s.key);
        localStorage.setItem(INSPECTOR_UI_KEY, JSON.stringify({ collapsed }));
      } catch (err) {}
    }

    function setupInspectorSections() {
      const skip = new Set(['inspSearchBar', 'inspSearchEmpty', 'alignBar']);
      const prefs = loadInspectorUiPrefs();
      const collapsed = new Set(Array.isArray(prefs.collapsed) ? prefs.collapsed : []);
      inspSections = [...inspectorContent.children]
        .filter(el => el.tagName === 'DIV' && !skip.has(el.id) && !el.classList.contains('h-[1px]') && el.firstElementChild)
        .map(el => {
          const header = el.firstElementChild;
          const title = header.querySelector('[data-i18n]') || header;
          // Chave estável: id da seção ou o título em PT (roda antes da primeira tradução).
          const key = el.id || title.dataset.i18nKey || title.textContent.trim();
          header.classList.add('insp-section-header');
          if (collapsed.has(key)) el.classList.add('insp-collapsed');
          header.addEventListener('click', (e) => {
            // Controles no título (ex.: select de forma, checkbox "Mostrar") continuam funcionando.
            if (e.target.closest('input, select, button, textarea, label')) return;
            el.classList.toggle('insp-collapsed');
            saveInspectorUiPrefs();
          });
          return { el, header, key };
        });
    }

    function filterInspector(query) {
      const q = foldText(query.trim());
      inspSearchClear.classList.toggle('hidden', !q);
      inspectorContent.classList.toggle('insp-searching', !!q);
      inspectorContent.querySelectorAll('.insp-search-hide').forEach(el => el.classList.remove('insp-search-hide'));
      if (!q) {
        inspSearchEmpty.classList.add('hidden');
        return;
      }
      // Divisórias e alinhar somem durante a busca; alinhar volta se a busca for sobre ele.
      [...inspectorContent.children].forEach(el => {
        if (el.classList.contains('h-[1px]')) el.classList.add('insp-search-hide');
      });
      const alignBar = document.getElementById('alignBar');
      if (!searchableText(alignBar).includes(q) && !foldText('alinhar align distribuir distribute').includes(q)) alignBar.classList.add('insp-search-hide');

      let found = !alignBar.classList.contains('insp-search-hide');
      inspSections.forEach(({ el, header }) => {
        const typeHidden = el.classList.contains('hidden');
        if (searchableText(header).includes(q)) {
          if (!typeHidden) found = true;
          return; // título casou: mostra a seção inteira
        }
        const rows = [...el.children].slice(1);
        const hits = rows.filter(r => searchableText(r).includes(q));
        if (hits.length === 0) {
          el.classList.add('insp-search-hide');
          return;
        }
        rows.forEach(r => { if (!hits.includes(r)) r.classList.add('insp-search-hide'); });
        if (!typeHidden) found = true;
      });
      inspSearchEmpty.classList.toggle('hidden', found);
    }

    inspSearch.addEventListener('input', () => filterInspector(inspSearch.value));
    inspSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        inspSearch.value = '';
        filterInspector('');
        inspSearch.blur();
      }
    });
    inspSearchClear.addEventListener('click', () => {
      inspSearch.value = '';
      filterInspector('');
      inspSearch.focus();
    });
    // Recolhe tudo se houver alguma aberta; senão abre tudo.
    inspToggleAll.addEventListener('click', () => {
      const anyOpen = inspSections.some(s => !s.el.classList.contains('insp-collapsed'));
      inspSections.forEach(s => s.el.classList.toggle('insp-collapsed', anyOpen));
      saveInspectorUiPrefs();
    });

    function setupInspectorListeners() {
      INSPECTOR_BINDINGS.forEach(b => {
        const el = document.getElementById(b.id);
        if (!el) return;
        const eventName = (b.kind === 'select' || b.kind === 'selectInt' || b.kind === 'check') ? 'change' : 'input';
        el.addEventListener(eventName, () => {
          const primary = getSelectedComponent();
          if (!primary) return;
          const value = readControl(b, el);
          if (value === undefined) return;

          const targets = b.scope === 'primary' ? [primary] : getSelectedComponents();
          targets.forEach(c => { c[b.key] = value; });
          // Digitar no campo Texto de um Anel desliga "Mostrar valor no centro" (o texto digitado vence).
          if (b.key === 'text' && releaseRingLabel(targets)) {
            writeControl(INSPECTOR_BINDINGS.find(o => o.key === 'ringShowValue'), false);
          }

          // Mantém os controles gêmeos (slider ↔ número, cor ↔ hex) mostrando o mesmo valor.
          INSPECTOR_BINDINGS.forEach(other => {
            if (other !== b && other.key === b.key) writeControl(other, value);
          });
          if (b.label) writeControl(b, value);
          if (b.key === 'w' || b.key === 'h') updateAspectLabel(primary);

          if (b.after === 'layers') renderLayersList();
          if (b.after === 'inspector') syncInspector();
          if (EFFECT_KEYS.has(b.key)) updateEffectPresetDisplay(primary);
          renderScene();
        });
      });

      const forSelection = (fn) => {
        const comps = getSelectedComponents();
        if (comps.length === 0) return;
        comps.forEach(fn);
        syncInspector();
        renderScene();
      };

      btnSquareSnap.addEventListener('click', () => {
        const comp = getSelectedComponent();
        if (!comp) return;
        const avg = Math.round((comp.w + comp.h) / 2);
        comp.w = avg;
        comp.h = avg;
        syncInspector();
        renderScene();
      });

      btnToggleIndependentCorners.addEventListener('click', () => {
        const primary = getSelectedComponent();
        if (!primary) return;
        const next = !primary.independentRadius;
        forSelection(c => {
          c.independentRadius = next;
          if (next) {
            c.radiusTL = c.radiusTR = c.radiusBR = c.radiusBL = c.radius;
          }
        });
      });

      btnFillOp0.addEventListener('click', () => forSelection(c => { c.fillOpacity = 0; }));
      btnFillOp50.addEventListener('click', () => forSelection(c => { c.fillOpacity = 0.5; }));
      btnFillOp100.addEventListener('click', () => forSelection(c => { c.fillOpacity = 1; }));

      document.querySelectorAll('#textAlignGroup .align-btn').forEach(btn => {
        btn.addEventListener('click', () => forSelection(c => { c.textAlign = btn.dataset.align; }));
      });
      document.querySelectorAll('#textVAlignGroup .align-btn').forEach(btn => {
        btn.addEventListener('click', () => forSelection(c => { c.textVAlign = btn.dataset.valign; }));
      });

      document.getElementById('propEffectPreset').addEventListener('change', (e) => {
        const preset = EFFECT_PRESETS[e.target.value];
        if (preset) forSelection(c => Object.assign(c, preset));
      });

      document.getElementById('propShapePreset').addEventListener('change', (e) => {
        const preset = SHAPE_PRESETS[e.target.value];
        if (preset) forSelection(c => { if (c.type === 'Forma') Object.assign(c, preset); });
      });

      document.getElementById('btnResetRotation').addEventListener('click', () => forSelection(c => { c.rotation = 0; }));

      document.querySelectorAll('#alignBar .align-op').forEach(btn => {
        btn.addEventListener('click', () => {
          const comps = getSelectedComponents();
          if (comps.length === 0) return;
          const op = btn.dataset.op;
          if (op === 'distX' || op === 'distY') {
            if (comps.length < 3) {
              showToast('Selecione 3 ou mais itens para distribuir.');
              return;
            }
            Studio.distribute(comps, op === 'distX' ? 'x' : 'y');
          } else {
            Studio.align(comps, op);
          }
        });
      });

      // Clique direto no botão/área de upload
      slotIconDropZone.addEventListener('click', () => {
        if (!getSelectedComponent()) {
          showToast(t('Selecione um elemento antes de adicionar imagem!'));
          return;
        }
        inputSlotIcon.value = '';
        inputSlotIcon.click();
      });

      inputSlotIcon.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        const comp = getSelectedComponent();
        if (!file || !comp) return;
        loadIconIntoComponent(comp, file);
        inputSlotIcon.value = '';
      });

      ['dragenter', 'dragover'].forEach(name => {
        slotIconDropZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          slotIconDropZone.classList.add('border-figma-accent', 'bg-zinc-700/60');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        slotIconDropZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          slotIconDropZone.classList.remove('border-figma-accent', 'bg-zinc-700/60');
        });
      });

      slotIconDropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadIconIntoComponent(getSelectedComponent(), e.dataTransfer.files[0]);
        }
      });

      btnRemoveIcon.addEventListener('click', () => {
        forSelection(c => { c.icon = null; c.iconSrc = null; });
        renderLayersList();
        showToast(t('Imagem removida'));
      });

      propShowGuides.addEventListener('change', updateGizmo);

      layerSearch.addEventListener('input', () => {
        layerSearchQuery = layerSearch.value;
        renderLayersList();
      });
    }

