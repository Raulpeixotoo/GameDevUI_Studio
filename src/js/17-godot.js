    // ---- Godot 4: cena .tscn (texto) montada a partir do export ----
    // A pasta GODOT_DIR vai na raiz do projeto Godot; a cena referencia as texturas por res://.
    const GODOT_DIR = 'GameUI_Godot';
    const GODOT_RES = `res://${GODOT_DIR}/`;
    const GODOT_FILL_MODE = { ltr: 0, rtl: 1, ttb: 2, btt: 3 };
    const GODOT_H_ALIGN = { left: 0, center: 1, right: 2 };
    const GODOT_V_ALIGN = { top: 0, middle: 1, bottom: 2 };

    const gdFloat = (v) => { const n = Math.round(v * 10000) / 10000; return Number.isInteger(n) ? `${n}.0` : String(n); };
    const gdString = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    function gdColor(hex, alpha = 1) {
      let c = String(hex || '#000000').replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c.slice(0, 6), 16) || 0;
      const ch = (shift) => gdFloat(((num >> shift) & 255) / 255);
      return `Color(${ch(16)}, ${ch(8)}, ${ch(0)}, ${gdFloat(alpha)})`;
    }

    function godotNodeType(comp) {
      switch (comp.type) {
        case 'Botão': return 'Button';
        case 'Barra': return 'TextureProgressBar';
        case 'Anel': case 'Forma': return 'TextureRect';
        // Texto fora do PNG não tem textura útil: vira só um Control com o Label dentro.
        case 'Texto': return comp.text && comp.exportWithText === false ? 'Control' : 'TextureRect';
        default: return 'NinePatchRect';
      }
    }

    // Bloco godotSettings do manifest. A opacidade já está no PNG, por isso não há modulate.
    // scale: tudo em px da resolução de saída (slice já vem calculado na mesma escala).
    function describeGodot(comp, slice, scale = 1) {
      const node = godotNodeType(comp);
      const tex = slice.texture;
      const sliced = node === 'NinePatchRect' || node === 'Button' || node === 'TextureProgressBar';
      return {
        node,
        patchMargin: sliced ? { left: tex.left, top: tex.top, right: tex.right, bottom: tex.bottom } : null,
        position: { x: Math.round(comp.x * scale) - slice.pad, y: Math.round(comp.y * scale) - slice.pad },
        size: { x: slice.textureWidth, y: slice.textureHeight },
        // Godot: rotação positiva é horária (Y para baixo), igual ao Studio.
        rotationRadians: comp.rotation ? +(comp.rotation * Math.PI / 180).toFixed(6) : 0,
        pivotOffset: { x: slice.textureWidth / 2, y: slice.textureHeight / 2 },
        fillMode: comp.type === 'Barra' ? GODOT_FILL_MODE[comp.barDirection] ?? 0 : null,
        label: !!(componentLabel(comp) && comp.exportWithText === false)
      };
    }

    // Multiplicador de RGB dos estados gerados no export (R5).
    const STATE_BRIGHTNESS = { hover: 1.15, pressed: 0.8 };

    // Ícone raster desenhado maior que o arquivo original nesta resolução: vai borrar (SVG não sofre disso).
    function iconUpscaleWarning(comp, scale) {
      if (scale <= 1 || !comp.icon || comp.exportWithIcon === false) return null;
      if (String(comp.iconSrc || '').startsWith('data:image/svg')) return null;
      const have = Math.max(comp.icon.naturalWidth || 0, comp.icon.naturalHeight || 0);
      if (!have) return null;
      const need = comp.iconFit === 'original'
        ? have * scale
        : Math.max(comp.w, comp.h) * (comp.iconScale ?? 1) * scale;
      if (need <= have * 1.05) return null;
      return `Ícone de ${have}px ampliado para ~${Math.round(need)}px nesta resolução: pode ficar borrado. Use SVG ou uma imagem maior.`;
    }

    // Margens na ordem/nomes de outras engines comuns entre indies (todas em px da textura).
    function describeOtherEngines(slice) {
      const t = slice.texture;
      return {
        gameMaker: { nineSlice: { left: t.left, top: t.top, right: t.right, bottom: t.bottom } },
        defold: { slice9: [t.left, t.top, t.right, t.bottom] },
        phaser: { leftWidth: t.left, rightWidth: t.right, topHeight: t.top, bottomHeight: t.bottom }
      };
    }

    // entries: [{ comp, slice, godot, file, scale, trackFile?, fillFile?, hoverFile?, pressedFile? }] na ordem das camadas.
    // A Godot desenha na ordem da árvore, então os nós saem na ordem de state.components
    // e os grupos do Studio viram grupos da Godot (não nós pais, que mudariam a ordem).
    function buildGodotScene(entries) {
      const ext = [];
      const subs = [];
      const nodes = [];
      const texIds = new Map();
      const texture = (file) => {
        if (!texIds.has(file)) {
          const id = `${texIds.size + 1}_tex`;
          texIds.set(file, id);
          ext.push(`[ext_resource type="Texture2D" path="${GODOT_RES}${file}" id="${id}"]`);
        }
        return `ExtResource("${texIds.get(file)}")`;
      };
      const subResource = (type, props) => {
        const id = `${type}_${subs.length + 1}`;
        subs.push([`[sub_resource type="${type}" id="${id}"]`, ...props].join('\n'));
        return `SubResource("${id}")`;
      };
      const margins = (prefix, m, fmt = String) => ['left', 'top', 'right', 'bottom'].map(side => `${prefix}${side} = ${fmt(m[side])}`);

      nodes.push([
        '[node name="GameUI" type="Control"]',
        'layout_mode = 3', 'anchors_preset = 15', 'anchor_right = 1.0', 'anchor_bottom = 1.0',
        'grow_horizontal = 2', 'grow_vertical = 2', 'mouse_filter = 2'
      ].join('\n'));

      const usedNames = new Set();
      let focusNone = null;
      for (const { comp, slice, godot, file, scale = 1, trackFile, fillFile, hoverFile, pressedFile, anchors } of entries) {
        // Nome de nó não aceita . : @ / " % e precisa ser único entre irmãos.
        let name = String(comp.name || '').replace(/[.:@\/"%]/g, '_').trim() || `Item_${comp.id}`;
        if (usedNames.has(name)) name = `${name}_${comp.id}`;
        usedNames.add(name);

        const group = comp.groupId != null ? state.groups.find(g => g.id === comp.groupId) : null;
        const header = `[node name=${gdString(name)} type="${godot.node}" parent="."${group ? ` groups=[${gdString(group.name)}]` : ''}]`;
        // Âncoras (R8): fora do padrão esquerda/topo, o nó usa layout por âncoras; direita/base crescem para o início.
        const anchored = anchors && (comp.anchorH !== 'left' || comp.anchorV !== 'top');
        const grow = (mode) => (mode === 'right' || mode === 'bottom' ? 0 : mode === 'left' || mode === 'top' ? 1 : 2);
        const props = anchored ? [
          'layout_mode = 1',
          `anchor_left = ${gdFloat(anchors.godot.anchor_left)}`, `anchor_top = ${gdFloat(anchors.godot.anchor_top)}`,
          `anchor_right = ${gdFloat(anchors.godot.anchor_right)}`, `anchor_bottom = ${gdFloat(anchors.godot.anchor_bottom)}`,
          `offset_left = ${gdFloat(anchors.godot.offset_left)}`, `offset_top = ${gdFloat(anchors.godot.offset_top)}`,
          `offset_right = ${gdFloat(anchors.godot.offset_right)}`, `offset_bottom = ${gdFloat(anchors.godot.offset_bottom)}`,
          `grow_horizontal = ${grow(comp.anchorH)}`, `grow_vertical = ${grow(comp.anchorV)}`
        ] : [
          'layout_mode = 0',
          `offset_left = ${gdFloat(godot.position.x)}`,
          `offset_top = ${gdFloat(godot.position.y)}`,
          `offset_right = ${gdFloat(godot.position.x + godot.size.x)}`,
          `offset_bottom = ${gdFloat(godot.position.y + godot.size.y)}`
        ];
        if (godot.rotationRadians) {
          props.push(`rotation = ${gdFloat(godot.rotationRadians)}`);
          props.push(`pivot_offset = Vector2(${gdFloat(godot.pivotOffset.x)}, ${gdFloat(godot.pivotOffset.y)})`);
        }
        if (comp.visible === false) props.push('visible = false');
        // HUD decorativo não deve engolir cliques; só o Button recebe mouse.
        if (godot.node !== 'Button') props.push('mouse_filter = 2');

        if (godot.node === 'NinePatchRect') {
          props.push(`texture = ${texture(file)}`, ...margins('patch_margin_', godot.patchMargin));
        } else if (godot.node === 'TextureRect') {
          props.push(`texture = ${texture(file)}`);
        } else if (godot.node === 'Button') {
          // Um StyleBox por estado; sem as variações geradas, os três usam a textura normal.
          const box = (f) => subResource('StyleBoxTexture', [`texture = ${texture(f)}`, ...margins('texture_margin_', godot.patchMargin, gdFloat)]);
          const normal = box(file);
          const hover = hoverFile ? box(hoverFile) : normal;
          const pressed = pressedFile ? box(pressedFile) : normal;
          focusNone = focusNone || subResource('StyleBoxEmpty', []);
          props.push(`theme_override_styles/normal = ${normal}`, `theme_override_styles/hover = ${hover}`,
            `theme_override_styles/pressed = ${pressed}`, `theme_override_styles/focus = ${focusNone}`);
        } else if (godot.node === 'TextureProgressBar') {
          props.push(`value = ${gdFloat(comp.barValue ?? 100)}`, `fill_mode = ${godot.fillMode}`, 'nine_patch_stretch = true',
            ...margins('stretch_margin_', godot.patchMargin),
            `texture_under = ${texture(trackFile)}`, `texture_progress = ${texture(fillFile)}`);
        }
        nodes.push([header, ...props].join('\n'));

        // Texto fora do PNG: Label filho ocupando a área do componente (sem o padding da textura).
        if (godot.label) {
          const txt = describeText(comp, scale);
          const label = [
            `[node name="Label" type="Label" parent=${gdString(name)}]`,
            'layout_mode = 0',
            `offset_left = ${gdFloat(slice.pad)}`, `offset_top = ${gdFloat(slice.pad)}`,
            `offset_right = ${gdFloat(slice.pad + Math.round(comp.w * scale))}`, `offset_bottom = ${gdFloat(slice.pad + Math.round(comp.h * scale))}`,
            `theme_override_colors/font_color = ${gdColor(txt.color)}`,
            `theme_override_font_sizes/font_size = ${Math.round(txt.fontSize)}`,
            `text = ${gdString(txt.content)}`,
            `horizontal_alignment = ${GODOT_H_ALIGN[txt.align] ?? 1}`,
            `vertical_alignment = ${GODOT_V_ALIGN[txt.verticalAlign] ?? 1}`,
            'autowrap_mode = 3'
          ];
          if (txt.outline) {
            // strokeText do Studio usa o dobro da largura (metade fica por dentro); outline_size é a espessura total.
            label.splice(8, 0, `theme_override_colors/font_outline_color = ${gdColor(txt.outline.color)}`,
              `theme_override_constants/outline_size = ${Math.round(txt.outline.width * 2)}`);
          }
          nodes.push(label.join('\n'));
        }
      }

      const sections = [`[gd_scene load_steps=${ext.length + subs.length + 1} format=3]`];
      if (ext.length) sections.push(ext.join('\n'));
      sections.push(...subs, ...nodes);
      return sections.join('\n\n') + '\n';
    }

    // ---- Tema da Godot (R7) ----
    // Cada Botão vira uma "type variation" de Button (normal/hover/pressed) e cada Painel/Slot uma de
    // PanelContainer, com StyleBoxTexture 9-slice. expand_margin = padding transparente do PNG, então a
    // moldura cobre exatamente o retângulo do Control. Uso na Godot: Theme = game_ui_theme.tres no nó
    // raiz; em cada Button/PanelContainer, Theme Type Variation = nome listado no manifest.
    function buildGodotTheme(entries) {
      const ext = [], subs = [], props = [], variations = [];
      const texIds = new Map();
      const texture = (file) => {
        if (!texIds.has(file)) {
          const id = `${texIds.size + 1}_tex`;
          texIds.set(file, id);
          ext.push(`[ext_resource type="Texture2D" path="${GODOT_RES}${file}" id="${id}"]`);
        }
        return `ExtResource("${texIds.get(file)}")`;
      };
      const sides = ['left', 'top', 'right', 'bottom'];
      const used = new Set();
      let focusNone = null;

      for (const { comp, slice, godot, file, scale = 1, hoverFile, pressedFile } of entries) {
        const base = godot.node === 'Button' ? 'Button' : godot.node === 'NinePatchRect' ? 'PanelContainer' : null;
        if (!base) continue;
        const slug = foldText(comp.name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `item_${comp.id}`;
        let name = `${base === 'Button' ? 'Btn' : 'Panel'}_${slug}`;
        if (used.has(name)) name = `${name}_${comp.id}`;
        used.add(name);

        const box = (f) => {
          const id = `StyleBoxTexture_${subs.length + 1}`;
          subs.push([`[sub_resource type="StyleBoxTexture" id="${id}"]`, `texture = ${texture(f)}`,
            ...sides.map(s => `texture_margin_${s} = ${gdFloat(godot.patchMargin[s])}`),
            ...sides.map(s => `expand_margin_${s} = ${gdFloat(slice.pad)}`)].join('\n'));
          return `SubResource("${id}")`;
        };

        props.push(`${name}/base_type = &"${base}"`);
        if (base === 'Button') {
          const normal = box(file);
          if (!focusNone) {
            focusNone = 'StyleBoxEmpty_focus';
            subs.push(`[sub_resource type="StyleBoxEmpty" id="${focusNone}"]`);
          }
          props.push(`${name}/styles/normal = ${normal}`,
            `${name}/styles/hover = ${hoverFile ? box(hoverFile) : normal}`,
            `${name}/styles/pressed = ${pressedFile ? box(pressedFile) : normal}`,
            `${name}/styles/focus = SubResource("${focusNone}")`);
          if (godot.label) {
            const txt = describeText(comp, scale);
            props.push(`${name}/colors/font_color = ${gdColor(txt.color)}`, `${name}/font_sizes/font_size = ${Math.round(txt.fontSize)}`);
          }
        } else {
          props.push(`${name}/styles/panel = ${box(file)}`);
        }
        variations.push({ name, baseType: base, component: comp.name });
      }
      if (!variations.length) return null;
      const text = [`[gd_resource type="Theme" load_steps=${ext.length + subs.length + 1} format=3]`,
        ext.join('\n'), ...subs, ['[resource]', ...props].join('\n')].filter(Boolean).join('\n\n') + '\n';
      return { text, variations };
    }

    btnExportBatch.addEventListener('click', async () => {
      if (state.components.length === 0) {
        showToast('Nenhum componente para exportar!');
        return;
      }

      showToast('Compactando ZIP com metadados para Unity, Unreal e Godot...');
      await ensureFontsReady(state.components);
      // Tudo sai em px da resolução de saída (R5): posições, tamanhos, margens, padding e fontes.
      const scale = exportScale();
      const px = (v) => Math.round(v * scale);
      const outW = px(state.canvasWidth), outH = px(state.canvasHeight);
      const zip = new JSZip();
      const folder = zip.folder("GameUI_1080p_Assets");
      const framesOnlyFolder = zip.folder("Frames_Only_NoIcons");
      const godotFolder = zip.folder(GODOT_DIR);
      const svgFolder = zip.folder("SVG"); // vetor, para sites (R5)
      const godotEntries = [];
      let barsFolder = null;

      // v6 (R7): orientação, área segura e Canvas Scaler, para cenas mobile.
      const portrait = state.canvasHeight > state.canvasWidth;
      const safe = currentSafeArea();
      const manifest = {
        project: "Game Dev UI Studio Export",
        manifestVersion: 6,
        resolution: { width: outW, height: outH },
        designResolution: { width: state.canvasWidth, height: state.canvasHeight },
        orientation: portrait ? 'portrait' : 'landscape',
        safeArea: safe ? { top: px(safe.top), right: px(safe.right), bottom: px(safe.bottom), left: px(safe.left) } : null,
        exportScale: +scale.toFixed(4),
        exportPadding: px(EXPORT_PAD),
        engineReady: true,
        // Canvas Scaler do Unity: retrato casa a largura (0), paisagem casa a altura (1).
        unityCanvasScaler: {
          uiScaleMode: 'ScaleWithScreenSize',
          referenceResolution: { x: outW, y: outH },
          screenMatchMode: 'MatchWidthOrHeight',
          matchWidthOrHeight: portrait ? 0 : 1
        },
        godot: {
          folder: GODOT_DIR,
          scene: `${GODOT_DIR}/game_ui.tscn`,
          resPath: `${GODOT_RES}game_ui.tscn`,
          projectSettings: {
            'display/window/size/viewport_width': outW,
            'display/window/size/viewport_height': outH,
            'display/window/stretch/mode': 'canvas_items',
            'display/window/stretch/aspect': portrait ? 'keep_width' : 'keep',
            // 0 = paisagem, 1 = retrato (enum de display/window/handheld/orientation)
            'display/window/handheld/orientation': portrait ? 1 : 0
          }
        },
        assets: []
      };

      const usedNames = new Set();
      for (const comp of state.components) {
        // Nomes iguais sobrescreviam arquivos dentro do ZIP; agora recebem sufixo com o id.
        let safeName = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `item_${comp.id}`;
        if (usedNames.has(safeName)) safeName = `${safeName}_${comp.id}`;
        usedNames.add(safeName);

        const blobWithIcon = await renderSingleComponentToBlob(comp, scale, false);
        const fileName = `${safeName}.png`;
        folder.file(fileName, blobWithIcon);

        const blobClean = await renderSingleComponentToBlob(comp, scale, true);
        framesOnlyFolder.file(`${safeName}_frame.png`, blobClean);
        svgFolder.file(`${safeName}.svg`, componentSvgString(comp, scale));

        const slice = computeNineSlice(comp, scale);
        const tex = slice.texture;
        const edge = slice.component;

        const asset = {
          name: comp.name,
          type: comp.type,
          file: fileName,
          frameFile: `${safeName}_frame.png`,
          svgFile: `${safeName}.svg`,
          dimensions: { width: px(comp.w), height: px(comp.h) },
          textureSize: { width: slice.textureWidth, height: slice.textureHeight },
          // Nome mantido da v4; o valor está na resolução de saída (manifest.resolution).
          positionIn1080pScene: { x: px(comp.x), y: px(comp.y) },
          texturePositionInScene: { x: px(comp.x) - slice.pad, y: px(comp.y) - slice.pad },
          opacity: comp.opacity,
          nineSlice: tex,
          nineSliceFromComponentEdge: { left: px(edge.left), right: px(edge.right), top: px(edge.top), bottom: px(edge.bottom) },
          unitySettings: {
            textureType: "Sprite (2D and UI)",
            spriteMode: "Single",
            meshType: "FullRect",
            imageType: "Sliced",
            // Vector4 do Unity segue a ordem (Left, Bottom, Right, Top).
            spriteBorder: { x: tex.left, y: tex.bottom, z: tex.right, w: tex.top },
            spriteBorderLBRT: `${tex.left}, ${tex.bottom}, ${tex.right}, ${tex.top}`
          },
          unrealSettings: {
            drawAs: "Box",
            imageSize: { x: slice.textureWidth, y: slice.textureHeight },
            // FMargin do Slate Brush é fração (0..1) do tamanho da textura em cada eixo.
            margin: {
              left: +(tex.left / slice.textureWidth).toFixed(4),
              top: +(tex.top / slice.textureHeight).toFixed(4),
              right: +(tex.right / slice.textureWidth).toFixed(4),
              bottom: +(tex.bottom / slice.textureHeight).toFixed(4)
            }
          },
          godotSettings: describeGodot(comp, slice, scale),
          engines: describeOtherEngines(slice),
          anchors: null, // preenchido logo abaixo (precisa do retângulo da textura da Godot)
          text: describeText(comp, scale),
          // Unity: Z positivo é anti-horário, por isso o sinal invertido. UMG: Angle positivo é horário.
          rotation: comp.rotation ? { degrees: comp.rotation, unityRotationZ: -comp.rotation, unrealAngle: comp.rotation } : null,
          shape: comp.type === 'Forma' ? { kind: comp.shapeKind, sides: comp.shapeSides, innerRatio: comp.shapeInnerRatio } : null,
          warnings: getNineSliceWarnings(comp, slice)
        };
        const blurWarning = iconUpscaleWarning(comp, scale);
        if (blurWarning) asset.warnings.push(blurWarning);
        const gs = asset.godotSettings;
        asset.anchors = describeAnchors(comp, { x: px(comp.x), y: px(comp.y), w: px(comp.w), h: px(comp.h) },
          { x: gs.position.x, y: gs.position.y, w: gs.size.x, h: gs.size.y }, outW, outH);

        // Estados hover/pressed (R5): mesma geometria e margens, só o brilho muda.
        let hoverFile = null, pressedFile = null;
        if (comp.exportStates) {
          hoverFile = `${safeName}_hover.png`;
          pressedFile = `${safeName}_pressed.png`;
          const hoverBlob = await renderSingleComponentToBlob(comp, scale, false, STATE_BRIGHTNESS.hover);
          const pressedBlob = await renderSingleComponentToBlob(comp, scale, false, STATE_BRIGHTNESS.pressed);
          folder.file(hoverFile, hoverBlob);
          folder.file(pressedFile, pressedBlob);
          if (asset.godotSettings.node === 'Button') {
            godotFolder.file(hoverFile, hoverBlob);
            godotFolder.file(pressedFile, pressedBlob);
          }
          asset.states = { hover: hoverFile, pressed: pressedFile, brightness: { ...STATE_BRIGHTNESS } };
          Object.assign(asset.unitySettings, { transition: 'SpriteSwap', highlightedSprite: hoverFile, pressedSprite: pressedFile });
          asset.unrealSettings.buttonStyle = { normal: fileName, hovered: hoverFile, pressed: pressedFile };
        }

        // Barra: exporta trilho vazio e preenchimento cheio separados, prontos para
        // Image Type "Filled" no Unity ou ProgressBar (Background/Fill) no Unreal.
        if (comp.type === 'Barra') {
          barsFolder = barsFolder || zip.folder("Bars_Track_And_Fill");
          const trackBlob = await renderSingleComponentToBlob({ ...comp, barValue: 0 }, scale, true);
          const fillBlob = await renderSingleComponentToBlob({ ...comp, barValue: 100, dropShadow: false, borderWidth: 0 }, scale, true);
          barsFolder.file(`${safeName}_track.png`, trackBlob);
          barsFolder.file(`${safeName}_fill.png`, fillBlob);
          godotFolder.file(`${safeName}_track.png`, trackBlob);
          godotFolder.file(`${safeName}_fill.png`, fillBlob);
          asset.bar = {
            value: comp.barValue,
            direction: comp.barDirection,
            segments: comp.barSegments,
            trackFile: `${safeName}_track.png`,
            fillFile: `${safeName}_fill.png`,
            unity: { imageType: "Filled", fillMethod: comp.barDirection === 'btt' || comp.barDirection === 'ttb' ? "Vertical" : "Horizontal", fillAmount: comp.barValue / 100 },
            unreal: { widget: "ProgressBar", percent: comp.barValue / 100 }
          };
        }

        if (comp.type === 'Anel') {
          asset.ring = {
            value: comp.ringValue,
            startAngle: comp.ringStart,
            thickness: px(comp.ringThickness),
            colors: [comp.ringColor1, comp.ringColor2],
            unity: { imageType: "Filled", fillMethod: "Radial360", fillAmount: comp.ringValue / 100 }
          };
        }

        manifest.assets.push(asset);

        // Godot: a pasta leva só as texturas que a cena usa (a Barra usa trilho + preenchimento).
        if (!asset.bar && asset.godotSettings.node !== 'Control') godotFolder.file(fileName, blobWithIcon);
        godotEntries.push({
          comp, slice, scale, godot: asset.godotSettings, file: fileName, anchors: asset.anchors,
          trackFile: asset.bar?.trackFile, fillFile: asset.bar?.fillFile, hoverFile, pressedFile
        });
      }

      const theme = buildGodotTheme(godotEntries);
      if (theme) {
        godotFolder.file('game_ui_theme.tres', theme.text);
        manifest.godot.theme = { file: `${GODOT_DIR}/game_ui_theme.tres`, resPath: `${GODOT_RES}game_ui_theme.tres`, typeVariations: theme.variations };
      }
      folder.file("ui_engine_manifest.json", JSON.stringify(manifest, null, 2));
      godotFolder.file('game_ui.tscn', buildGodotScene(godotEntries));

      zip.generateAsync({ type: "blob" }).then((content) => {
        downloadBlob(content, `GameUI_Batch_${outW}x${outH}.zip`);
        showToast('Download do ZIP concluído!');
      });
    });

    btnCopyJSON.addEventListener('click', () => {
      const comp = getSelectedComponent();
      if (!comp) return;

      // Mesma resolução de saída escolhida para os exports.
      const scale = exportScale();
      const px = (v) => Math.round(v * scale);
      const slice = computeNineSlice(comp, scale);
      const edge = slice.component;
      const metadata = {
        name: comp.name,
        type: comp.type,
        resolution: `${px(state.canvasWidth)}x${px(state.canvasHeight)}`,
        exportScale: +scale.toFixed(4),
        dimensions: { width: px(comp.w), height: px(comp.h) },
        textureSize: { width: slice.textureWidth, height: slice.textureHeight },
        exportPadding: slice.pad,
        nineSliceMargins: slice.texture,
        nineSliceFromComponentEdge: { left: px(edge.left), right: px(edge.right), top: px(edge.top), bottom: px(edge.bottom) },
        text: describeText(comp, scale),
        warnings: [...getNineSliceWarnings(comp, slice), iconUpscaleWarning(comp, scale)].filter(Boolean)
      };

      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2)).then(() => {
        copyJSONLabel.textContent = t('Copiado!');
        showToast('JSON 9-Slice copiado!');
        setTimeout(() => { copyJSONLabel.textContent = t('Copiar Metadados JSON'); }, 2000);
      });
    });

