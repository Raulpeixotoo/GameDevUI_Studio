    // Duplo clique num componente: seleciona e leva o foco para o texto no Inspector.
    viewportContainer.addEventListener('dblclick', (e) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const hit = hitTest(coords.x, coords.y);
      if (!hit) return;
      selectComponent(hit.id, false);
      focusTextEditor();
    });

    viewportContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomAt(state.zoom * zoomFactor, e.clientX, e.clientY);
    }, { passive: false });

    // Drag and drop direto no viewport e canvas
    viewportContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    viewportContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files[0]) return;

      const file = e.dataTransfer.files[0];
      // Layout .json solto no canvas: soma à cena (Abrir continua sendo o jeito de substituir).
      if (/\.json$/i.test(file.name) || file.type === 'application/json') {
        importLayoutFile(file);
        return;
      }
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const hitComp = hitTest(coords.x, coords.y);
      
      // Se soltou em cima de um componente existente
      if (hitComp) {
        selectComponent(hitComp.id, false);
        loadIconIntoComponent(hitComp, file);
        return;
      }

      // Soltou em área vazia: vira rascunho de fundo (para trocar o ícone do selecionado, use a caixa no Inspector)
      loadReferenceFile(file);
    });

    window.addEventListener('keydown', (e) => {
      const modalOpen = !scriptWorkbenchModal.classList.contains('hidden');
      const mod = e.ctrlKey || e.metaKey;

      if (modalOpen) {
        if (e.key === 'Escape' || (mod && e.key.toLowerCase() === 'j') || e.key === 'F2') {
          e.preventDefault();
          toggleScriptModal(false);
        }
        // Com a bancada aberta, atalhos do editor (Delete, Ctrl+D...) não podem agir na cena por trás.
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.code === 'BracketRight') {
        // e.code: com Shift o e.key vira "}" em alguns layouts
        e.preventDefault();
        if (e.shiftKey) moveSelectionToEdge(true); else moveSelectionInStack(1);
      } else if (mod && e.code === 'BracketLeft') {
        e.preventDefault();
        if (e.shiftKey) moveSelectionToEdge(false); else moveSelectionInStack(-1);
      } else if (e.key.startsWith('Arrow') && !mod) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        nudgeSelection(dx, dy);
      } else if (!mod && e.key === '/') {
        // Busca de propriedades do Inspector.
        e.preventDefault();
        inspSearch.focus();
        inspSearch.select();
      } else if (!mod && e.shiftKey && e.code === 'Digit1') {
        e.preventDefault();
        fitCanvasToViewport();
      } else if (!mod && e.shiftKey && e.code === 'Digit0') {
        e.preventDefault();
        zoomFromCenter(1);
      } else if (mod && (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd')) {
        e.preventDefault(); // no lugar do zoom da página do navegador
        zoomFromCenter(state.zoom * 1.2);
      } else if (mod && (e.key === '-' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        zoomFromCenter(state.zoom / 1.2);
      } else if (!mod && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggleRulers();
      } else if (!mod && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        addComponentFromToolbar('Texto', 'Texto adicionado! Edite no painel à direita.');
        focusTextEditor();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteCurrentComponent();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateCurrentComponent();
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        mergeSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupComponents();
        } else {
          groupSelectedComponents();
        }
      } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') || e.key === 'F2') {
        e.preventDefault();
        toggleScriptModal();
      }
    });

    function deleteCurrentComponent() {
      const idsToDelete = state.selectedIds.length > 0 ? [...state.selectedIds] : (state.selectedId ? [state.selectedId] : []);
      if (idsToDelete.length === 0) return;
      state.components = state.components.filter(c => !idsToDelete.includes(c.id));
      pruneEmptyGroups();
      state.selectedIds = [];
      state.selectedId = state.components.length > 0 ? state.components[state.components.length - 1].id : null;
      renderLayersList();
      syncInspector();
      renderScene();
      triggerAutoSave();
      showToast(t('{n} elemento(s) excluído(s)!', { n: idsToDelete.length }));
    }

    function duplicateCurrentComponent() {
      const targets = state.selectedIds.length > 0
        ? state.components.filter(c => state.selectedIds.includes(c.id))
        : (getSelectedComponent() ? [getSelectedComponent()] : []);
      if (targets.length === 0) return;

      const newIds = [];
      targets.forEach(comp => {
        const cloned = JSON.parse(JSON.stringify(comp));
        cloned.id = state.nextId++;
        cloned.name = `${comp.name} Cópia`;
        cloned.x += 32;
        cloned.y += 32;
        cloned.icon = comp.icon;
        state.components.push(cloned);
        newIds.push(cloned.id);
      });

      state.selectedIds = newIds;
      state.selectedId = newIds[newIds.length - 1];

      renderLayersList();
      syncInspector();
      renderScene();
      triggerAutoSave();
      showToast(t('{n} elemento(s) duplicado(s)!', { n: targets.length }));
    }

