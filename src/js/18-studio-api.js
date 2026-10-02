    function toggleScriptModal(forceOpen) {
      const isCurrentlyHidden = scriptWorkbenchModal.classList.contains('hidden');
      const shouldOpen = forceOpen !== undefined ? forceOpen : isCurrentlyHidden;

      if (shouldOpen) {
        scriptWorkbenchModal.classList.remove('hidden');
        scriptCodeInput.focus();
      } else {
        scriptWorkbenchModal.classList.add('hidden');
      }
    }

    // ===== Studio API (Bancada de Scripts / console F12) =====
    const TYPE_ALIASES = {
      slot: 'Slot',
      'botão': 'Botão', botao: 'Botão', button: 'Botão', btn: 'Botão',
      barra: 'Barra', bar: 'Barra',
      painel: 'Painel', panel: 'Painel',
      texto: 'Texto', text: 'Texto', label: 'Texto',
      anel: 'Anel', ring: 'Anel', gauge: 'Anel',
      forma: 'Forma', shape: 'Forma', estrela: 'Forma', star: 'Forma'
    };
    const PROTECTED_PROPS = new Set(['id', 'icon', 'iconSrc', 'type']);

    function resolveType(type) {
      const resolved = TYPE_ALIASES[String(type || 'Slot').toLowerCase()];
      if (!resolved) throw new Error(`Tipo desconhecido / unknown type: "${type}". Use Slot, Botão, Barra, Painel, Texto, Anel.`);
      return resolved;
    }

    function applyProps(comp, props = {}) {
      Object.keys(props).forEach(key => {
        if (PROTECTED_PROPS.has(key)) throw new Error(`A propriedade "${key}" não pode ser alterada por script.`);
        comp[key] = props[key];
      });
      // Script que define o texto de um Anel (ex.: text: '' para esconder) manda no rótulo.
      if ('text' in props && !('ringShowValue' in props)) releaseRingLabel([comp]);
      comp.w = Math.max(8, Number(comp.w) || 8);
      comp.h = Math.max(8, Number(comp.h) || 8);
    }

    // Aceita: undefined (seleção atual), id, nome, objeto componente, tipo ("Botão") ou array de qualquer um deles.
    function resolveTargets(targets) {
      if (targets === undefined || targets === null) {
        const ids = state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
        return state.components.filter(c => ids.includes(c.id));
      }
      const list = Array.isArray(targets) ? targets : [targets];
      const found = [];
      list.forEach(target => {
        if (target && typeof target === 'object' && 'id' in target) {
          const live = state.components.find(c => c.id === target.id);
          if (live) found.push(live);
        } else {
          const byId = typeof target === 'number' ? state.components.find(c => c.id === target) : null;
          const byName = state.components.find(c => c.name.toLowerCase() === String(target).toLowerCase());
          if (byId || byName) found.push(byId || byName);
          else if (TYPE_ALIASES[String(target).toLowerCase()]) {
            const type = TYPE_ALIASES[String(target).toLowerCase()];
            found.push(...state.components.filter(c => c.type === type));
          }
        }
      });
      return [...new Set(found)];
    }

    function refreshAll() {
      renderLayersList();
      syncInspector();
      renderScene();
    }

    // ===== Script da seleção (R7, B2) — regras no DOCS 2.8 =====
    // Gera código Studio que recria os itens: só as props que diferem do preset do tipo, na ordem das
    // camadas, com grupos no fim. Todo valor passa por JSON.stringify, então nome ou texto malicioso
    // nunca vira código. Não mexe em state.
    const SCRIPT_ALWAYS_PROPS = new Set(['id', 'type', 'groupId', 'icon', 'iconSrc', 'name', 'x', 'y', 'w', 'h', 'text']);
    const JS_RESERVED = new Set(('break case catch class const continue debugger default delete do else export extends ' +
      'finally for function if import in instanceof let new return super switch this throw try typeof var void while ' +
      'with yield await enum implements interface package private protected public static null true false undefined ' +
      'NaN Infinity arguments eval Studio figma console ox oy').split(' '));
    const SCRIPT_ICON_MAX = 200 * 1024;

    // Preset do tipo sem gastar id (createComponentPreset incrementa nextId).
    function presetBaseline(type) {
      const savedId = state.nextId;
      const base = createComponentPreset(type);
      state.nextId = savedId;
      return base;
    }

    const roundScript = (v) => Math.round(v * 100) / 100;
    const scriptValue = (v) => (typeof v === 'number' ? String(roundScript(v)) : JSON.stringify(v));
    const sameScriptValue = (a, b) => (typeof a === 'number' && typeof b === 'number' ? roundScript(a) === roundScript(b) : a === b);

    function scriptVarName(name, used) {
      const words = foldText(name).replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
      let base = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('');
      if (!base) base = 'item';
      else if (/^[0-9]/.test(base)) base = `item${base}`;
      if (JS_RESERVED.has(base)) base += 'Item';
      let v = base, n = 2;
      while (used.has(v)) v = `${base}${n++}`;
      used.add(v);
      return v;
    }

    // Quebra a lista de props em linhas de até ~100 colunas quando não cabe numa só.
    function formatScriptProps(props, head) {
      const inline = `{ ${props.join(', ')} }`;
      if (head.length + inline.length <= 110) return inline;
      const rows = [];
      let row = '';
      props.forEach(p => {
        if (row && row.length + p.length + 2 > 96) { rows.push(row); row = ''; }
        row += (row ? ', ' : '') + p;
      });
      if (row) rows.push(row);
      return `{\n  ${rows.join(',\n  ')}\n}`;
    }

    function selectionToScript(targets, opts = {}) {
      const relative = opts.relative !== false;
      const embedIcons = opts.icons !== 'omit';
      const picked = new Set((targets == null ? state.components : targets).map(c => c.id)); // null = cena inteira
      const comps = state.components.filter(c => picked.has(c.id)); // ordem das camadas
      if (comps.length === 0) return '';

      const ox = relative ? Math.round(Math.min(...comps.map(c => c.x))) : 0;
      const oy = relative ? Math.round(Math.min(...comps.map(c => c.y))) : 0;
      const coord = (v, axis) => {
        if (!relative) return scriptValue(v);
        const d = roundScript(v - (axis === 'x' ? ox : oy));
        return `${axis === 'x' ? 'ox' : 'oy'}${d < 0 ? ` - ${-d}` : ` + ${d}`}`;
      };

      const lines = [`// ${t('Gerado pelo Game Dev UI Studio (cena {w}×{h}). {n} item(ns).', { w: state.canvasWidth, h: state.canvasHeight, n: comps.length })}`];
      if (relative) {
        lines.push(`// ${t('Mude ox/oy para recriar o conjunto em outro lugar.')}`);
        lines.push(`const ox = ${ox}, oy = ${oy};`);
      }
      lines.push('');

      const used = new Set();
      const vars = new Map();
      const baselines = new Map();
      comps.forEach(c => {
        if (!baselines.has(c.type)) baselines.set(c.type, presetBaseline(c.type));
        const base = baselines.get(c.type);
        const v = scriptVarName(c.name, used);
        vars.set(c.id, v);

        const props = [`name: ${JSON.stringify(c.name)}`, `x: ${coord(c.x, 'x')}`, `y: ${coord(c.y, 'y')}`, `w: ${scriptValue(c.w)}`, `h: ${scriptValue(c.h)}`];
        const withText = c.type !== 'Texto' && (c.text !== '' || base.text !== '');
        if (withText) props.push(`text: ${JSON.stringify(c.text)}`);
        Object.keys(COMPONENT_DEFAULTS).forEach(key => {
          if (SCRIPT_ALWAYS_PROPS.has(key)) return;
          const forced = key === 'ringShowValue' && c.type === 'Anel' && withText;
          if (forced || !sameScriptValue(c[key], base[key])) props.push(`${key}: ${scriptValue(c[key])}`);
        });

        const head = c.type === 'Texto'
          ? `const ${v} = Studio.text(${JSON.stringify(c.text)}, `
          : `const ${v} = Studio.create(${JSON.stringify(c.type)}, `;
        lines.push(`${head}${formatScriptProps(props, head)});`);

        if (c.iconSrc) {
          const kb = Math.ceil(c.iconSrc.length / 1024);
          if (embedIcons && c.iconSrc.length <= SCRIPT_ICON_MAX) lines.push(`await Studio.setIcon(${v}, ${JSON.stringify(c.iconSrc)});`);
          else lines.push(`// await Studio.setIcon(${v}, 'data:image/...'); // ${t('imagem de {kb} KB omitida', { kb })}`);
        }
      });

      const groupOrder = [];
      comps.forEach(c => { if (c.groupId && !groupOrder.includes(c.groupId)) groupOrder.push(c.groupId); });
      if (groupOrder.length) lines.push('');
      groupOrder.forEach(gid => {
        const g = state.groups.find(x => x.id === gid);
        const members = comps.filter(c => c.groupId === gid).map(c => vars.get(c.id));
        lines.push(`Studio.group([${members.join(', ')}], ${JSON.stringify(g ? g.name : t('Grupo'))});`);
      });
      return lines.join('\n') + '\n';
    }

    // Abre a Bancada com o script da seleção (ou da cena, sem seleção) no editor, sem executar.
    function openSelectionScript() {
      const selected = getSelectedComponents();
      const code = selectionToScript(selected.length ? selected : null);
      if (!code) {
        showToast('Nenhum componente para gerar script.');
        return;
      }
      toggleScriptModal(true);
      scriptCodeInput.value = code;
      scriptCodeInput.setSelectionRange(0, 0);
      scriptCodeInput.scrollTop = 0;
      showToast(selected.length
        ? t('Script de {n} item(ns) no editor. Revise e execute (Ctrl+Enter).', { n: selected.length })
        : t('Sem seleção: script da cena inteira no editor.'));
    }

    let batchDepth = 0; // Studio.batch aninhado só redesenha quando o mais externo termina

    const Studio = {
      get canvas() {
        return { width: state.canvasWidth, height: state.canvasHeight };
      },

      // Monta muita coisa de uma vez: sem redesenhar a cada peça e sem toasts; um refresh no fim.
      // Ex.: await Studio.batch(async () => { ...centenas de Studio.create... })
      async batch(fn) {
        batchDepth++;
        renderSuspended = true;
        toastMuted = true;
        try {
          return await fn();
        } finally {
          if (--batchDepth === 0) {
            renderSuspended = false;
            toastMuted = false;
            refreshAll();
          }
        }
      },

      // Troca a resolução da cena sem reposicionar os itens (as âncoras só agem na troca pelo seletor).
      setResolution(width, height) {
        const w = Math.round(Number(width)), h = Math.round(Number(height));
        if (!(w >= 16 && w <= 8192 && h >= 16 && h <= 8192)) throw new Error('Resolução fora de 16–8192 / resolution out of range.');
        applyCanvasResolution(`${w}x${h}`);
        fitCanvasToViewport();
        return { width: w, height: h };
      },

      // Idioma da interface ('pt' | 'en') e tradução inline para scripts e templates bilíngues.
      get lang() {
        return currentLang;
      },
      tr(pt, en) {
        return currentLang === 'en' && en !== undefined ? en : pt;
      },

      // Área segura da resolução atual ({ top, right, bottom, left } em px) ou null (desktop).
      get safeArea() {
        const sa = currentSafeArea();
        return sa ? { ...sa } : null;
      },

      help() {
        const pt = [
          'Studio API (alias: figma). Alvos aceitam id, nome, tipo, componente ou array; sem alvo = seleção atual.',
          '  Studio.canvas                          → { width, height }',
          '  Studio.safeArea                        → { top, right, bottom, left } do aparelho, ou null',
          '  Studio.lang / Studio.tr(pt, en)        → idioma da interface e texto no idioma certo',
          '  Studio.get(idOuNome)                   → componente ou null',
          '  Studio.getAll() / Studio.getSelected() → array de componentes',
          '  Studio.find(c => c.w > 100)            → filtra componentes',
          '  Studio.select(alvos)                   → seleciona no editor',
          '  Studio.create(tipo, props)             → cria (Slot | Botão | Barra | Painel | Texto | Anel)',
          '  Studio.text(texto, props)              → atalho para criar um Texto',
          '  await Studio.setIcon(alvos, svgOuUrl, { fit, scale, opacity }) → aplica imagem/SVG',
          '        (SVG sem <svg> em volta é desenhado 1:1 no tamanho do componente)',
          '  Studio.update(alvos, props)            → altera propriedades',
          '  Studio.updateAll(tipoOuFiltro, props)  → altera todos que casam',
          '  Studio.remove(alvos)                   → exclui',
          '  Studio.copy(alvos) / await Studio.paste() → copia e cola (+16 px, grupos novos)',
          '  await Studio.svg(alvo?)                → texto SVG vetorial do item (ou da cena, sem alvo)',
          '  Studio.toScript(alvos?, { relative, icons: "embed"|"omit" }) → código que recria os itens',
          '  await Studio.merge(alvos)              → mescla numa imagem só (Ctrl+E)',
          '  await Studio.importLayout(json)        → soma um layout salvo à cena (escala se a resolução for outra)',
          '  Studio.group(alvos, nome) / Studio.ungroup(alvo)',
          '  Studio.align(alvos, modo)              → left | right | top | bottom | centerX | centerY',
          '  Studio.distribute(alvos, "x"|"y", gap?)→ espaça igualmente (ou com gap fixo)',
          '  Studio.createGrid({ rows, cols, size, gap, x, y, type, name, props, group })',
          '  Studio.clear() / Studio.undo() / Studio.redo()',
          '  Studio.addGuide("v" | "h", px) / Studio.clearGuides()',
          'Camada: visible locked (trancado = o clique no canvas atravessa) exportStates (gera _hover/_pressed no ZIP)',
          'Props de estilo: opacity radius cornerStyle(round|chamfer) fillType gradientDir(vertical|horizontal|diagonal|radial)',
          '  fillColor1 fillColor2 fillOpacity borderStyle(solid|bevel|inset|glow|dashed|double) borderWidth borderColor bevelStrength',
          '  dropShadow shadowColor shadowOpacity shadowBlur shadowOffsetY innerShadow visible',
          'Texto: text fontFamily fontSize fontWeight textColor textAlign textVAlign letterSpacing lineHeight',
          '  textUppercase textEffect(none|shadow|glow) textStrokeWidth textStrokeColor',
          'Barra: barValue(0-100) barDirection(ltr|rtl|btt|ttb) barSegments trackColor',
          'Anel: ringValue ringThickness ringStart ringColor1 ringColor2 ringTrackColor ringGlow ringShowValue',
          'Ícone: iconFit(contain|cover|stretch|original) iconScale iconOpacity iconOffsetX iconOffsetY',
          'Forma: shapeKind(star|polygon|ellipse|arrow) shapeSides shapeInnerRatio · rotation (graus, qualquer tipo)',
          'Sombra interna: innerShadowColor innerShadowOpacity innerShadowSize innerHighlight · shadowOffsetX',
          'Textura: noise(0-1, grão) scanlines(0-1) scanlineSpacing(px, 2-32)',
          'Âncora: anchorH(left|center|right|stretch) anchorV(top|middle|bottom|stretch) · Studio.autoAnchor(alvos)'
        ];
        const en = [
          'Studio API (alias: figma). Targets accept id, name, type, component or array; no target = current selection.',
          '  Studio.canvas                          → { width, height }',
          '  Studio.safeArea                        → device { top, right, bottom, left }, or null',
          '  Studio.lang / Studio.tr(pt, en)        → UI language and text in the right language',
          '  Studio.get(idOrName)                   → component or null',
          '  Studio.getAll() / Studio.getSelected() → component array',
          '  Studio.find(c => c.w > 100)            → filter components',
          '  Studio.select(targets)                 → select in the editor',
          '  Studio.create(type, props)             → create (Slot | Button | Bar | Panel | Text | Ring)',
          '  Studio.text(content, props)            → shortcut to create a Text',
          '  await Studio.setIcon(targets, svgOrUrl, { fit, scale, opacity }) → apply image/SVG',
          '        (SVG markup without an <svg> wrapper is drawn 1:1 at the component size)',
          '  Studio.update(targets, props)          → change properties',
          '  Studio.updateAll(typeOrFilter, props)  → change every match',
          '  Studio.remove(targets)                 → delete',
          '  Studio.copy(targets) / await Studio.paste() → copy and paste (+16 px, new groups)',
          '  await Studio.svg(target?)              → vector SVG text of an item (or the scene, no target)',
          '  Studio.toScript(targets?, { relative, icons: "embed"|"omit" }) → code that recreates the items',
          '  await Studio.merge(targets)            → merge into a single image (Ctrl+E)',
          '  await Studio.importLayout(json)        → add a saved layout to the scene (scaled if resolution differs)',
          '  Studio.group(targets, name) / Studio.ungroup(target)',
          '  Studio.align(targets, mode)            → left | right | top | bottom | centerX | centerY',
          '  Studio.distribute(targets, "x"|"y", gap?) → even spacing (or fixed gap)',
          '  Studio.createGrid({ rows, cols, size, gap, x, y, type, name, props, group })',
          '  Studio.clear() / Studio.undo() / Studio.redo()',
          '  Studio.addGuide("v" | "h", px) / Studio.clearGuides()',
          'Layer: visible locked (locked = canvas clicks pass through) exportStates (adds _hover/_pressed to the ZIP)',
          'Style props: opacity radius cornerStyle(round|chamfer) fillType gradientDir(vertical|horizontal|diagonal|radial)',
          '  fillColor1 fillColor2 fillOpacity borderStyle(solid|bevel|inset|glow|dashed|double) borderWidth borderColor bevelStrength',
          '  dropShadow shadowColor shadowOpacity shadowBlur shadowOffsetY innerShadow visible',
          'Text: text fontFamily fontSize fontWeight textColor textAlign textVAlign letterSpacing lineHeight',
          '  textUppercase textEffect(none|shadow|glow) textStrokeWidth textStrokeColor',
          'Bar: barValue(0-100) barDirection(ltr|rtl|btt|ttb) barSegments trackColor',
          'Ring: ringValue ringThickness ringStart ringColor1 ringColor2 ringTrackColor ringGlow ringShowValue',
          'Icon: iconFit(contain|cover|stretch|original) iconScale iconOpacity iconOffsetX iconOffsetY',
          'Shape: shapeKind(star|polygon|ellipse|arrow) shapeSides shapeInnerRatio · rotation (degrees, any type)',
          'Inner shadow: innerShadowColor innerShadowOpacity innerShadowSize innerHighlight · shadowOffsetX',
          'Texture: noise(0-1, grain) scanlines(0-1) scanlineSpacing(px, 2-32)',
          'Anchor: anchorH(left|center|right|stretch) anchorV(top|middle|bottom|stretch) · Studio.autoAnchor(targets)'
        ];
        const text = (currentLang === 'en' ? en : pt).join('\n');
        appendScriptLog('log', [text]);
        console.log(text);
      },

      get(idOrName) {
        return resolveTargets(idOrName)[0] || null;
      },
      getAll() {
        return [...state.components];
      },
      getSelected() {
        return resolveTargets();
      },
      find(predicate) {
        return state.components.filter(predicate);
      },

      select(targets) {
        const comps = resolveTargets(targets);
        state.selectedIds = comps.map(c => c.id);
        state.selectedId = comps.length > 0 ? comps[comps.length - 1].id : null;
        refreshAll();
        return comps;
      },

      create(type = 'Slot', props = {}) {
        const comp = createComponentPreset(resolveType(type));
        applyProps(comp, props);
        // Sempre no topo da pilha: a ordem de criação do script é a ordem das camadas.
        state.components.push(comp);
        state.selectedId = comp.id;
        state.selectedIds = [comp.id];
        refreshAll();
        return comp;
      },

      text(content, props = {}) {
        return Studio.create('Texto', { ...props, text: String(content) });
      },

      // Aplica imagem ao(s) componente(s). Aceita URL/dataURL, um <svg> completo, ou só o miolo do SVG
      // (<path/>, <text/>...): nesse caso o SVG é montado no tamanho exato do componente e desenhado 1:1.
      async setIcon(targets, src, opts = {}) {
        const comps = resolveTargets(targets);
        await Promise.all(comps.map(comp => new Promise((resolve, reject) => {
          let uri = String(src || '').trim();
          let wrapped = false;
          if (uri.startsWith('<')) {
            let markup = uri;
            if (!/^<svg[\s>]/i.test(markup)) {
              markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${comp.w}" height="${comp.h}" viewBox="0 0 ${comp.w} ${comp.h}" fill="none">${markup}</svg>`;
              wrapped = true;
            } else if (!/xmlns=/.test(markup)) {
              markup = markup.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
          }
          const img = new Image();
          img.onload = () => {
            comp.icon = img;
            comp.iconSrc = uri;
            comp.iconFit = opts.fit || (wrapped ? 'stretch' : comp.iconFit);
            comp.iconScale = opts.scale !== undefined ? opts.scale : (wrapped ? 1 : comp.iconScale);
            comp.iconOpacity = opts.opacity !== undefined ? opts.opacity : (wrapped ? 1 : comp.iconOpacity);
            resolve(comp);
          };
          img.onerror = () => reject(new Error(`Imagem inválida / invalid image em "${comp.name}"`));
          img.src = uri;
        })));
        refreshAll();
        return comps;
      },

      update(targets, props = {}) {
        const comps = resolveTargets(targets);
        comps.forEach(c => applyProps(c, props));
        refreshAll();
        return comps;
      },

      updateAll(filter, props) {
        if (props === undefined) {
          props = filter;
          filter = null;
        }
        let comps;
        if (!filter) comps = [...state.components];
        else if (typeof filter === 'function') comps = state.components.filter(filter);
        else comps = resolveTargets(filter);
        comps.forEach(c => applyProps(c, props));
        refreshAll();
        return comps;
      },

      remove(targets) {
        const ids = new Set(resolveTargets(targets).map(c => c.id));
        state.components = state.components.filter(c => !ids.has(c.id));
        pruneEmptyGroups();
        state.selectedIds = state.selectedIds.filter(id => !ids.has(id));
        if (ids.has(state.selectedId)) state.selectedId = null;
        refreshAll();
        return ids.size;
      },

      // Guarda na reserva interna (o clipboard do sistema só é gravado por Ctrl+C, que é um gesto do usuário).
      copy(targets) {
        const payload = buildClipboardPayload(resolveTargets(targets));
        if (!payload) throw new Error('Nenhum componente para copiar.');
        clipboardMemory = payload;
        return payload.components.length;
      },

      async paste() {
        if (!clipboardMemory) throw new Error('Nada copiado. Use Studio.copy(alvos) antes.');
        return pasteComponents(clipboardMemory);
      },

      // Texto do SVG vetorial: com alvo = um item (recorte igual ao PNG); sem alvo = a cena inteira.
      async svg(target) {
        if (target === undefined) {
          await ensureFontsReady(state.components);
          return sceneSvgString(exportScale());
        }
        const comp = resolveTargets(target)[0];
        if (!comp) throw new Error('Componente não encontrado.');
        await ensureFontsReady([comp]);
        return componentSvgString(comp, exportScale());
      },

      group(targets, name) {
        const comps = resolveTargets(targets);
        if (comps.length === 0) throw new Error('Nenhum componente para agrupar.');
        state.selectedIds = comps.map(c => c.id);
        state.selectedId = comps[comps.length - 1].id;
        return groupSelectedComponents(name);
      },

      ungroup(target) {
        if (typeof target === 'number' && state.groups.some(g => g.id === target)) {
          ungroupComponents(target);
          return;
        }
        const comp = resolveTargets(target)[0];
        if (comp && comp.groupId) ungroupComponents(comp.groupId);
      },

      // Com um único alvo, alinha em relação ao canvas.
      align(targets, mode = 'left') {
        const comps = resolveTargets(targets);
        if (comps.length === 0) return comps;
        let box;
        if (comps.length === 1) {
          box = { x: 0, y: 0, w: state.canvasWidth, h: state.canvasHeight };
        } else {
          const minX = Math.min(...comps.map(c => c.x));
          const minY = Math.min(...comps.map(c => c.y));
          const maxX = Math.max(...comps.map(c => c.x + c.w));
          const maxY = Math.max(...comps.map(c => c.y + c.h));
          box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
        comps.forEach(c => {
          if (mode === 'left') c.x = box.x;
          else if (mode === 'right') c.x = box.x + box.w - c.w;
          else if (mode === 'top') c.y = box.y;
          else if (mode === 'bottom') c.y = box.y + box.h - c.h;
          else if (mode === 'centerX') c.x = Math.round(box.x + (box.w - c.w) / 2);
          else if (mode === 'centerY') c.y = Math.round(box.y + (box.h - c.h) / 2);
          else throw new Error(`Modo de alinhamento inválido: "${mode}".`);
        });
        refreshAll();
        return comps;
      },

      distribute(targets, axis = 'x', gap) {
        const comps = resolveTargets(targets);
        if (comps.length < 2) return comps;
        const pos = axis === 'y' ? 'y' : 'x';
        const size = pos === 'x' ? 'w' : 'h';
        const sorted = [...comps].sort((a, b) => a[pos] - b[pos]);
        let spacing = gap;
        if (spacing === undefined) {
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const totalSize = sorted.reduce((sum, c) => sum + c[size], 0);
          spacing = (last[pos] + last[size] - first[pos] - totalSize) / (sorted.length - 1);
        }
        let cursor = sorted[0][pos];
        sorted.forEach(c => {
          c[pos] = Math.round(cursor);
          cursor += c[size] + spacing;
        });
        refreshAll();
        return sorted;
      },

      createGrid(opts = {}) {
        const rows = opts.rows || 4;
        const cols = opts.cols || 4;
        const w = opts.w || opts.size || 96;
        const h = opts.h || opts.size || 96;
        const gap = opts.gap !== undefined ? opts.gap : 12;
        const type = resolveType(opts.type || 'Slot');
        const baseName = opts.name || type;
        const gridW = cols * w + (cols - 1) * gap;
        const gridH = rows * h + (rows - 1) * gap;
        const startX = opts.x !== undefined ? opts.x : Math.round((state.canvasWidth - gridW) / 2);
        const startY = opts.y !== undefined ? opts.y : Math.round((state.canvasHeight - gridH) / 2);

        const created = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const comp = createComponentPreset(type);
            applyProps(comp, {
              ...(opts.props || {}),
              name: `${baseName} ${created.length + 1}`,
              x: startX + c * (w + gap),
              y: startY + r * (h + gap),
              w,
              h
            });
            state.components.push(comp);
            created.push(comp);
          }
        }

        state.selectedIds = created.map(c => c.id);
        state.selectedId = created[created.length - 1].id;
        if (opts.group !== false) {
          groupSelectedComponents(typeof opts.group === 'string' ? opts.group : `${baseName} ${rows}x${cols}`);
        } else {
          refreshAll();
        }
        return created;
      },

      clear() {
        state.components = [];
        state.groups = [];
        state.selectedId = null;
        state.selectedIds = [];
        refreshAll();
      },

      addGuide(axis, pos) {
        const guide = { id: state.nextGuideId++, axis: axis === 'h' || axis === 'y' ? 'h' : 'v', pos: Math.round(pos) };
        state.guides.push(guide);
        renderGuides();
        renderScene();
        return guide;
      },

      clearGuides() {
        state.guides = [];
        renderGuides();
        renderScene();
      },

      // Âncora pela posição na cena (terços; >80% do eixo = esticar), como o botão Auto.
      autoAnchor(targets) {
        const comps = resolveTargets(targets);
        comps.forEach(autoAnchor);
        refreshAll();
        return comps.map(c => ({ name: c.name, anchorH: c.anchorH, anchorV: c.anchorV }));
      },

      // Código Studio que recria os alvos (padrão: seleção; sem seleção, a cena). DOCS 2.8.
      toScript(targets, opts = {}) {
        if (targets === undefined) {
          const selected = resolveTargets();
          return selectionToScript(selected.length ? selected : null, opts);
        }
        return selectionToScript(resolveTargets(targets), opts);
      },

      // Mescla os alvos (padrão: seleção) numa imagem só, como o Ctrl+E.
      async merge(targets) {
        return mergeSelection(targets === undefined ? undefined : resolveTargets(targets));
      },

      // Soma um layout (objeto do .json salvo) à cena atual, escalando se a resolução for outra.
      async importLayout(data) {
        const result = await importLayoutIntoScene(JSON.parse(JSON.stringify(data)));
        if (!result) throw new Error('Layout inválido / invalid layout.');
        return result.added;
      },

      undo() { undo(); },
      redo() { redo(); }
    };

    window.Studio = Studio;
    window.figma = Studio;

