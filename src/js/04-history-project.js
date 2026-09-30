    // ===== Histórico (Undo / Redo) =====
    // Snapshots JSON do documento. As imagens ficam num registro compartilhado e o snapshot guarda
    // só uma chave curta, para não duplicar o base64 a cada passo do histórico.
    const history = { undo: [], redo: [], current: null, limit: 100 };
    const assetRegistry = { bySrc: new Map(), byKey: new Map(), nextKey: 1 };

    function registerAsset(src, img) {
      let key = assetRegistry.bySrc.get(src);
      if (!key) {
        key = `asset:${assetRegistry.nextKey++}`;
        assetRegistry.bySrc.set(src, key);
        assetRegistry.byKey.set(key, { src, img });
      }
      return key;
    }

    function snapshotDocument() {
      return JSON.stringify({
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        nextId: state.nextId,
        nextGroupId: state.nextGroupId,
        groups: state.groups,
        guides: state.guides,
        nextGuideId: state.nextGuideId,
        sceneBackground: state.sceneBackground,
        components: state.components.map(comp => {
          const s = { ...comp };
          delete s.icon;
          if (comp.iconSrc) s.iconSrc = registerAsset(comp.iconSrc, comp.icon);
          return s;
        })
      });
    }

    function restoreSnapshot(snap) {
      const data = JSON.parse(snap);
      if (data.canvasWidth !== state.canvasWidth || data.canvasHeight !== state.canvasHeight) {
        applyCanvasResolution(`${data.canvasWidth}x${data.canvasHeight}`);
        canvasResSelect.value = `${data.canvasWidth}x${data.canvasHeight}`;
      }
      state.nextId = data.nextId;
      state.nextGroupId = data.nextGroupId;
      state.groups = data.groups;
      state.guides = data.guides || [];
      state.nextGuideId = data.nextGuideId || 1;
      state.sceneBackground = data.sceneBackground || { mode: 'transparent', color: '#101014' };
      syncSceneBackgroundUI();
      renderGuides();
      state.components = data.components.map(comp => {
        const asset = comp.iconSrc ? assetRegistry.byKey.get(comp.iconSrc) : null;
        comp.iconSrc = asset ? asset.src : null;
        comp.icon = asset ? asset.img : null;
        return normalizeComponent(comp);
      });

      const existing = new Set(state.components.map(c => c.id));
      state.selectedIds = state.selectedIds.filter(id => existing.has(id));
      if (!existing.has(state.selectedId)) {
        state.selectedId = state.selectedIds.length > 0 ? state.selectedIds[state.selectedIds.length - 1] : null;
      }

      renderLayersList();
      syncInspector();
      renderScene();
    }

    function recordHistory() {
      const snap = snapshotDocument();
      if (snap === history.current) return;
      if (history.current !== null) {
        history.undo.push(history.current);
        if (history.undo.length > history.limit) history.undo.shift();
        history.redo = [];
      }
      history.current = snap;
      updateHistoryButtons();
    }

    function updateHistoryButtons() {
      btnUndo.disabled = history.undo.length === 0;
      btnRedo.disabled = history.redo.length === 0;
    }

    // Garante que uma alteração ainda no debounce entre no histórico antes de desfazer.
    function flushPendingHistory() {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
        recordHistory();
      }
    }

    function undo() {
      if (state.drag.active) return;
      flushPendingHistory();
      if (history.undo.length === 0) return;
      history.redo.push(history.current);
      history.current = history.undo.pop();
      restoreSnapshot(history.current);
      updateHistoryButtons();
      showToast('Desfeito');
    }

    function redo() {
      if (state.drag.active) return;
      flushPendingHistory();
      if (history.redo.length === 0) return;
      history.undo.push(history.current);
      history.current = history.redo.pop();
      restoreSnapshot(history.current);
      updateHistoryButtons();
      showToast('Refeito');
    }

    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);

    // Chamado 500ms após a última renderização: agrupa arrastos de slider e movimentos num único passo de histórico.
    let autoSaveTimer = null;
    function triggerAutoSave() {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(onDocumentSettled, 500);
    }

    // Aba escondida (troca de aba, minimizar, fechar): grava na hora o que ainda estava no debounce.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        onDocumentSettled();
      }
    });

    function onDocumentSettled() {
      autoSaveTimer = null;
      if (state.drag.active) {
        triggerAutoSave();
        return;
      }
      recordHistory();
      autoSaveToStorage();
      saveReferenceToStorage();
    }

    // Manifest antigo (só "assets", sem "components"): converte para o formato de projeto.
    function upgradeLegacyAssets(data) {
      if (data.assets && Array.isArray(data.assets) && !data.components) {
        data.components = data.assets.map((item, idx) => {
          const comp = createComponentPreset(item.type || 'Slot');
          comp.id = idx + 1;
          comp.name = item.name || `Componente ${comp.id}`;
          if (item.dimensions) {
            comp.w = item.dimensions.width;
            comp.h = item.dimensions.height;
          }
          if (item.positionIn1080pScene) {
            comp.x = item.positionIn1080pScene.x;
            comp.y = item.positionIn1080pScene.y;
          }
          return comp;
        });
        if (data.resolution) {
          data.canvasWidth = data.resolution.width;
          data.canvasHeight = data.resolution.height;
        }
      }
    }

    async function loadProjectFromData(data) {
      if (!data) return false;
      upgradeLegacyAssets(data);

      if (!data.components || !Array.isArray(data.components)) {
        return false;
      }
      sanitizeProjectData(data);

      if (data.canvasWidth && data.canvasHeight) {
        applyCanvasResolution(`${data.canvasWidth}x${data.canvasHeight}`);
        if (canvasResSelect) canvasResSelect.value = `${data.canvasWidth}x${data.canvasHeight}`;
      }

      state.nextId = data.nextId || (data.components.length + 1);
      state.groups = data.groups || [];
      state.nextGroupId = data.nextGroupId || (state.groups.length + 1);
      state.guides = Array.isArray(data.guides) ? data.guides : [];
      state.nextGuideId = data.nextGuideId || (state.guides.length + 1);
      state.sceneBackground = data.sceneBackground || { mode: 'transparent', color: '#101014' };
      syncSceneBackgroundUI();
      renderGuides();

      const loadedComponents = await Promise.all(data.components.map(comp => {
        normalizeComponent(comp);
        comp.groupId = comp.groupId || null;
        return new Promise((resolve) => {
          if (comp.iconSrc) {
            const img = new Image();
            img.onload = () => {
              comp.icon = img;
              resolve(comp);
            };
            img.onerror = () => {
              comp.icon = null;
              resolve(comp);
            };
            img.src = comp.iconSrc;
          } else {
            comp.icon = null;
            resolve(comp);
          }
        });
      }));

      state.components = loadedComponents;
      state.selectedId = state.components.length > 0 ? state.components[state.components.length - 1].id : null;
      state.selectedIds = state.selectedId ? [state.selectedId] : [];

      if (data.reference && data.reference.src) {
        await applyReferenceImage(data.reference.src, data.reference.name || t('Rascunho do projeto'), data.reference);
      }

      renderLayersList();
      syncInspector();
      renderScene();
      fitCanvasToViewport();
      return true;
    }

    btnSaveProject.addEventListener('click', () => {
      if (state.components.length === 0) {
        showToast('Nenhum componente para salvar no layout!');
        return;
      }
      const projectData = getSerializedProjectData(true);
      const jsonStr = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timeStamp = new Date().toISOString().slice(0, 10);
      a.download = `GameUI_Layout_${state.canvasWidth}x${state.canvasHeight}_${timeStamp}.json`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Layout do projeto salvo (.json)!');
    });

    // Layout com várias imagens base64 fica na casa de poucos MB; acima disso é arquivo errado ou abuso.
    const MAX_PROJECT_BYTES = 50 * 1048576;

    inputLoadProject.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > MAX_PROJECT_BYTES) {
        showToast(t('Arquivo grande demais (máx. {n} MB).', { n: MAX_PROJECT_BYTES / 1048576 }));
        inputLoadProject.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const ok = await loadProjectFromData(data);
          if (ok) {
            autoSaveToStorage();
            showToast(t('Layout carregado ({n} componentes)!', { n: state.components.length }));
          } else {
            showToast('Arquivo de projeto inválido!');
          }
        } catch (err) {
          showToast('Erro ao carregar JSON do projeto');
        }
      };
      reader.readAsText(file);
      inputLoadProject.value = '';
    });

    // Mensagens literais em PT são traduzidas aqui; as com variáveis já chegam prontas via t().
    let toastTimer = null;
    let toastMuted = false;
    function showToast(message) {
      if (toastMuted) return;
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.textContent = t(message);
      toast.classList.remove('translate-y-16', 'opacity-0');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.add('translate-y-16', 'opacity-0');
      }, 2500);
    }

