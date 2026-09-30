    // ---- Copiar / recortar / colar (Ctrl+C / Ctrl+X / Ctrl+V) ----
    // O pacote vai como texto JSON no clipboard do sistema, então cola em outra aba ou outro projeto.
    // Usa os eventos copy/cut/paste do documento (não pedem permissão ao navegador, ao contrário de
    // navigator.clipboard.readText). clipboardMemory é a reserva quando o evento não traz dados e para a API Studio.
    const CLIPBOARD_FORMAT = 'devui-components';
    let clipboardMemory = null;
    let lastPasteCopyId = null;
    let pasteCount = 0;

    function editorClipboardBlocked(e) {
      if (!scriptWorkbenchModal.classList.contains('hidden')) return true;
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return true;
      // Texto selecionado na página (ex.: nome na lista de camadas): deixa o navegador copiar o texto.
      const sel = window.getSelection && window.getSelection();
      return !!(sel && !sel.isCollapsed && sel.toString());
    }

    function buildClipboardPayload(comps) {
      const ids = new Set(comps.map(c => c.id));
      const ordered = state.components.filter(c => ids.has(c.id)); // ordem das camadas
      if (ordered.length === 0) return null;
      const groupIds = new Set(ordered.map(c => c.groupId).filter(Boolean));
      return {
        format: CLIPBOARD_FORMAT,
        version: 1,
        copyId: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        components: ordered.map(({ icon, ...rest }) => JSON.parse(JSON.stringify(rest))),
        groups: state.groups.filter(g => groupIds.has(g.id)).map(g => ({ id: g.id, name: g.name, visible: g.visible !== false }))
      };
    }

    function parseClipboardPayload(text) {
      if (!text || text[0] !== '{') return null;
      try {
        const data = JSON.parse(text);
        return data && data.format === CLIPBOARD_FORMAT && Array.isArray(data.components) ? data : null;
      } catch {
        return null;
      }
    }

    function copySelection(cut = false) {
      const payload = buildClipboardPayload(getSelectedComponents());
      if (!payload) return null;
      clipboardMemory = payload;
      if (cut) {
        deleteCurrentComponent();
        showToast(t('{n} elemento(s) recortado(s)!', { n: payload.components.length }));
      } else {
        showToast(t('{n} elemento(s) copiado(s)!', { n: payload.components.length }));
      }
      return payload;
    }

    // Cola no topo da pilha, com ids e grupos novos. Colar o mesmo pacote de novo desloca mais 16 px
    // a cada vez, para as cópias não ficarem exatamente em cima umas das outras.
    async function pasteComponents(payload) {
      const validTypes = new Set(Object.values(TYPE_ALIASES));
      const sources = payload.components.filter(c => c && validTypes.has(c.type));
      if (sources.length === 0) return [];

      pasteCount = payload.copyId && payload.copyId === lastPasteCopyId ? pasteCount + 1 : 1;
      lastPasteCopyId = payload.copyId;
      const pasted = await insertComponents(sources, payload.groups, 16 * pasteCount);
      showToast(t('{n} elemento(s) colado(s)!', { n: pasted.length }));
      return pasted;
    }

    // Base do colar e do "Importar para a cena": ids e grupos novos, no topo da pilha, já selecionados.
    async function insertComponents(sources, groups, offset = 0) {
      const groupMap = new Map();
      (groups || []).forEach(g => {
        if (!sources.some(c => c.groupId === g.id)) return;
        const id = state.nextGroupId++;
        state.groups.push({ id, name: String(g.name || `${t('Grupo')} ${id}`), visible: g.visible !== false, collapsed: false });
        groupMap.set(g.id, id);
      });

      const pasted = await Promise.all(sources.map(src => {
        const comp = normalizeComponent({ ...src });
        comp.id = state.nextId++;
        comp.x = Math.round((Number(comp.x) || 0) + offset);
        comp.y = Math.round((Number(comp.y) || 0) + offset);
        comp.w = Math.max(8, Number(comp.w) || 8);
        comp.h = Math.max(8, Number(comp.h) || 8);
        comp.groupId = groupMap.get(src.groupId) ?? null;
        comp.icon = null;
        if (!comp.iconSrc) return comp;
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { comp.icon = img; resolve(comp); };
          img.onerror = () => { comp.iconSrc = null; resolve(comp); };
          img.src = comp.iconSrc;
        });
      }));

      state.components.push(...pasted);
      state.selectedIds = pasted.map(c => c.id);
      state.selectedId = state.selectedIds[state.selectedIds.length - 1];
      renderLayersList();
      syncInspector();
      renderScene();
      triggerAutoSave();
      return pasted;
    }

    // ---- Importar layout para a cena (R7) ----
    // "Abrir" substitui o projeto; isto SOMA os itens de outro .json aos atuais. Passa pela mesma
    // validação do Abrir (sanitizeProjectData + normalizeComponent). Layout de outra resolução é
    // escalado para caber na cena atual e centralizado; guias, fundo e rascunho dele são ignorados.
    const PIXEL_PROPS = ['x', 'y', 'w', 'h', 'radius', 'radiusTL', 'radiusTR', 'radiusBR', 'radiusBL', 'borderWidth',
      'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'innerShadowSize', 'iconOffsetX', 'iconOffsetY',
      'fontSize', 'letterSpacing', 'textStrokeWidth', 'textPadding', 'ringThickness'];

    async function importLayoutIntoScene(data) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      upgradeLegacyAssets(data);
      if (!Array.isArray(data.components)) return null;
      sanitizeProjectData(data);
      const validTypes = new Set(Object.values(TYPE_ALIASES));
      const sources = data.components.filter(c => validTypes.has(c.type)).map(c => normalizeComponent(c));
      if (sources.length === 0) return null;

      const srcW = data.canvasWidth || state.canvasWidth, srcH = data.canvasHeight || state.canvasHeight;
      const k = Math.min(state.canvasWidth / srcW, state.canvasHeight / srcH);
      const dx = (state.canvasWidth - srcW * k) / 2, dy = (state.canvasHeight - srcH * k) / 2;
      sources.forEach(c => {
        if (k !== 1) PIXEL_PROPS.forEach(p => { c[p] = Math.round(c[p] * k * 100) / 100; });
        c.x = Math.round(c.x + dx);
        c.y = Math.round(c.y + dy);
        c.w = Math.round(c.w);
        c.h = Math.round(c.h);
      });
      const added = await insertComponents(sources, data.groups, 0);
      return { added, scale: k, from: `${srcW}x${srcH}` };
    }

    async function importLayoutFile(file) {
      if (file.size > MAX_PROJECT_BYTES) {
        showToast(t('Arquivo grande demais (máx. {n} MB).', { n: MAX_PROJECT_BYTES / 1048576 }));
        return null;
      }
      try {
        const result = await importLayoutIntoScene(JSON.parse(await file.text()));
        if (!result) { showToast('Arquivo de projeto inválido!'); return null; }
        showToast(result.scale === 1
          ? t('{n} item(ns) importado(s) para a cena!', { n: result.added.length })
          : t('{n} item(ns) importado(s), escalados de {from} para caber na cena.', { n: result.added.length, from: result.from }));
        return result;
      } catch (err) {
        showToast('Erro ao carregar JSON do projeto');
        return null;
      }
    }

    document.getElementById('inputImportLayout').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) importLayoutFile(file);
    });

    // ---- Mesclar camadas (Ctrl+E, R7) ----
    // Os itens visíveis da seleção viram UMA imagem (item "só imagem", igual ao colar imagem), no lugar
    // do mais alto deles na pilha. Rasteriza em 2x (cobre o export 4K de uma cena 1080p sem aviso de
    // "borrado") com folga para sombra e brilho, e corta a transparência em volta. Um Ctrl+Z desfaz.
    const MERGE_SCALE = 2;
    const MERGE_PAD = 96;
    const MERGE_MAX_SIDE = 8192;

    async function mergeSelection(targets) {
      const picked = new Set((targets || getSelectedComponents()).map(c => c.id));
      const comps = state.components.filter(c => picked.has(c.id) && c.visible); // ordem das camadas
      if (comps.length < 2) {
        showToast('Selecione 2 ou mais itens visíveis para mesclar.');
        return null;
      }
      await ensureFontsReady(comps);

      const box = unionAABB(comps);
      const left = Math.floor(box.x) - MERGE_PAD, top = Math.floor(box.y) - MERGE_PAD;
      const spanW = Math.ceil(box.x + box.w) + MERGE_PAD - left, spanH = Math.ceil(box.y + box.h) + MERGE_PAD - top;
      const scale = Math.min(MERGE_SCALE, MERGE_MAX_SIDE / spanW, MERGE_MAX_SIDE / spanH);
      const work = document.createElement('canvas');
      work.width = Math.ceil(spanW * scale);
      work.height = Math.ceil(spanH * scale);
      const wctx = work.getContext('2d', { willReadFrequently: true });
      wctx.scale(scale, scale);
      comps.forEach(c => renderComponentToContext(wctx, c, -left, -top));

      // Corte: caixa dos pixels com alfa, arredondada para pixels inteiros da cena.
      const { data } = wctx.getImageData(0, 0, work.width, work.height);
      let minX = work.width, minY = work.height, maxX = -1, maxY = -1;
      for (let y = 0; y < work.height; y++) {
        const row = y * work.width * 4;
        for (let x = 0; x < work.width; x++) {
          if (data[row + x * 4 + 3] === 0) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) {
        work.width = work.height = 0;
        showToast('Nada visível para mesclar.');
        return null;
      }
      const sx0 = Math.floor(minX / scale), sy0 = Math.floor(minY / scale);
      const sx1 = Math.ceil((maxX + 1) / scale), sy1 = Math.ceil((maxY + 1) / scale);
      const out = document.createElement('canvas');
      out.width = Math.round((sx1 - sx0) * scale);
      out.height = Math.round((sy1 - sy0) * scale);
      out.getContext('2d').drawImage(work, Math.round(sx0 * scale), Math.round(sy0 * scale), out.width, out.height, 0, 0, out.width, out.height);
      work.width = work.height = 0;
      const src = out.toDataURL('image/png');
      out.width = out.height = 0;
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });

      const groupIds = new Set(comps.map(c => c.groupId));
      const merged = createComponentPreset('Slot');
      Object.assign(merged, BARE_BOX, {
        name: `${t('Mesclado')} ${merged.id}`, radius: 0, text: '', exportStates: false,
        x: left + sx0, y: top + sy0, w: sx1 - sx0, h: sy1 - sy0,
        iconFit: 'stretch', iconScale: 1, iconOpacity: 1, iconOffsetX: 0, iconOffsetY: 0, iconFilter: 'none',
        icon: img, iconSrc: src,
        groupId: groupIds.size === 1 ? [...groupIds][0] : null
      });

      const topmost = comps[comps.length - 1];
      const next = [];
      state.components.forEach(c => {
        if (!picked.has(c.id) || !c.visible) next.push(c);
        if (c === topmost) next.push(merged);
      });
      state.components = next;
      pruneEmptyGroups();
      state.selectedIds = [merged.id];
      state.selectedId = merged.id;
      refreshAll();
      showToast(t('{n} itens mesclados em "{name}". Ctrl+Z desfaz.', { n: comps.length, name: merged.name }));
      return merged;
    }

    document.getElementById('btnMergeLayers').addEventListener('click', () => mergeSelection());

    document.addEventListener('copy', (e) => {
      if (editorClipboardBlocked(e)) return;
      const payload = copySelection(false);
      if (!payload || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(payload));
    });

    document.addEventListener('cut', (e) => {
      if (editorClipboardBlocked(e)) return;
      if (getSelectedComponents().length === 0) return;
      const payload = copySelection(true);
      if (!payload || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(payload));
    });

    // ---- Colar imagem (print de tela, "copiar imagem" do navegador) ----
    // Ctrl+V cria um item novo do tamanho da imagem; Ctrl+Shift+V troca o ícone da seleção.
    // O evento paste não diz se o Shift estava apertado, então o keydown marca o pedido (vale 1 s).
    let pasteReplaceAt = 0;
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') pasteReplaceAt = e.shiftKey ? Date.now() : 0;
    }, true);

    function clipboardImageFile(dt) {
      const fromFiles = [...(dt.files || [])].find(f => f.type.startsWith('image/'));
      if (fromFiles) return fromFiles;
      for (const it of dt.items || []) {
        if (it.kind === 'file' && it.type.startsWith('image/')) return it.getAsFile();
      }
      return null;
    }

    function readImageFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => resolve({ src: reader.result, img });
          img.onerror = () => reject(new Error('imagem inválida'));
          img.src = reader.result;
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    }

    async function pasteImage(file, replace) {
      let loaded;
      try {
        loaded = await readImageFile(file);
      } catch (err) {
        showToast(t('Erro ao processar imagem.'));
        return null;
      }
      const { src, img } = loaded;
      const targets = getSelectedComponents();

      if (replace && targets.length > 0) {
        targets.forEach(c => { c.icon = img; c.iconSrc = src; });
        syncInspector();
        renderLayersList();
        renderScene();
        showToast(t('Imagem aplicada em {n} item(ns)!', { n: targets.length }));
        return targets;
      }

      // Item "só imagem": sem fundo, borda nem sombra, imagem esticada 1:1 no tamanho do item.
      // Tamanho natural, limitado a 80% da cena mantendo a proporção; centralizado na cena.
      const comp = createComponentPreset('Slot');
      const natW = img.naturalWidth || 256, natH = img.naturalHeight || 256;
      const k = Math.min(1, state.canvasWidth * 0.8 / natW, state.canvasHeight * 0.8 / natH);
      Object.assign(comp, BARE_BOX, {
        name: `${t('Imagem')} ${comp.id}`, radius: 0, text: '',
        w: Math.max(8, Math.round(natW * k)), h: Math.max(8, Math.round(natH * k)),
        iconFit: 'stretch', iconScale: 1, iconOpacity: 1, iconOffsetX: 0, iconOffsetY: 0, iconFilter: 'none',
        icon: img, iconSrc: src
      });
      comp.x = Math.round((state.canvasWidth - comp.w) / 2);
      comp.y = Math.round((state.canvasHeight - comp.h) / 2);
      state.components.push(comp);
      selectComponent(comp.id);
      showToast(t('Imagem colada como "{name}"!', { name: comp.name }));
      return [comp];
    }

    document.addEventListener('paste', (e) => {
      const replace = Date.now() - pasteReplaceAt < 1000;
      pasteReplaceAt = 0;
      if (editorClipboardBlocked(e)) return;
      const dt = e.clipboardData;
      const text = dt ? dt.getData('text/plain') : '';

      // 1) Itens copiados do Studio; 2) imagem; 3) reserva interna, só com o clipboard vazio.
      // Texto de outro app não cola nada (nem a reserva antiga) por engano.
      const payload = parseClipboardPayload(text);
      if (payload) {
        e.preventDefault();
        pasteComponents(payload);
        return;
      }
      const imageFile = dt ? clipboardImageFile(dt) : null;
      if (imageFile) {
        e.preventDefault();
        pasteImage(imageFile, replace);
        return;
      }
      if (!text && clipboardMemory) {
        e.preventDefault();
        pasteComponents(clipboardMemory);
      }
    });

