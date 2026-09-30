    function updateCanvasWorldTransform() {
      canvasWorld.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
      // Guias, grid e linhas de snap usam 1/zoom para ficar com 1px na tela em qualquer zoom.
      canvasWorld.style.setProperty('--inv-zoom', String(1 / state.zoom));
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
      drawRulers();
    }

    function setZoom(val) {
      state.zoom = Math.min(3.0, Math.max(0.2, val));
      updateCanvasWorldTransform();
    }

    function fitCanvasToViewport() {
      const vRect = viewportContainer.getBoundingClientRect();
      const pad = 40;
      const scaleX = (vRect.width - pad * 2) / state.canvasWidth;
      const scaleY = (vRect.height - pad * 2) / state.canvasHeight;
      state.zoom = Math.min(scaleX, scaleY, 1.2);
      state.panX = 0;
      state.panY = 0;
      updateCanvasWorldTransform();
    }

    function applyCanvasResolution(resString) {
      const [w, h] = resString.split('x').map(Number);
      state.canvasWidth = w;
      state.canvasHeight = h;

      mainCanvas.width = w;
      mainCanvas.height = h;
      canvasWorld.style.width = `${w}px`;
      canvasWorld.style.height = `${h}px`;
      snapLinesLayer.setAttribute('width', w);
      snapLinesLayer.setAttribute('height', h);
      snapLinesLayer.setAttribute('viewBox', `0 0 ${w} ${h}`);

      resBadgeText.textContent = `${w} × ${h} px`;
      setResSelectValue(w, h);
      refreshExportScaleOptions();
      renderSafeArea();
      renderScene();
    }

    // ---- Resoluções por aparelho (R7) ----
    // Desktop em paisagem; celular em retrato; tablet em paisagem. O botão de girar troca largura e
    // altura de qualquer uma (os itens não se movem). Resolução fora da lista (projeto aberto, cena
    // girada) entra no seletor como "Personalizada".
    const RESOLUTION_PRESETS = [
      { group: 'Desktop / Console', items: [
        ['1280x720', '1280×720'], ['1920x1080', '1920×1080'], ['2560x1440', '2560×1440'], ['3840x2160', '3840×2160']] },
      { group: 'Celular (retrato)', items: [
        ['1080x1920', '1080×1920 9:16'], ['1080x2400', '1080×2400 Android'], ['1170x2532', '1170×2532 iPhone']] },
      { group: 'Tablet (paisagem)', items: [
        ['2048x1536', '2048×1536 iPad'], ['2732x2048', '2732×2048 iPad Pro']] }
    ];

    // Área segura de referência, em px da própria resolução (top, right, bottom, left).
    // iPhone (13/14, @3x) e iPad Pro (@2x): insets do Apple HIG. Android 20:9: status bar com câmera
    // furada + barra de gestos, valores típicos (variam por modelo). 9:16 sem notch: só a status bar.
    // 1920×1080 em paisagem não tem área: é também a resolução de desktop.
    const SAFE_AREAS = {
      '1170x2532': { top: 141, right: 0, bottom: 102, left: 0 },
      '2532x1170': { top: 0, right: 141, bottom: 63, left: 141 },
      '1080x2400': { top: 96, right: 0, bottom: 48, left: 0 },
      '2400x1080': { top: 0, right: 96, bottom: 48, left: 96 },
      '1080x1920': { top: 72, right: 0, bottom: 0, left: 0 },
      '2048x1536': { top: 40, right: 0, bottom: 0, left: 0 },
      '1536x2048': { top: 40, right: 0, bottom: 0, left: 0 },
      '2732x2048': { top: 48, right: 0, bottom: 40, left: 0 },
      '2048x2732': { top: 48, right: 0, bottom: 40, left: 0 }
    };
    const safeAreaOverlay = document.getElementById('safeAreaOverlay');
    const safeAreaRect = document.getElementById('safeAreaRect');
    const btnToggleSafeArea = document.getElementById('btnToggleSafeArea');
    const btnRotateRes = document.getElementById('btnRotateRes');
    state.showSafeArea = true;

    function currentSafeArea() {
      return SAFE_AREAS[`${state.canvasWidth}x${state.canvasHeight}`] || null;
    }

    function buildResolutionOptions() {
      const current = `${state.canvasWidth}x${state.canvasHeight}`;
      canvasResSelect.innerHTML = '';
      RESOLUTION_PRESETS.forEach(({ group, items }) => {
        const og = document.createElement('optgroup');
        og.label = t(group);
        items.forEach(([value, label]) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          og.appendChild(opt);
        });
        canvasResSelect.appendChild(og);
      });
      const [w, h] = current.split('x').map(Number);
      setResSelectValue(w, h);
    }

    // A personalizada fica num grupo próprio: o texto da opção é só "W×H" e o seletor não alarga a barra.
    function setResSelectValue(w, h) {
      const value = `${w}x${h}`;
      canvasResSelect.querySelectorAll('optgroup[data-custom]').forEach(g => { if (g.firstElementChild.value !== value) g.remove(); });
      if (![...canvasResSelect.options].some(o => o.value === value)) {
        const og = document.createElement('optgroup');
        og.dataset.custom = '1';
        og.label = t('Personalizada');
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = `${w}×${h}`;
        og.appendChild(opt);
        canvasResSelect.appendChild(og);
      }
      canvasResSelect.value = value;
    }

    function renderSafeArea() {
      const sa = currentSafeArea();
      btnToggleSafeArea.disabled = !sa;
      btnToggleSafeArea.classList.toggle('text-figma-accent', !!sa && state.showSafeArea);
      safeAreaOverlay.classList.toggle('hidden', !sa || !state.showSafeArea);
      if (!sa) return;
      const W = state.canvasWidth, H = state.canvasHeight;
      const place = (el, l, t, w, h) => Object.assign(el.style, { left: `${l}px`, top: `${t}px`, width: `${Math.max(0, w)}px`, height: `${Math.max(0, h)}px` });
      const bands = Object.fromEntries([...safeAreaOverlay.querySelectorAll('.safe-band')].map(el => [el.dataset.side, el]));
      place(bands.top, 0, 0, W, sa.top);
      place(bands.bottom, 0, H - sa.bottom, W, sa.bottom);
      place(bands.left, 0, sa.top, sa.left, H - sa.top - sa.bottom);
      place(bands.right, W - sa.right, sa.top, sa.right, H - sa.top - sa.bottom);
      place(safeAreaRect, sa.left, sa.top, W - sa.left - sa.right, H - sa.top - sa.bottom);
    }

    document.getElementById('btnAutoAnchor').addEventListener('click', () => {
      const sel = getSelectedComponents();
      if (!sel.length) return;
      sel.forEach(autoAnchor);
      syncInspector();
      renderScene();
      showToast(t('Âncora automática em {n} item(ns).', { n: sel.length }));
    });

    // Troca pelo usuário (seletor ou girar): os itens com âncora se reposicionam (R8). Abrir projeto e
    // desfazer chamam applyCanvasResolution direto e não passam por aqui.
    function changeResolutionByUser(res) {
      const oldW = state.canvasWidth, oldH = state.canvasHeight;
      applyCanvasResolution(res);
      const moved = relayoutByAnchors(oldW, oldH, state.canvasWidth, state.canvasHeight);
      if (moved) {
        syncInspector();
        renderScene();
      }
      fitCanvasToViewport();
      return moved;
    }

    canvasResSelect.addEventListener('change', () => {
      const moved = changeResolutionByUser(canvasResSelect.value);
      showToast(moved
        ? t('Resolução: {res} ({n} item(ns) ajustado(s) pelas âncoras)', { res: canvasResSelect.value, n: moved })
        : t('Resolução: {res}', { res: canvasResSelect.value }));
    });

    btnRotateRes.addEventListener('click', () => {
      const moved = changeResolutionByUser(`${state.canvasHeight}x${state.canvasWidth}`);
      const res = `${state.canvasWidth}x${state.canvasHeight}`;
      showToast(moved
        ? t('Cena girada: {res} ({n} item(ns) ajustado(s) pelas âncoras)', { res, n: moved })
        : t('Cena girada: {res}', { res }));
    });

    btnToggleSafeArea.addEventListener('click', () => {
      state.showSafeArea = !state.showSafeArea;
      renderSafeArea();
      saveEditorPrefs();
    });

    // ---- Largura dos painéis laterais (R7) ----
    // Arrastar a alça ajusta; duplo clique volta ao padrão; setas movem 16 px (Shift = 64).
    // O viewport sempre fica com pelo menos MIN_VIEWPORT px. Preferência do editor, não do projeto.
    const PANEL_LIMITS = { left: { min: 200, max: 480, def: 256 }, right: { min: 260, max: 560, def: 320 } };
    const MIN_VIEWPORT = 360;
    const panels = { left: document.getElementById('leftPanel'), right: document.getElementById('rightPanel') };
    state.panelWidths = { left: PANEL_LIMITS.left.def, right: PANEL_LIMITS.right.def };

    function setPanelWidth(side, width) {
      const lim = PANEL_LIMITS[side];
      const other = side === 'left' ? 'right' : 'left';
      const room = window.innerWidth - state.panelWidths[other] - MIN_VIEWPORT;
      const w = Math.round(Math.max(lim.min, Math.min(lim.max, room, width)));
      state.panelWidths[side] = w;
      panels[side].style.width = `${w}px`;
      return w;
    }

    document.querySelectorAll('.panel-resizer').forEach(handle => {
      const side = handle.dataset.panel;
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const startX = e.clientX, startW = state.panelWidths[side];
        handle.setPointerCapture(e.pointerId);
        handle.classList.add('dragging');
        document.body.classList.add('resizing-panels');
        const move = (ev) => setPanelWidth(side, startW + (side === 'left' ? ev.clientX - startX : startX - ev.clientX));
        const up = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          handle.classList.remove('dragging');
          document.body.classList.remove('resizing-panels');
          saveEditorPrefs();
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
      handle.addEventListener('dblclick', () => {
        setPanelWidth(side, PANEL_LIMITS[side].def);
        saveEditorPrefs();
      });
      handle.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation(); // não move a seleção na cena
        const step = (e.shiftKey ? 64 : 16) * (e.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1);
        setPanelWidth(side, state.panelWidths[side] + step);
        saveEditorPrefs();
      });
    });

    // Janela menor: painéis encolhem para o viewport não sumir.
    window.addEventListener('resize', () => {
      setPanelWidth('right', state.panelWidths.right);
      setPanelWidth('left', state.panelWidths.left);
    });
    // Réguas acompanham qualquer mudança de tamanho do viewport (painéis ou janela).
    if (window.ResizeObserver) new ResizeObserver(() => drawRulers()).observe(viewportContainer);

    // ===== Grid, snap e réguas (preferências do editor: ficam só neste navegador) =====
    const EDITOR_PREFS_KEY = 'game_dev_ui_studio_editor_prefs';
    const GRID_SIZES = [4, 8, 16, 32, 64];

    function saveEditorPrefs() {
      try {
        localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify({
          snapToGrid: state.snapToGrid, gridSize: state.gridSize, showGrid: state.showGrid, showRulers: state.showRulers,
          exportHeight: state.exportHeight, exportFormat: state.exportFormat, showSafeArea: state.showSafeArea,
          panelWidths: state.panelWidths
        }));
      } catch (err) {}
    }

    function loadEditorPrefs() {
      try {
        const prefs = JSON.parse(localStorage.getItem(EDITOR_PREFS_KEY) || '{}');
        if (typeof prefs.snapToGrid === 'boolean') state.snapToGrid = prefs.snapToGrid;
        if (GRID_SIZES.includes(prefs.gridSize)) state.gridSize = prefs.gridSize;
        if (typeof prefs.showGrid === 'boolean') state.showGrid = prefs.showGrid;
        if (typeof prefs.showRulers === 'boolean') state.showRulers = prefs.showRulers;
        if (EXPORT_TARGET_HEIGHTS.includes(prefs.exportHeight)) state.exportHeight = prefs.exportHeight;
        if (prefs.exportFormat === 'svg' || prefs.exportFormat === 'png') state.exportFormat = prefs.exportFormat;
        if (typeof prefs.showSafeArea === 'boolean') state.showSafeArea = prefs.showSafeArea;
        if (prefs.panelWidths) {
          ['left', 'right'].forEach(side => {
            const w = Number(prefs.panelWidths[side]);
            if (Number.isFinite(w)) state.panelWidths[side] = w;
          });
        }
      } catch (err) {}
      setPanelWidth('left', state.panelWidths.left);
      setPanelWidth('right', state.panelWidths.right);
      renderSafeArea();
      applyEditorPrefsUI();
      refreshExportScaleOptions();
      exportFormatSelect.value = state.exportFormat;
    }

    // Formato de Item e Cena (R5). O Batch ZIP sempre leva PNG + a pasta SVG/.
    state.exportFormat = 'png';
    exportFormatSelect.addEventListener('change', () => {
      state.exportFormat = exportFormatSelect.value === 'svg' ? 'svg' : 'png';
      saveEditorPrefs();
    });

    // ---- Resolução do export (R5) ----
    // A saída descreve a UI na resolução escolhida: escala = lado menor alvo / lado menor da cena
    // (em paisagem é a altura; em retrato, a largura: 1080×1920 em "4K" sai 2160×3840).
    // Só ampliações: numa cena 1440p, "2K" é a nativa e 1080p não aparece.
    const EXPORT_TARGET_HEIGHTS = [1080, 1440, 2160];
    const EXPORT_TARGET_LABELS = { 1080: '1080p', 1440: '2K', 2160: '4K' };
    state.exportHeight = 0; // 0 = nativa (nome antigo mantido nas preferências: é o lado menor alvo)

    function exportScale() {
      const target = state.exportHeight, short = Math.min(state.canvasWidth, state.canvasHeight);
      return target && target > short ? target / short : 1;
    }

    function refreshExportScaleOptions() {
      const w = state.canvasWidth, h = state.canvasHeight, short = Math.min(w, h);
      const options = [{ value: 0, label: `${t('Nativo')} ${w}×${h}` }];
      EXPORT_TARGET_HEIGHTS.filter(th => th > short).forEach(th => {
        options.push({ value: th, label: `${EXPORT_TARGET_LABELS[th]} ${Math.round(w * th / short)}×${Math.round(h * th / short)}` });
      });
      if (!options.some(o => o.value === state.exportHeight)) state.exportHeight = 0;
      exportScaleSelect.innerHTML = '';
      options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = String(o.value);
        opt.textContent = o.label;
        exportScaleSelect.appendChild(opt);
      });
      exportScaleSelect.value = String(state.exportHeight);
    }

    exportScaleSelect.addEventListener('change', () => {
      state.exportHeight = Number(exportScaleSelect.value) || 0;
      saveEditorPrefs();
    });

    function applyEditorPrefsUI() {
      chkSnapGrid.checked = state.snapToGrid;
      gridSizeSelect.value = String(state.gridSize);
      gridOverlay.classList.toggle('hidden', !state.showGrid);
      gridOverlay.style.backgroundSize = `${state.gridSize}px ${state.gridSize}px`;
      btnToggleGrid.classList.toggle('text-figma-accent', state.showGrid);
      btnToggleRulers.classList.toggle('text-figma-accent', state.showRulers);
      [rulerTop, rulerLeft, rulerCorner, guidesLayer].forEach(el => el.classList.toggle('hidden', !state.showRulers));
      drawRulers();
    }

    function toggleRulers() {
      state.showRulers = !state.showRulers;
      applyEditorPrefsUI();
      saveEditorPrefs();
    }

    chkSnapGrid.addEventListener('change', () => {
      state.snapToGrid = chkSnapGrid.checked;
      saveEditorPrefs();
      showToast(state.snapToGrid ? t('Snap {n}px ativado', { n: state.gridSize }) : 'Snap desativado');
    });
    gridSizeSelect.addEventListener('change', () => {
      state.gridSize = parseInt(gridSizeSelect.value, 10) || 16;
      applyEditorPrefsUI();
      saveEditorPrefs();
    });
    btnToggleGrid.addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      applyEditorPrefsUI();
      saveEditorPrefs();
    });
    btnToggleRulers.addEventListener('click', toggleRulers);

    // ===== Fundo da cena (vai no export da cena, nunca no PNG de um item) =====
    function syncSceneBackgroundUI() {
      const bg = state.sceneBackground;
      sceneBgMode.value = bg.mode;
      sceneBgColor.value = bg.color;
      sceneBgColor.classList.toggle('hidden', bg.mode !== 'color');
      mainCanvas.classList.toggle('checkerboard', bg.mode !== 'color');
    }

    sceneBgMode.addEventListener('change', () => {
      state.sceneBackground = { ...state.sceneBackground, mode: sceneBgMode.value };
      syncSceneBackgroundUI();
      renderScene();
    });
    sceneBgColor.addEventListener('input', () => {
      state.sceneBackground = { ...state.sceneBackground, color: sceneBgColor.value };
      renderScene();
    });

    // ===== Réguas =====
    const RULER_STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

    function drawRulers() {
      if (!state.showRulers) return;
      const world = mainCanvas.getBoundingClientRect();
      if (!world.width) return;
      const ppu = world.width / state.canvasWidth;
      const sel = selectionBounds();
      drawRuler(rulerTop, true, world.left, ppu, sel ? [sel.x, sel.x + sel.w] : null);
      drawRuler(rulerLeft, false, world.top, ppu, sel ? [sel.y, sel.y + sel.h] : null);
    }

    function drawRuler(cv, horizontal, sceneOrigin, ppu, selRange) {
      const rect = cv.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const len = horizontal ? rect.width : rect.height;
      const thick = horizontal ? rect.height : rect.width;
      // Onde o pixel 0 da cena cai dentro da régua.
      const start = sceneOrigin - (horizontal ? rect.left : rect.top);

      c.fillStyle = '#16161a';
      c.fillRect(0, 0, rect.width, rect.height);

      if (selRange) {
        const a = start + selRange[0] * ppu, b = start + selRange[1] * ppu;
        c.fillStyle = 'rgba(13, 153, 255, 0.28)';
        if (horizontal) c.fillRect(a, 0, b - a, thick); else c.fillRect(0, a, thick, b - a);
      }

      // Passo das marcações se adapta ao zoom: números sempre legíveis (>= 56px entre eles).
      const major = RULER_STEPS.find(s => s * ppu >= 56) || RULER_STEPS.at(-1);
      const minor = major / 5;
      const first = Math.floor(-start / ppu / minor) * minor;
      const last = (len - start) / ppu;

      c.strokeStyle = '#3f3f4e';
      c.fillStyle = '#8b8b99';
      c.font = '9px "JetBrains Mono", monospace';
      c.lineWidth = 1;
      c.beginPath();
      for (let u = first; u <= last; u += minor) {
        const p = Math.round(start + u * ppu) + 0.5;
        const isMajor = Math.abs(u / major - Math.round(u / major)) < 1e-6;
        const tick = isMajor ? thick * 0.75 : thick * 0.3;
        if (horizontal) { c.moveTo(p, thick); c.lineTo(p, thick - tick); }
        else { c.moveTo(thick, p); c.lineTo(thick - tick, p); }
        if (isMajor) {
          const label = String(Math.round(u));
          if (horizontal) c.fillText(label, p + 3, 9);
          else { c.save(); c.translate(9, p - 3); c.rotate(-Math.PI / 2); c.fillText(label, 0, 0); c.restore(); }
        }
      }
      c.stroke();
      c.fillStyle = '#2e2e38';
      if (horizontal) c.fillRect(0, thick - 1, len, 1); else c.fillRect(thick - 1, 0, 1, len);
    }

    window.addEventListener('resize', drawRulers);

    // ===== Guias (arrastadas das réguas; salvas no projeto e no histórico) =====
    let guideDrag = null;

    function renderGuides() {
      guidesLayer.textContent = '';
      state.guides.forEach(guide => {
        const el = document.createElement('div');
        el.className = `ruler-guide ${guide.axis}`;
        if (guide.axis === 'v') el.style.left = `${guide.pos}px`; else el.style.top = `${guide.pos}px`;
        el.title = `${guide.pos}px`;
        el.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          startGuideDrag(guide, e);
        });
        guidesLayer.appendChild(el);
      });
    }

    function startGuideDrag(guide, e) {
      guideDrag = { guide };
      updateGuideDrag(e);
    }

    // Guia horizontal volta para a régua do topo; vertical, para a da esquerda.
    function isOverRuler(e, axis) {
      const r = (axis === 'h' ? rulerTop : rulerLeft).getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }

    function updateGuideDrag(e) {
      const { guide } = guideDrag;
      const p = getCanvasCoords(e.clientX, e.clientY);
      guide.pos = Math.round(guide.axis === 'v' ? p.x : p.y);
      renderGuides();
      const vp = viewportContainer.getBoundingClientRect();
      guideDragLabel.textContent = `${guide.pos}px`;
      guideDragLabel.style.left = `${e.clientX - vp.left + 12}px`;
      guideDragLabel.style.top = `${e.clientY - vp.top + 12}px`;
      guideDragLabel.classList.remove('hidden');
    }

    function finishGuideDrag(e) {
      const { guide } = guideDrag;
      guideDrag = null;
      guideDragLabel.classList.add('hidden');
      if (isOverRuler(e, guide.axis)) state.guides = state.guides.filter(g => g !== guide);
      renderGuides();
      renderScene();
    }

    [rulerTop, rulerLeft].forEach(cv => {
      cv.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const axis = cv === rulerTop ? 'h' : 'v';
        const p = getCanvasCoords(e.clientX, e.clientY);
        const guide = { id: state.nextGuideId++, axis, pos: Math.round(axis === 'v' ? p.x : p.y) };
        state.guides.push(guide);
        startGuideDrag(guide, e);
      });
    });

    rulerCorner.addEventListener('mousedown', (e) => e.stopPropagation());
    rulerCorner.addEventListener('click', () => {
      if (state.guides.length === 0) return;
      if (!confirm(t('Remover todas as {n} guias?', { n: state.guides.length }))) return;
      state.guides = [];
      renderGuides();
      renderScene();
      showToast('Guias removidas.');
    });

    // ===== Smart guides / snap =====
    const SNAP_SCREEN_PX = 6;

    // Alvos de snap: bordas e centro do canvas, dos itens visíveis (menos os que estão sendo movidos) e das guias.
    function snapTargets(excludeIds) {
      const xs = [0, state.canvasWidth / 2, state.canvasWidth];
      const ys = [0, state.canvasHeight / 2, state.canvasHeight];
      state.components.forEach(c => {
        if (!c.visible || excludeIds.has(c.id)) return;
        const b = getAABB(c);
        xs.push(b.x, b.x + b.w / 2, b.x + b.w);
        ys.push(b.y, b.y + b.h / 2, b.y + b.h);
      });
      if (state.showRulers) state.guides.forEach(g => (g.axis === 'v' ? xs : ys).push(g.pos));
      // Bordas da área segura (mobile) também atraem, quando ela está visível.
      const sa = state.showSafeArea ? currentSafeArea() : null;
      if (sa) {
        xs.push(sa.left, state.canvasWidth - sa.right);
        ys.push(sa.top, state.canvasHeight - sa.bottom);
      }
      return { xs, ys };
    }

    function nearestSnap(values, targets, threshold) {
      let best = null;
      values.forEach(v => targets.forEach(target => {
        const delta = target - v;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target };
      }));
      return best;
    }

    function showSnapLines(vLines, hLines) {
      if (vLines.length === 0 && hLines.length === 0) {
        if (snapLinesLayer.childElementCount) snapLinesLayer.textContent = '';
        return;
      }
      const W = state.canvasWidth, H = state.canvasHeight;
      snapLinesLayer.innerHTML =
        [...new Set(vLines)].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`).join('') +
        [...new Set(hLines)].map(y => `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`).join('');
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        state.spacePressed = true;
        viewportContainer.classList.add('cursor-grab-active');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        state.spacePressed = false;
        viewportContainer.classList.remove('cursor-grab-active', 'cursor-grabbing-active');
      }
    });

