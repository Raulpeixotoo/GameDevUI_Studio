    function renderScene() {
      if (renderSuspended) return;
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      const bg = state.sceneBackground;
      if (bg && bg.mode === 'color') {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
      }
      renderReferenceImage(ctx);
      pseudoOverflowIds.clear();
      state.components.forEach(comp => {
        renderComponentToContext(ctx, comp, 0, 0);
      });
      updatePseudoLocCount();
      updateContrastBadge();
      updateGizmo();
      triggerAutoSave();
    }

    function getSelectedComponent() {
      if (state.selectedId) {
        const found = state.components.find(c => c.id === state.selectedId);
        if (found) return found;
      }
      if (state.selectedIds && state.selectedIds.length > 0) {
        const found = state.components.find(c => c.id === state.selectedIds[state.selectedIds.length - 1]);
        if (found) return found;
      }
      return null;
    }

    // Caixa envolvente alinhada aos eixos (AABB), considerando a rotação do item.
    function getAABB(c) {
      const rad = (c.rotation || 0) * Math.PI / 180;
      if (!rad) return { x: c.x, y: c.y, w: c.w, h: c.h };
      const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
      const w = c.w * cos + c.h * sin;
      const h = c.w * sin + c.h * cos;
      return { x: c.x + c.w / 2 - w / 2, y: c.y + c.h / 2 - h / 2, w, h };
    }

    function unionAABB(comps) {
      if (!comps || comps.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      comps.forEach(c => {
        const b = getAABB(c);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      });
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function selectionBounds() {
      return unionAABB(getSelectedComponents().filter(c => c.visible));
    }

    function normalizeAngle(deg) {
      const a = ((deg % 360) + 540) % 360 - 180;
      return Math.round(a * 10) / 10;
    }

    function updateGizmo() {
      let selectedComps = state.components.filter(c => state.selectedIds.includes(c.id) && c.visible);
      if (selectedComps.length === 0 && state.selectedId) {
        const single = state.components.find(c => c.id === state.selectedId && c.visible);
        if (single) selectedComps = [single];
      }

      if (selectedComps.length === 0) {
        gizmoBox.classList.add('hidden');
        nineSliceGuides.classList.add('hidden');
        drawRulers();
        return;
      }

      const rotating = state.drag.active && state.drag.mode === 'rotate';
      const primary = getSelectedComponent();
      gizmoBox.classList.toggle('gizmo-locked', !!(primary && primary.locked));

      if (selectedComps.length === 1) {
        const comp = selectedComps[0];
        const rot = comp.rotation || 0;
        const rotCss = rot ? `rotate(${rot}deg)` : '';
        gizmoBox.classList.remove('hidden');
        gizmoBox.style.left = `${comp.x}px`;
        gizmoBox.style.top = `${comp.y}px`;
        gizmoBox.style.width = `${comp.w}px`;
        gizmoBox.style.height = `${comp.h}px`;
        gizmoBox.style.transform = rotCss;
        gizmoBadge.textContent = rotating
          ? `${Math.round(rot)}°`
          : `${Math.round(comp.w)} × ${Math.round(comp.h)}${rot ? ` · ${Math.round(rot)}°` : ''}`;

        const slice = computeNineSlice(comp).component;
        sliceL.textContent = slice.left;
        sliceT.textContent = slice.top;
        sliceR.textContent = slice.right;
        sliceB.textContent = slice.bottom;

        if (propShowGuides.checked && comp.type !== 'Forma' && comp.type !== 'Anel') {
          nineSliceGuides.classList.remove('hidden');
          nineSliceGuides.style.left = `${comp.x}px`;
          nineSliceGuides.style.top = `${comp.y}px`;
          nineSliceGuides.style.width = `${comp.w}px`;
          nineSliceGuides.style.height = `${comp.h}px`;
          nineSliceGuides.style.transform = rotCss;

          guideLineL.style.left = `${slice.left}px`;
          guideLineR.style.right = `${slice.right}px`;
          guideLineT.style.top = `${slice.top}px`;
          guideLineB.style.bottom = `${slice.bottom}px`;
        } else {
          nineSliceGuides.classList.add('hidden');
        }
      } else {
        const b = unionAABB(selectedComps);
        const boxW = Math.max(16, b.w);
        const boxH = Math.max(16, b.h);
        gizmoBox.classList.remove('hidden');
        gizmoBox.style.left = `${b.x}px`;
        gizmoBox.style.top = `${b.y}px`;
        gizmoBox.style.width = `${boxW}px`;
        gizmoBox.style.height = `${boxH}px`;
        gizmoBox.style.transform = '';
        gizmoBadge.textContent = rotating
          ? `${Math.round(state.drag.lastDelta || 0)}°`
          : `${selectedComps.length} × (${Math.round(boxW)} × ${Math.round(boxH)})`;
        nineSliceGuides.classList.add('hidden');
      }
      drawRulers();
    }

    function groupSelectedComponents(customName) {
      let targets = [...state.selectedIds];
      if (targets.length === 0 && state.selectedId) {
        targets = [state.selectedId];
      }
      if (targets.length === 0) {
        showToast('Selecione ao menos 1 elemento para agrupar!');
        return null;
      }

      const gId = state.nextGroupId++;
      const name = customName || `${t('Grupo')} ${gId}`;
      const newGroup = {
        id: gId,
        name: name,
        visible: true,
        collapsed: false
      };

      state.groups.push(newGroup);

      targets.forEach(id => {
        const comp = state.components.find(c => c.id === id);
        if (comp) comp.groupId = gId;
      });

      state.selectedIds = [...targets];
      state.selectedId = targets[targets.length - 1];

      renderLayersList();
      syncInspector();
      renderScene();
      triggerAutoSave();
      showToast(t('Criado: {name}', { name }));
      return newGroup;
    }

    function ungroupComponents(groupId) {
      let targetGId = groupId;
      if (!targetGId) {
        const comp = getSelectedComponent();
        if (comp && comp.groupId) {
          targetGId = comp.groupId;
        } else if (state.selectedIds.length > 0) {
          for (const id of state.selectedIds) {
            const c = state.components.find(item => item.id === id);
            if (c && c.groupId) {
              targetGId = c.groupId;
              break;
            }
          }
        }
      }

      if (!targetGId) {
        showToast('Nenhum grupo selecionado para desagrupar!');
        return;
      }

      const grp = state.groups.find(g => g.id === targetGId);
      const grpName = grp ? grp.name : `Grupo ${targetGId}`;

      state.groups = state.groups.filter(g => g.id !== targetGId);
      state.components.forEach(c => {
        if (c.groupId === targetGId) {
          c.groupId = null;
        }
      });

      renderLayersList();
      syncInspector();
      renderScene();
      triggerAutoSave();
      showToast(t('{name} desagrupado!', { name: grpName }));
    }

    const LAYER_TYPE_ICONS = {
      'Slot': { color: 'text-blue-400', path: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>' },
      'Botão': { color: 'text-amber-400', path: '<rect x="3" y="6" width="18" height="12" rx="3" stroke-width="2"/>' },
      'Barra': { color: 'text-emerald-400', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>' },
      'Painel': { color: 'text-purple-400', path: '<rect x="2" y="3" width="20" height="18" rx="2" stroke-width="2" stroke-dasharray="4 2"/>' },
      'Texto': { color: 'text-pink-400', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 6h14M12 6v13M9 19h6"/>' },
      'Anel': { color: 'text-orange-400', path: '<path stroke-linecap="round" stroke-width="2.5" d="M12 3a9 9 0 11-8.5 6"/>' },
      'Forma': { color: 'text-yellow-400', path: '<path stroke-linejoin="round" stroke-width="2" d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z"/>' }
    };

    let layerSearchQuery = '';

    // Renomear direto na lista (duplo clique no nome).
    function startInlineRename(nameSpan, onCommit) {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = nameSpan.textContent;
      input.className = 'bg-zinc-950 text-zinc-100 border border-figma-accent rounded px-1 py-0 text-xs w-full focus:outline-none';
      nameSpan.replaceWith(input);
      input.focus();
      input.select();
      let done = false;
      const finish = (commit) => {
        if (done) return;
        done = true;
        if (commit && input.value.trim()) onCommit(input.value.trim());
        renderLayersList();
        syncInspector();
      };
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('click', (e) => e.stopPropagation());
    }

    function renderLayersList() {
      if (renderSuspended) return;
      updateLockButton();
      layersList.innerHTML = '';
      const totalComps = state.components.length;
      const groupCount = state.groups.length;
      layerCountText.textContent = groupCount > 0
        ? t('{n} componente(s) · {g} grupo(s)', { n: totalComps, g: groupCount })
        : t('{n} componente(s)', { n: totalComps });

      if (totalComps === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-center py-8 text-zinc-500 text-xs';
        empty.textContent = t('Nenhum elemento adicionado. Use os botões no topo para criar.');
        layersList.appendChild(empty);
        return;
      }

      function buildCompItem(comp, isChild = false) {
        const isSelected = state.selectedIds.includes(comp.id) || comp.id === state.selectedId;
        const item = document.createElement('div');
        item.dataset.id = comp.id;
        item.className = `group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs transition ${
          isChild ? 'ml-3 border-l-2 border-zinc-700/60 pl-2 my-0.5' : 'my-0.5'
        } ${
          isSelected ? 'bg-figma-accent text-white font-medium shadow-sm' : 'text-zinc-300 hover:bg-figma-hover'
        } ${comp.visible ? '' : 'opacity-50'}`;

        const leftWrap = document.createElement('div');
        leftWrap.className = 'flex items-center gap-2 truncate flex-1 mr-2 min-w-0';

        const icon = LAYER_TYPE_ICONS[comp.type] || LAYER_TYPE_ICONS['Painel'];
        leftWrap.innerHTML = `<svg class="w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : icon.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon.path}</svg>`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate select-none cursor-pointer';
        nameSpan.textContent = comp.name;
        nameSpan.title = t('Duplo clique para renomear');
        nameSpan.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          startInlineRename(nameSpan, (name) => { comp.name = name; renderScene(); });
        });
        leftWrap.appendChild(nameSpan);

        const rightWrap = document.createElement('div');
        rightWrap.className = 'flex items-center gap-1 opacity-80 group-hover:opacity-100';

        const eyeBtn = document.createElement('button');
        eyeBtn.className = 'p-0.5 hover:scale-110 transition';
        eyeBtn.title = comp.visible ? t('Ocultar') : t('Mostrar');
        eyeBtn.innerHTML = comp.visible
          ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`
          : `<svg class="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>`;
        eyeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          comp.visible = !comp.visible;
          renderLayersList();
          renderScene();
        });

        // Cadeado: sempre visível quando trancado; aberto só aparece no hover.
        const lockBtn = document.createElement('button');
        lockBtn.className = `p-0.5 hover:scale-110 transition ${comp.locked ? '' : 'opacity-0 group-hover:opacity-100'}`;
        lockBtn.title = comp.locked ? t('Destrancar') : t('Trancar (o clique no canvas atravessa)');
        lockBtn.innerHTML = comp.locked
          ? `<svg class="w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`
          : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          comp.locked = !comp.locked;
          renderLayersList();
          renderScene();
        });

        rightWrap.appendChild(lockBtn);
        rightWrap.appendChild(eyeBtn);
        item.appendChild(leftWrap);
        item.appendChild(rightWrap);

        item.addEventListener('click', (e) => {
          const multi = e.ctrlKey || e.metaKey || e.shiftKey;
          selectComponent(comp.id, multi);
        });

        // Arrastar na lista (fora da busca): muda a ordem e entra no grupo de onde for solto.
        if (!query) {
          item.draggable = true;
          item.addEventListener('dragstart', (e) => {
            const selected = getSelectedComponents().map(c => c.id);
            startLayerDrag(e, item, selected.includes(comp.id) ? selected : [comp.id], false);
          });
          makeLayerDropTarget(item, (side) => ({ targetId: comp.id, side, groupId: comp.groupId || null }));
        }

        return item;
      }

      // Busca: lista plana com o que casar no nome ou no texto do componente.
      const query = layerSearchQuery.trim().toLowerCase();
      if (query) {
        const matches = [...state.components].reverse().filter(c =>
          c.name.toLowerCase().includes(query) || String(c.text || '').toLowerCase().includes(query)
        );
        if (matches.length === 0) {
          const none = document.createElement('div');
          none.className = 'text-center py-6 text-zinc-500 text-xs';
          none.textContent = t('Nenhuma camada encontrada.');
          layersList.appendChild(none);
        }
        matches.forEach(c => layersList.appendChild(buildCompItem(c, false)));
        scrollSelectedLayerIntoView();
        return;
      }

      const renderedGroupIds = new Set();
      const reversedComps = [...state.components].reverse();

      reversedComps.forEach((comp) => {
        if (comp.groupId) {
          if (renderedGroupIds.has(comp.groupId)) return;
          renderedGroupIds.add(comp.groupId);
          let group = state.groups.find(g => g.id === comp.groupId);
          if (!group) {
            group = { id: comp.groupId, name: `${t('Grupo')} ${comp.groupId}`, visible: true, collapsed: false };
            state.groups.push(group);
          }

          const groupComps = state.components.filter(c => c.groupId === comp.groupId);
          const groupCompsReversed = [...groupComps].reverse();
          const allSelected = groupComps.length > 0 && groupComps.every(c => state.selectedIds.includes(c.id));
          const someSelected = groupComps.some(c => state.selectedIds.includes(c.id) || c.id === state.selectedId);

          const groupContainer = document.createElement('div');
          groupContainer.className = 'flex flex-col my-1 rounded border border-zinc-800 bg-zinc-900/40 overflow-hidden shrink-0';

          const groupHeader = document.createElement('div');
          groupHeader.className = `group flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs transition select-none ${
            allSelected ? 'bg-amber-500/20 text-amber-200 font-semibold' : someSelected ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-300 hover:bg-zinc-800/50'
          }`;

          const headerLeft = document.createElement('div');
          headerLeft.className = 'flex items-center gap-1.5 truncate flex-1 mr-2 min-w-0';

          const chevronBtn = document.createElement('button');
          chevronBtn.className = 'p-0.5 text-zinc-400 hover:text-white transition-transform';
          chevronBtn.innerHTML = group.collapsed
            ? `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`
            : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`;
          chevronBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            group.collapsed = !group.collapsed;
            renderLayersList();
          });

          const folderSvg = `<svg class="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`;
          const groupNameSpan = document.createElement('span');
          groupNameSpan.className = 'truncate font-medium';
          groupNameSpan.textContent = group.name;
          groupNameSpan.title = t('Duplo clique para renomear');
          groupNameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startInlineRename(groupNameSpan, (name) => { group.name = name; triggerAutoSave(); });
          });

          const countBadge = document.createElement('span');
          countBadge.className = 'text-[10px] text-zinc-400 font-mono px-1 rounded bg-zinc-800/80';
          countBadge.textContent = groupComps.length;

          headerLeft.appendChild(chevronBtn);
          headerLeft.insertAdjacentHTML('beforeend', folderSvg);
          headerLeft.appendChild(groupNameSpan);
          headerLeft.appendChild(countBadge);

          const headerRight = document.createElement('div');
          headerRight.className = 'flex items-center gap-1';

          const ungroupBtn = document.createElement('button');
          ungroupBtn.className = 'p-0.5 text-zinc-400 hover:text-amber-400 opacity-60 group-hover:opacity-100 transition';
          ungroupBtn.title = t('Desagrupar');
          ungroupBtn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
          ungroupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ungroupComponents(group.id);
          });

          headerRight.appendChild(ungroupBtn);
          groupHeader.appendChild(headerLeft);
          groupHeader.appendChild(headerRight);

          groupHeader.addEventListener('click', () => {
            state.selectedIds = groupComps.map(c => c.id);
            state.selectedId = groupComps[0] ? groupComps[0].id : null;
            renderLayersList();
            syncInspector();
            renderScene();
          });

          // Arrastar o cabeçalho leva o grupo inteiro (sem desfazer o grupo); soltar sobre ele
          // coloca os itens no topo do grupo, como membros.
          groupHeader.draggable = true;
          groupHeader.addEventListener('dragstart', (e) => startLayerDrag(e, groupContainer, groupComps.map(c => c.id), true));
          makeLayerDropTarget(groupHeader, () => ({ targetId: groupComps[groupComps.length - 1].id, side: 'front', groupId: group.id }));

          groupContainer.appendChild(groupHeader);

          if (!group.collapsed) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'flex flex-col py-0.5 bg-zinc-950/20';
            groupCompsReversed.forEach(childComp => {
              childrenContainer.appendChild(buildCompItem(childComp, true));
            });
            groupContainer.appendChild(childrenContainer);
          }

          layersList.appendChild(groupContainer);
        } else {
          layersList.appendChild(buildCompItem(comp, false));
        }
      });

      scrollSelectedLayerIntoView();
    }

    // ---- Arrastar na lista de camadas ----
    // A lista mostra o topo da pilha em cima: soltar na metade de cima de uma linha = na frente dela.
    let layerDrag = null; // { ids, keepGroup }

    function startLayerDrag(e, el, ids, keepGroup) {
      layerDrag = { ids, keepGroup };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-devui-layer', ids.join(',')); // Firefox só arrasta com dados
      el.classList.add('opacity-40');
      e.stopPropagation();
    }

    function makeLayerDropTarget(el, resolveDrop) {
      const sideOf = (e) => {
        const r = el.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2 ? 'front' : 'behind';
      };
      el.addEventListener('dragover', (e) => {
        if (!layerDrag) return;
        const drop = resolveDrop(sideOf(e));
        if (layerDrag.ids.includes(drop.targetId)) return;
        e.preventDefault();
        e.stopPropagation();
        el.style.boxShadow = drop.side === 'front' ? 'inset 0 2px 0 0 #38bdf8' : 'inset 0 -2px 0 0 #38bdf8';
      });
      el.addEventListener('dragleave', () => { el.style.boxShadow = ''; });
      el.addEventListener('drop', (e) => {
        el.style.boxShadow = '';
        if (!layerDrag) return;
        e.preventDefault();
        e.stopPropagation();
        const drop = resolveDrop(sideOf(e));
        const { ids, keepGroup } = layerDrag;
        // Limpa já: a lista é redesenhada e o dragend do elemento removido não chega até aqui.
        layerDrag = null;
        moveLayersTo(ids, drop.targetId, drop.side, keepGroup ? undefined : drop.groupId);
      });
    }

    // groupId undefined = mantém o grupo de cada item (arrasto de grupo inteiro).
    function moveLayersTo(ids, targetId, side, groupId) {
      if (ids.includes(targetId)) return;
      const moving = state.components.filter(c => ids.includes(c.id));
      const rest = state.components.filter(c => !ids.includes(c.id));
      const idx = rest.findIndex(c => c.id === targetId);
      if (moving.length === 0 || idx < 0) return;
      if (groupId !== undefined) moving.forEach(c => { c.groupId = groupId; });
      rest.splice(side === 'front' ? idx + 1 : idx, 0, ...moving);
      state.components = rest;
      pruneEmptyGroups();
      renderLayersList();
      renderScene();
    }

    layersList.addEventListener('dragend', () => {
      if (!layerDrag) return;
      layerDrag = null;
      renderLayersList();
    });

    // Selecionar no canvas rola a lista até a camada (em cenas grandes ela some de vista).
    function scrollSelectedLayerIntoView() {
      if (!state.selectedId) return;
      const el = layersList.querySelector(`[data-id="${state.selectedId}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    function selectComponent(id, multi = false) {
      if (multi && id) {
        if (state.selectedIds.includes(id)) {
          state.selectedIds = state.selectedIds.filter(x => x !== id);
        } else {
          state.selectedIds.push(id);
        }
        state.selectedId = state.selectedIds.length > 0 ? state.selectedIds[state.selectedIds.length - 1] : null;
      } else {
        state.selectedId = id;
        state.selectedIds = id ? [id] : [];
      }
      renderLayersList();
      syncInspector();
      renderScene();
    }

