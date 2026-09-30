    function getCanvasCoords(clientX, clientY) {
      const rect = mainCanvas.getBoundingClientRect();
      const scaleX = mainCanvas.width / rect.width;
      const scaleY = mainCanvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    // Teste de clique: desgira o ponto para o espaço local do item; Forma usa o contorno real (Path2D).
    function pointInComponent(comp, x, y) {
      let px = x, py = y;
      const rad = (comp.rotation || 0) * Math.PI / 180;
      if (rad) {
        const cx = comp.x + comp.w / 2, cy = comp.y + comp.h / 2;
        const dx = x - cx, dy = y - cy;
        px = cx + dx * Math.cos(-rad) - dy * Math.sin(-rad);
        py = cy + dx * Math.sin(-rad) + dy * Math.cos(-rad);
      }
      if (px < comp.x || px > comp.x + comp.w || py < comp.y || py > comp.y + comp.h) return false;
      if (comp.type !== 'Forma') return true;
      const path = new Path2D();
      addComponentGeometry(path, comp, comp.x, comp.y, comp.w, comp.h, 0);
      return ctx.isPointInPath(path, px, py);
    }

    function hitTest(x, y) {
      for (let i = state.components.length - 1; i >= 0; i--) {
        const comp = state.components[i];
        // Trancado = o clique atravessa (ex.: fundo de tela cheia não é pego nem arrastado sem querer).
        if (!comp.visible || comp.locked) continue;
        if (pointInComponent(comp, x, y)) return comp;
      }
      return null;
    }

    function snapshotPositions(comps) {
      const map = new Map();
      comps.forEach(c => map.set(c.id, { x: c.x, y: c.y, w: c.w, h: c.h, rotation: c.rotation || 0 }));
      return map;
    }

    viewportContainer.addEventListener('mousedown', (e) => {
      // Controles flutuantes do viewport (fundo da cena etc.) não iniciam arrasto nem limpam a seleção.
      if (e.target.closest('select, input, button, label')) return;

      if (e.button === 1 || (e.button === 0 && state.spacePressed)) {
        state.isPanning = true;
        state.panStart.x = e.clientX - state.panX;
        state.panStart.y = e.clientY - state.panY;
        viewportContainer.classList.add('cursor-grabbing-active');
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      if (e.target.classList.contains('handle')) {
        const handleType = e.target.dataset.handle;
        const comp = getSelectedComponent();
        if (!comp) return;

        // Com o principal trancado as alças ficam escondidas; itens trancados na seleção não mudam.
        if (comp.locked) return;
        let targets = state.components.filter(c => state.selectedIds.includes(c.id) && c.visible && !c.locked);
        if (targets.length === 0) targets = [comp];

        // Caixa sem rotação da seleção: base do resize proporcional em multi-seleção.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        targets.forEach(c => {
          minX = Math.min(minX, c.x);
          minY = Math.min(minY, c.y);
          maxX = Math.max(maxX, c.x + c.w);
          maxY = Math.max(maxY, c.y + c.h);
        });

        state.drag.active = true;
        state.drag.mode = handleType === 'rot' ? 'rotate' : handleType;
        state.drag.startX = e.clientX;
        state.drag.startY = e.clientY;
        state.drag.initialComp = { ...comp };
        state.drag.initialPositions = snapshotPositions(targets);
        state.drag.initialBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        state.drag.snapTargets = snapTargets(new Set(targets.map(c => c.id)));

        if (handleType === 'rot') {
          const b = targets.length === 1 ? { x: comp.x, y: comp.y, w: comp.w, h: comp.h } : unionAABB(targets);
          state.drag.rotCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
          const p = getCanvasCoords(e.clientX, e.clientY);
          state.drag.startAngle = Math.atan2(p.y - state.drag.rotCenter.y, p.x - state.drag.rotCenter.x);
          state.drag.lastDelta = 0;
        }
        e.preventDefault();
        return;
      }

      const coords = getCanvasCoords(e.clientX, e.clientY);
      const clickedComp = hitTest(coords.x, coords.y);

      if (clickedComp) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          selectComponent(clickedComp.id, true);
        } else {
          if (!state.selectedIds.includes(clickedComp.id)) {
            selectComponent(clickedComp.id, false);
          }
        }

        const toDrag = state.components.filter(c => state.selectedIds.includes(c.id) && !c.locked);
        if (toDrag.length === 0 && clickedComp) toDrag.push(clickedComp);

        state.drag.active = true;
        state.drag.mode = 'move';
        state.drag.startX = e.clientX;
        state.drag.startY = e.clientY;
        state.drag.initialPositions = snapshotPositions(toDrag);
        state.drag.initialComp = { ...clickedComp };
        state.drag.initialBox = unionAABB(toDrag);
        state.drag.snapTargets = snapTargets(new Set(toDrag.map(c => c.id)));
      } else {
        // Clique no vazio: limpa a seleção e começa o retângulo. Shift/Ctrl somam à seleção atual.
        const additive = e.shiftKey || e.ctrlKey || e.metaKey;
        marquee = {
          x0: coords.x, y0: coords.y, clientX: e.clientX, clientY: e.clientY, moved: false,
          base: additive ? getSelectedComponents().map(c => c.id) : []
        };
        if (!additive) {
          state.selectedId = null;
          state.selectedIds = [];
          renderLayersList();
          syncInspector();
          updateGizmo();
        }
        e.preventDefault();
      }
    });

    // ---- Seleção por retângulo (marquee) ----
    // Seleciona o que cruza o retângulo (caixa já considerando rotação), como no Figma.
    // Ocultos e trancados ficam de fora. Não mexe no documento, então não gera passo de histórico.
    let marquee = null;

    function updateMarquee(e) {
      if (!marquee.moved && Math.hypot(e.clientX - marquee.clientX, e.clientY - marquee.clientY) < 3) return;
      marquee.moved = true;
      const p = getCanvasCoords(e.clientX, e.clientY);
      const x = Math.min(marquee.x0, p.x), y = Math.min(marquee.y0, p.y);
      const w = Math.abs(p.x - marquee.x0), h = Math.abs(p.y - marquee.y0);
      marqueeBox.classList.remove('hidden');
      marqueeBox.style.left = `${x}px`;
      marqueeBox.style.top = `${y}px`;
      marqueeBox.style.width = `${w}px`;
      marqueeBox.style.height = `${h}px`;

      const hits = state.components.filter(c => {
        if (!c.visible || c.locked) return false;
        const b = getAABB(c);
        return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
      }).map(c => c.id);
      const ids = [...marquee.base, ...hits.filter(id => !marquee.base.includes(id))];
      state.selectedIds = ids;
      state.selectedId = ids.length > 0 ? ids[ids.length - 1] : null;
      updateGizmo();
    }

    function finishMarquee() {
      const moved = marquee.moved;
      marquee = null;
      marqueeBox.classList.add('hidden');
      if (!moved) return;
      renderLayersList();
      syncInspector();
      updateGizmo();
    }

    window.addEventListener('mousemove', (e) => {
      if (state.isPanning) {
        state.panX = e.clientX - state.panStart.x;
        state.panY = e.clientY - state.panStart.y;
        updateCanvasWorldTransform();
        return;
      }

      if (guideDrag) {
        updateGuideDrag(e);
        return;
      }

      if (marquee) {
        updateMarquee(e);
        return;
      }

      if (!state.drag.active) return;
      const comp = getSelectedComponent();
      if (!comp || !state.drag.initialComp) return;

      const dx = (e.clientX - state.drag.startX) / state.zoom;
      const dy = (e.clientY - state.drag.startY) / state.zoom;
      const positions = state.drag.initialPositions;
      const mode = state.drag.mode;
      const grid = state.gridSize;
      const threshold = SNAP_SCREEN_PX / state.zoom;
      const targets = state.drag.snapTargets || { xs: [], ys: [] };
      const useSnap = !e.altKey; // Alt desliga o snap durante o arrasto
      const vLines = [], hLines = [];

      if (mode === 'move') {
        const box0 = state.drag.initialBox;
        let mdx = dx, mdy = dy;
        if (useSnap && box0) {
          const bx = box0.x + dx, by = box0.y + dy;
          const sx = nearestSnap([bx, bx + box0.w / 2, bx + box0.w], targets.xs, threshold);
          const sy = nearestSnap([by, by + box0.h / 2, by + box0.h], targets.ys, threshold);
          if (sx) { mdx += sx.delta; vLines.push(sx.target); }
          else if (state.snapToGrid) mdx += Math.round(bx / grid) * grid - bx;
          if (sy) { mdy += sy.delta; hLines.push(sy.target); }
          else if (state.snapToGrid) mdy += Math.round(by / grid) * grid - by;
        }
        positions.forEach((pos, id) => {
          const c = state.components.find(item => item.id === id);
          if (!c) return;
          c.x = Math.round(pos.x + mdx);
          c.y = Math.round(pos.y + mdy);
        });
      } else if (mode === 'rotate') {
        const center = state.drag.rotCenter;
        const p = getCanvasCoords(e.clientX, e.clientY);
        let delta = (Math.atan2(p.y - center.y, p.x - center.x) - state.drag.startAngle) * 180 / Math.PI;
        if (positions.size === 1) {
          const only = positions.values().next().value;
          if (e.shiftKey) delta = Math.round((only.rotation + delta) / 15) * 15 - only.rotation;
        } else if (e.shiftKey) {
          delta = Math.round(delta / 15) * 15;
        }
        state.drag.lastDelta = delta;
        const rad = delta * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        positions.forEach((pos, id) => {
          const c = state.components.find(item => item.id === id);
          if (!c) return;
          // Cada centro gira em volta do centro da seleção; com 1 item ele gira no lugar.
          const rx = pos.x + pos.w / 2 - center.x, ry = pos.y + pos.h / 2 - center.y;
          c.x = Math.round(center.x + rx * cos - ry * sin - pos.w / 2);
          c.y = Math.round(center.y + rx * sin + ry * cos - pos.h / 2);
          c.rotation = normalizeAngle(pos.rotation + delta);
        });
      } else if (positions.size === 1 && (positions.get(comp.id)?.rotation || 0) !== 0) {
        // Resize de item girado: projeta o arrasto nos eixos do item e recalcula o centro
        // para a borda oposta ficar parada.
        const pos = positions.get(comp.id);
        const minSize = 16;
        const rad = pos.rotation * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        const ldx = dx * cos + dy * sin, ldy = -dx * sin + dy * cos;
        let l = 0, t0 = 0, r = pos.w, b = pos.h;
        if (mode.includes('l')) l = Math.min(ldx, r - minSize);
        if (mode.includes('r')) r = Math.max(pos.w + ldx, l + minSize);
        if (mode.includes('t')) t0 = Math.min(ldy, b - minSize);
        if (mode.includes('b')) b = Math.max(pos.h + ldy, t0 + minSize);
        if (e.shiftKey && mode.length === 2) {
          const ratio = pos.w / pos.h;
          let nw = r - l, nh = b - t0;
          if (nw / nh > ratio) nh = nw / ratio; else nw = nh * ratio;
          if (mode.includes('l')) l = r - nw; else r = l + nw;
          if (mode.includes('t')) t0 = b - nh; else b = t0 + nh;
        }
        const ox = (l + r) / 2 - pos.w / 2, oy = (t0 + b) / 2 - pos.h / 2;
        const cx = pos.x + pos.w / 2 + ox * cos - oy * sin;
        const cy = pos.y + pos.h / 2 + ox * sin + oy * cos;
        comp.w = Math.round(r - l);
        comp.h = Math.round(b - t0);
        comp.x = Math.round(cx - comp.w / 2);
        comp.y = Math.round(cy - comp.h / 2);
      } else {
        const box = state.drag.initialBox;
        const minSize = 16;
        // Snap da borda arrastada: primeiro alvos inteligentes, depois o grid.
        const snapEdge = (value, axis) => {
          if (!useSnap) return value;
          const s = nearestSnap([value], axis === 'x' ? targets.xs : targets.ys, threshold);
          if (s) {
            (axis === 'x' ? vLines : hLines).push(s.target);
            return value + s.delta;
          }
          return state.snapToGrid ? Math.round(value / grid) * grid : value;
        };

        let left = box.x, top = box.y;
        let right = box.x + box.w, bottom = box.y + box.h;
        if (mode.includes('l')) left = Math.min(snapEdge(box.x + dx, 'x'), right - minSize);
        if (mode.includes('r')) right = Math.max(snapEdge(right + dx, 'x'), left + minSize);
        if (mode.includes('t')) top = Math.min(snapEdge(box.y + dy, 'y'), bottom - minSize);
        if (mode.includes('b')) bottom = Math.max(snapEdge(bottom + dy, 'y'), top + minSize);

        // Shift + alça de canto = mantém a proporção original.
        if (e.shiftKey && mode.length === 2) {
          const ratio = box.w / box.h;
          let w = right - left, h = bottom - top;
          if (w / h > ratio) h = w / ratio; else w = h * ratio;
          if (mode.includes('l')) left = right - w; else right = left + w;
          if (mode.includes('t')) top = bottom - h; else bottom = top + h;
        }

        const sx = (right - left) / box.w;
        const sy = (bottom - top) / box.h;

        if (positions && positions.size > 1) {
          positions.forEach((pos, id) => {
            const c = state.components.find(item => item.id === id);
            if (!c) return;
            c.x = Math.round(left + (pos.x - box.x) * sx);
            c.y = Math.round(top + (pos.y - box.y) * sy);
            c.w = Math.max(8, Math.round(pos.w * sx));
            c.h = Math.max(8, Math.round(pos.h * sy));
          });
        } else {
          comp.x = Math.round(left);
          comp.y = Math.round(top);
          comp.w = Math.round(right - left);
          comp.h = Math.round(bottom - top);
        }
      }

      showSnapLines(vLines, hLines);
      syncInspector();
      renderScene();
    });

    window.addEventListener('mouseup', (e) => {
      if (state.isPanning) {
        state.isPanning = false;
        viewportContainer.classList.remove('cursor-grabbing-active');
      }
      if (guideDrag) finishGuideDrag(e);
      if (marquee) finishMarquee();
      if (state.drag.active) {
        state.drag.active = false;
        state.drag.mode = null;
        state.drag.initialComp = null;
        state.drag.initialPositions = null;
        state.drag.initialBox = null;
        state.drag.snapTargets = null;
        state.drag.rotCenter = null;
        showSnapLines([], []);
        renderScene();
      }
    });

    // Zoom mantendo fixo o ponto sob o cursor. O canvasWorld é centralizado no viewport (flex)
    // com transform-origin no centro, então o pan é relativo ao centro do viewport.
    function zoomAt(newZoom, clientX, clientY) {
      const prev = state.zoom;
      const next = Math.min(3.0, Math.max(0.2, newZoom));
      if (next === prev) return;
      const rect = viewportContainer.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2) - state.panX;
      const dy = clientY - (rect.top + rect.height / 2) - state.panY;
      state.panX += dx * (1 - next / prev);
      state.panY += dy * (1 - next / prev);
      state.zoom = next;
      updateCanvasWorldTransform();
    }

    // Botões de zoom da barra: + e − a partir do centro do viewport; 1:1 = 100% no centro; Fit enquadra.
    function zoomFromCenter(newZoom) {
      const rect = viewportContainer.getBoundingClientRect();
      zoomAt(newZoom, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    btnZoomIn.addEventListener('click', () => zoomFromCenter(state.zoom * 1.2));
    btnZoomOut.addEventListener('click', () => zoomFromCenter(state.zoom / 1.2));
    btnZoomReset.addEventListener('click', () => zoomFromCenter(1));
    btnZoomFit.addEventListener('click', fitCanvasToViewport);

