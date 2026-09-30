    // clean = moldura pura (sem ícone e sem texto), para a versão "Frames_Only" e para as partes da Barra.
    // brightness ≠ 1: multiplica o RGB de cada pixel (estados hover/pressed). Por pixel, sem ctx.filter
    // (ausente em Safari antigo) e sem mexer na geometria: as margens 9-slice valem para todos os estados.
    function renderSingleComponentToBlob(comp, scale = 1, forceCleanFrame = false, brightness = 1) {
      return new Promise((resolve) => {
        const offCanvas = document.createElement('canvas');
        const slice = computeNineSlice(comp, scale);
        offCanvas.width = slice.textureWidth;
        offCanvas.height = slice.textureHeight;
        const offCtx = offCanvas.getContext('2d', brightness !== 1 ? { willReadFrequently: true } : undefined);

        offCtx.scale(scale, scale);

        // Camadas ocultas no editor continuam sendo assets válidos no export.
        // PNG sai sem rotação: o ângulo vai no manifest e a engine gira o RectTransform.
        renderComponentToContext(offCtx, { ...comp, visible: true, rotation: 0 }, -comp.x + EXPORT_PAD, -comp.y + EXPORT_PAD, {
          ignoreIcon: forceCleanFrame || comp.exportWithIcon === false,
          ignoreText: forceCleanFrame || comp.exportWithText === false
        });

        if (brightness !== 1) {
          const image = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          const d = image.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.min(255, d[i] * brightness);
            d[i + 1] = Math.min(255, d[i + 1] * brightness);
            d[i + 2] = Math.min(255, d[i + 2] * brightness);
          }
          offCtx.putImageData(image, 0, 0);
        }

        offCanvas.toBlob((blob) => {
          // Libera a memória do canvas temporário imediatamente (importante no batch).
          offCanvas.width = 0;
          offCanvas.height = 0;
          resolve(blob);
        }, 'image/png');
      });
    }

    function downloadBlob(blob, fileName) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    btnExportSelected.addEventListener('click', async () => {
      const comp = getSelectedComponent();
      if (!comp) {
        showToast('Selecione um componente primeiro!');
        return;
      }
      await ensureFontsReady([comp]);
      const scale = exportScale();
      const cleanName = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const baseName = `${cleanName}_${Math.round(comp.w * scale)}x${Math.round(comp.h * scale)}`;
      if (state.exportFormat === 'svg') {
        downloadBlob(new Blob([componentSvgString(comp, scale)], { type: 'image/svg+xml' }), `${baseName}.svg`);
        showToast(t('Exportado: {name}.svg', { name: comp.name }));
        return;
      }
      const blob = await renderSingleComponentToBlob(comp, scale);
      downloadBlob(blob, `${baseName}.png`);
      showToast(t('Exportado: {name}.png', { name: comp.name }));
    });

    btnExportScene.addEventListener('click', async () => {
      await ensureFontsReady(state.components);
      const scale = exportScale();
      if (state.exportFormat === 'svg') {
        const w = Math.round(state.canvasWidth * scale), h = Math.round(state.canvasHeight * scale);
        downloadBlob(new Blob([sceneSvgString(scale)], { type: 'image/svg+xml' }), `scene_${w}x${h}.svg`);
        showToast('Cena exportada com sucesso!');
        return;
      }
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = Math.round(state.canvasWidth * scale);
      exportCanvas.height = Math.round(state.canvasHeight * scale);
      const expCtx = exportCanvas.getContext('2d');
      expCtx.scale(scale, scale); // desenha em coordenadas da cena; o renderer escala sombras e linhas
      if (state.sceneBackground.mode === 'color') {
        expCtx.fillStyle = state.sceneBackground.color;
        expCtx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
      }

      if (state.reference.img && state.reference.includeInSceneExport) {
        renderReferenceImage(expCtx);
      }

      state.components.forEach(comp => {
        renderComponentToContext(expCtx, comp, 0, 0);
      });

      exportCanvas.toBlob((blob) => {
        downloadBlob(blob, `scene_${exportCanvas.width}x${exportCanvas.height}.png`);
        exportCanvas.width = 0;
        exportCanvas.height = 0;
        showToast('Cena exportada com sucesso!');
      }, 'image/png');
    });

    // Metadados de texto para recriar o rótulo na engine (TextMeshPro / UMG Text) em vez de usar o PNG.
    // scale: medidas em px da resolução de saída (fonte, espaçamento, contorno).
    function describeText(comp, scale = 1) {
      const label = componentLabel(comp);
      if (!label) return null;
      const px = (v) => Math.round(v * scale * 100) / 100;
      return {
        content: comp.textUppercase ? String(label).toUpperCase() : label,
        fontFamily: comp.fontFamily,
        fontSize: px(comp.fontSize),
        fontWeight: comp.fontWeight,
        color: comp.textColor,
        align: comp.textAlign,
        verticalAlign: comp.textVAlign,
        letterSpacing: px(comp.letterSpacing),
        lineHeight: comp.lineHeight,
        outline: comp.textStrokeWidth > 0 ? { width: px(comp.textStrokeWidth), color: comp.textStrokeColor } : null,
        effect: comp.textEffect,
        bakedIntoPng: comp.exportWithText !== false
      };
    }

