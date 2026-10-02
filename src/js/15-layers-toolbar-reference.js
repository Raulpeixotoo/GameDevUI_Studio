    function pruneEmptyGroups() {
      const usedGroupIds = new Set(state.components.map(c => c.groupId).filter(Boolean));
      state.groups = state.groups.filter(g => usedGroupIds.has(g.id));
    }

    // Move toda a seleção um passo na pilha; itens selecionados vizinhos andam juntos sem se inverter.
    function moveSelectionInStack(direction) {
      const ids = new Set(state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []));
      if (ids.size === 0) return;
      const list = state.components;
      let moved = false;
      if (direction > 0) {
        for (let i = list.length - 2; i >= 0; i--) {
          if (ids.has(list[i].id) && !ids.has(list[i + 1].id)) {
            [list[i], list[i + 1]] = [list[i + 1], list[i]];
            moved = true;
          }
        }
      } else {
        for (let i = 1; i < list.length; i++) {
          if (ids.has(list[i].id) && !ids.has(list[i - 1].id)) {
            [list[i], list[i - 1]] = [list[i - 1], list[i]];
            moved = true;
          }
        }
      }
      if (moved) {
        renderLayersList();
        renderScene();
      }
    }

    // Ctrl+Shift+] / Ctrl+Shift+[ : leva a seleção inteira para o topo ou o fundo da pilha, mantendo a ordem interna.
    function moveSelectionToEdge(toFront) {
      const selected = new Set(getSelectedComponents().map(c => c.id));
      if (selected.size === 0) return;
      const picked = state.components.filter(c => selected.has(c.id));
      const rest = state.components.filter(c => !selected.has(c.id));
      state.components = toFront ? [...rest, ...picked] : [...picked, ...rest];
      renderLayersList();
      renderScene();
      showToast(toFront ? 'Trazido para a frente' : 'Enviado para o fundo');
    }

    // Setas movem 1px (Shift = 10px). Os passos seguidos viram um único Ctrl+Z (debounce do histórico).
    function nudgeSelection(dx, dy) {
      const comps = getSelectedComponents().filter(c => !c.locked);
      if (comps.length === 0) return;
      comps.forEach(c => { c.x += dx; c.y += dy; });
      syncInspector();
      renderScene();
    }

    btnLayerUp.addEventListener('click', () => moveSelectionInStack(1));
    btnLayerDown.addEventListener('click', () => moveSelectionInStack(-1));

    btnGroupLayers.addEventListener('click', () => groupSelectedComponents());
    btnUngroupLayers.addEventListener('click', () => ungroupComponents());
    btnDuplicateLayer.addEventListener('click', duplicateCurrentComponent);
    btnDeleteLayer.addEventListener('click', deleteCurrentComponent);

    // Bloquear/desbloquear a seleção (R8, Ctrl+Shift+L como no Figma). Se todos já estão
    // bloqueados, desbloqueia; senão bloqueia todos. Item bloqueado: o clique no canvas atravessa.
    const btnLockLayers = document.getElementById('btnLockLayers');
    function toggleLockSelection() {
      const sel = getSelectedComponents();
      if (sel.length === 0) {
        showToast('Selecione ao menos 1 item para bloquear.');
        return;
      }
      const lock = !sel.every(c => c.locked);
      sel.forEach(c => { c.locked = lock; });
      renderLayersList();
      renderScene();
      showToast(t(lock ? '{n} item(ns) bloqueado(s): o clique no canvas atravessa.' : '{n} item(ns) desbloqueado(s).', { n: sel.length }));
    }
    // Chamado pelo renderLayersList (arquivo 09), que pode rodar antes deste arquivo: busca o botão na hora.
    function updateLockButton() {
      const sel = getSelectedComponents();
      document.getElementById('btnLockLayers').classList.toggle('active', sel.length > 0 && sel.every(c => c.locked));
    }
    btnLockLayers.addEventListener('click', toggleLockSelection);

    btnClearAll.addEventListener('click', () => {
      if (state.components.length === 0) return;
      if (!confirm(t('Remover todos os {n} componentes da cena? (Ctrl+Z desfaz)', { n: state.components.length }))) return;
      state.components = [];
      state.groups = [];
      state.selectedId = null;
      state.selectedIds = [];
      renderLayersList();
      syncInspector();
      renderScene();
      showToast('Cena limpa! Ctrl+Z para desfazer.');
    });

    // Todo item novo entra no TOPO da pilha (como no Figma). Antes o Painel ia para o fundo,
    // o que escondia painéis criados por script atrás do fundo da cena.
    function addComponentFromToolbar(type, message) {
      const item = createComponentPreset(type);
      state.components.push(item);
      selectComponent(item.id);
      showToast(message);
      return item;
    }

    btnAddSlot.addEventListener('click', () => addComponentFromToolbar('Slot', 'Slot de inventário adicionado!'));
    btnAddButton.addEventListener('click', () => addComponentFromToolbar('Botão', 'Botão adicionado!'));
    btnAddBar.addEventListener('click', () => addComponentFromToolbar('Barra', 'Barra de HUD adicionada!'));
    btnAddPanel.addEventListener('click', () => addComponentFromToolbar('Painel', 'Painel adicionado!'));
    btnAddRing.addEventListener('click', () => addComponentFromToolbar('Anel', 'Anel adicionado!'));
    btnAddShape.addEventListener('click', () => addComponentFromToolbar('Forma', 'Forma adicionada!'));
    btnAddText.addEventListener('click', () => {
      addComponentFromToolbar('Texto', 'Texto adicionado! Edite no painel à direita.');
      focusTextEditor();
    });

    // Leva o foco para a caixa de texto do Inspector (duplo clique no canvas, tecla T, "+ Texto").
    function focusTextEditor() {
      const propText = document.getElementById('propText');
      if (!propText) return;
      propText.focus();
      propText.select();
    }

    function loadReferenceFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        showToast('Selecione uma imagem válida (PNG, JPG, WebP)');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const ok = await applyReferenceImage(event.target.result, file.name, { visible: true });
        showToast(ok ? 'Rascunho carregado!' : 'Erro ao processar imagem do rascunho.');
      };
      reader.readAsDataURL(file);
    }

    // Aplica uma imagem de rascunho a partir de um dataURL (upload, projeto salvo ou autosave).
    function applyReferenceImage(src, name, opts = {}) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          state.reference.img = img;
          state.reference.src = src;
          state.reference.name = name || null;
          state.reference.visible = opts.visible !== undefined ? opts.visible : true;
          if (opts.opacity !== undefined) state.reference.opacity = opts.opacity;
          if (opts.fitMode) state.reference.fitMode = opts.fitMode;
          if (opts.includeInSceneExport !== undefined) state.reference.includeInSceneExport = opts.includeInSceneExport;
          state.reference.dirty = true;
          syncReferenceControls();
          renderScene();
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = src;
      });
    }

    function syncReferenceControls() {
      const ref = state.reference;
      const has = !!ref.img;
      refControls.classList.toggle('hidden', !has);
      btnClearRef.classList.toggle('hidden', !has);
      refDropZone.classList.toggle('border-figma-accent', has);
      refDropZone.classList.toggle('bg-zinc-800', has);

      const name = ref.name || t('Rascunho');
      refUploadLabel.textContent = has
        ? (name.length > 20 ? name.substring(0, 18) + '...' : name)
        : t('Clique ou arraste seu Mockup 1080p');

      const pct = Math.round(ref.opacity * 100);
      refOpacityRange.value = pct;
      refOpacityVal.textContent = `${pct}%`;
      iconRefVisible.classList.toggle('text-figma-accent', ref.visible);
      iconRefVisible.classList.toggle('text-zinc-500', !ref.visible);
      btnToggleRefFit.textContent = ref.fitMode === 'stretch' ? t('Manter Proporção') : t('Esticar');
      chkIncludeRefSceneExport.checked = ref.includeInSceneExport;
    }

    inputRefImage.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadReferenceFile(e.target.files[0]);
      }
    });

    refOpacityRange.addEventListener('input', () => {
      const val = refOpacityRange.value;
      refOpacityVal.textContent = `${val}%`;
      state.reference.opacity = val / 100;
      state.reference.dirty = true;
      renderScene();
    });

    btnToggleRefVisible.addEventListener('click', () => {
      state.reference.visible = !state.reference.visible;
      state.reference.dirty = true;
      syncReferenceControls();
      renderScene();
    });

    btnToggleRefFit.addEventListener('click', () => {
      state.reference.fitMode = state.reference.fitMode === 'contain' ? 'stretch' : 'contain';
      state.reference.dirty = true;
      syncReferenceControls();
      renderScene();
    });

    btnClearRef.addEventListener('click', () => {
      state.reference.img = null;
      state.reference.src = null;
      state.reference.name = null;
      state.reference.visible = false;
      state.reference.dirty = true;
      inputRefImage.value = '';
      syncReferenceControls();
      renderScene();
      showToast('Rascunho removido');
    });

    chkIncludeRefSceneExport.addEventListener('change', () => {
      state.reference.includeInSceneExport = chkIncludeRefSceneExport.checked;
      state.reference.dirty = true;
      triggerAutoSave();
    });

