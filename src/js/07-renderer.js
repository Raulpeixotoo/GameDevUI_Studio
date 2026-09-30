    // Mistura duas cores hex (amount 0 = a, 1 = b). Usado no relevo do bevel sem cair no branco puro.
    function mixHex(a, b, amount) {
      const pa = parseInt(String(a).replace('#', ''), 16);
      const pb = parseInt(String(b).replace('#', ''), 16);
      const ch = (p, s) => (p >> s) & 255;
      const mix = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * amount);
      return '#' + [16, 8, 0].map(s => mix(s).toString(16).padStart(2, '0')).join('');
    }

    function getRadii(comp) {
      return comp.independentRadius
        ? [comp.radiusTL, comp.radiusTR, comp.radiusBR, comp.radiusBL]
        : [comp.radius, comp.radius, comp.radius, comp.radius];
    }

    // cornerStyle 'round' usa arcos reais (arcTo); 'chamfer' corta o canto em diagonal (visual militar/sci-fi).
    // "p" pode ser o contexto do canvas ou um Path2D (hit test): só usa moveTo/lineTo/arcTo/closePath.
    function traceRoundedRect(p, x, y, w, h, rTL, rTR, rBR, rBL, cornerStyle = 'round') {
      const targetCtx = p;
      const maxR = Math.max(0, Math.min(w / 2, h / 2));
      rTL = Math.max(0, Math.min(rTL, maxR));
      rTR = Math.max(0, Math.min(rTR, maxR));
      rBR = Math.max(0, Math.min(rBR, maxR));
      rBL = Math.max(0, Math.min(rBL, maxR));

      if (cornerStyle === 'chamfer') {
        targetCtx.moveTo(x + rTL, y);
        targetCtx.lineTo(x + w - rTR, y);
        targetCtx.lineTo(x + w, y + rTR);
        targetCtx.lineTo(x + w, y + h - rBR);
        targetCtx.lineTo(x + w - rBR, y + h);
        targetCtx.lineTo(x + rBL, y + h);
        targetCtx.lineTo(x, y + h - rBL);
        targetCtx.lineTo(x, y + rTL);
      } else {
        targetCtx.moveTo(x + rTL, y);
        targetCtx.arcTo(x + w, y, x + w, y + h, rTR);
        targetCtx.arcTo(x + w, y + h, x, y + h, rBR);
        targetCtx.arcTo(x, y + h, x, y, rBL);
        targetCtx.arcTo(x, y, x + w, y, rTL);
      }
      targetCtx.closePath();
    }

    function drawRoundedPath(targetCtx, x, y, w, h, rTL, rTR, rBR, rBL, cornerStyle = 'round') {
      targetCtx.beginPath();
      traceRoundedRect(targetCtx, x, y, w, h, rTL, rTR, rBR, rBL, cornerStyle);
    }

    // Formas geométricas (tipo Forma). Estrela e polígono cabem na elipse inscrita na caixa, começando no topo.
    function traceShape(p, comp, x, y, w, h) {
      const cx = x + w / 2, cy = y + h / 2, rx = Math.max(0, w / 2), ry = Math.max(0, h / 2);
      const kind = comp.shapeKind || 'star';
      if (kind === 'ellipse') {
        p.moveTo(cx + rx, cy);
        p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        p.closePath();
        return;
      }
      if (kind === 'arrow') {
        const shaft = h * 0.44, head = x + w * 0.58;
        p.moveTo(x, cy - shaft / 2);
        p.lineTo(head, cy - shaft / 2);
        p.lineTo(head, y);
        p.lineTo(x + w, cy);
        p.lineTo(head, y + h);
        p.lineTo(head, cy + shaft / 2);
        p.lineTo(x, cy + shaft / 2);
        p.closePath();
        return;
      }
      const n = Math.max(3, Math.min(12, Math.round(comp.shapeSides || 5)));
      const star = kind === 'star';
      const count = star ? n * 2 : n;
      const inner = Math.max(0.05, Math.min(0.95, comp.shapeInnerRatio ?? 0.45));
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / count;
        const k = star && i % 2 === 1 ? inner : 1;
        const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
        if (i === 0) p.moveTo(px, py); else p.lineTo(px, py);
      }
      p.closePath();
    }

    // Geometria única do item: desenho, recorte do ícone, sombra e hit test saem daqui.
    function addComponentGeometry(p, comp, x, y, w, h, inset = 0) {
      const iw = Math.max(0, w - inset * 2), ih = Math.max(0, h - inset * 2);
      if (comp.type === 'Forma') {
        traceShape(p, comp, x + inset, y + inset, iw, ih);
        return;
      }
      const [rTL, rTR, rBR, rBL] = getRadii(comp);
      traceRoundedRect(p, x + inset, y + inset, iw, ih, rTL - inset, rTR - inset, rBR - inset, rBL - inset, comp.cornerStyle || 'round');
    }

    function makeFillStyle(targetCtx, comp, x, y, w, h, alpha) {
      if (comp.fillType !== 'gradient') return hexToRgba(comp.fillColor1, alpha);
      let grad;
      if (comp.gradientDir === 'horizontal') grad = targetCtx.createLinearGradient(x, y, x + w, y);
      else if (comp.gradientDir === 'diagonal') grad = targetCtx.createLinearGradient(x, y, x + w, y + h);
      else if (comp.gradientDir === 'radial') {
        const cx = x + w / 2, cy = y + h / 2;
        grad = targetCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, Math.hypot(w, h) / 2));
      } else grad = targetCtx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, hexToRgba(comp.fillColor1, alpha));
      grad.addColorStop(1, hexToRgba(comp.fillColor2, alpha));
      return grad;
    }

    // shadowBlur/shadowOffset ignoram a matriz do contexto; escalamos à mão para o export @2x/@4x bater.
    function contextScale(targetCtx) {
      const m = targetCtx.getTransform();
      return Math.hypot(m.a, m.b) || 1;
    }

    function drawBarFill(targetCtx, comp, x, y, w, h, shapePath, alpha) {
      shapePath();
      targetCtx.fillStyle = hexToRgba(comp.trackColor, alpha);
      targetCtx.fill();

      const v = Math.max(0, Math.min(1, (comp.barValue ?? 100) / 100));
      targetCtx.save();
      shapePath();
      targetCtx.clip();
      if (v > 0) {
        let fx = x, fy = y, fw = w, fh = h;
        if (comp.barDirection === 'rtl') { fw = w * v; fx = x + w - fw; }
        else if (comp.barDirection === 'btt') { fh = h * v; fy = y + h - fh; }
        else if (comp.barDirection === 'ttb') { fh = h * v; }
        else { fw = w * v; }
        targetCtx.fillStyle = makeFillStyle(targetCtx, comp, x, y, w, h, alpha);
        targetCtx.fillRect(fx, fy, fw, fh);
      }
      const segments = Math.floor(comp.barSegments || 0);
      if (segments > 1) {
        const vertical = comp.barDirection === 'btt' || comp.barDirection === 'ttb';
        targetCtx.strokeStyle = hexToRgba(comp.trackColor, 1);
        targetCtx.lineWidth = Math.max(2, Math.min(w, h) * 0.08);
        targetCtx.beginPath();
        for (let i = 1; i < segments; i++) {
          if (vertical) {
            const sy = y + (h * i) / segments;
            targetCtx.moveTo(x, sy); targetCtx.lineTo(x + w, sy);
          } else {
            const sx = x + (w * i) / segments;
            targetCtx.moveTo(sx, y); targetCtx.lineTo(sx, y + h);
          }
        }
        targetCtx.stroke();
      }
      targetCtx.restore();
    }

    function drawRing(targetCtx, comp, x, y, w, h) {
      const th = Math.max(1, comp.ringThickness);
      const r = Math.min(w, h) / 2 - th / 2 - 1;
      if (r <= 0) return;
      const cx = x + w / 2, cy = y + h / 2;
      const start = (comp.ringStart ?? -90) * Math.PI / 180;
      const v = Math.max(0, Math.min(1, (comp.ringValue ?? 0) / 100));

      targetCtx.save();
      targetCtx.lineWidth = th;
      targetCtx.strokeStyle = comp.ringTrackColor;
      targetCtx.beginPath();
      targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
      targetCtx.stroke();

      if (v > 0) {
        let stroke = comp.ringColor2;
        if (typeof targetCtx.createConicGradient === 'function') {
          stroke = targetCtx.createConicGradient(start, cx, cy);
          stroke.addColorStop(0, comp.ringColor1);
          stroke.addColorStop(Math.max(0.001, v), comp.ringColor2);
          if (v < 1) stroke.addColorStop(1, comp.ringColor1);
        }
        targetCtx.strokeStyle = stroke;
        targetCtx.lineCap = v < 1 ? 'round' : 'butt';
        if (comp.ringGlow) {
          targetCtx.shadowColor = comp.ringColor2;
          targetCtx.shadowBlur = th * 1.4 * contextScale(targetCtx);
        }
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, r, start, start + v * Math.PI * 2);
        targetCtx.stroke();
      }
      targetCtx.restore();
    }

    // Fontes do Google carregam sob demanda: pede a fonte uma vez e redesenha quando ela chegar.
    const fontLoadRequested = new Set();
    function fontSpec(comp) {
      return `${comp.fontWeight} ${comp.fontSize}px "${comp.fontFamily}"`;
    }
    function ensureFontLoaded(comp) {
      if (!document.fonts) return;
      const key = `${comp.fontWeight} "${comp.fontFamily}"`;
      if (fontLoadRequested.has(key)) return;
      fontLoadRequested.add(key);
      document.fonts.load(fontSpec(comp)).then(() => renderScene()).catch(() => {});
    }
    // Antes de exportar PNG: garante que todas as fontes usadas já estão prontas.
    async function ensureFontsReady(comps) {
      if (!document.fonts) return;
      const specs = [...new Set(comps.filter(c => c.text).map(fontSpec))];
      await Promise.all(specs.map(s => document.fonts.load(s).catch(() => {})));
      await document.fonts.ready;
    }

    function wrapTextLines(targetCtx, text, maxWidth) {
      const lines = [];
      String(text).split('\n').forEach(paragraph => {
        const words = paragraph.split(' ');
        let line = '';
        words.forEach(word => {
          const candidate = line ? `${line} ${word}` : word;
          if (line && targetCtx.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        });
        lines.push(line);
      });
      return lines;
    }

    function drawComponentText(targetCtx, comp, x, y, w, h) {
      ensureFontLoaded(comp);
      const label = String(componentLabel(comp));
      const cased = comp.textUppercase ? label.toUpperCase() : label;
      // Teste de tradução (R7): só no canvas do editor; PNG, SVG e manifest continuam com o texto real.
      const pseudo = state.pseudoLoc && targetCtx === ctx;
      const raw = pseudo ? pseudoLocalize(cased) : cased;
      const size = Math.max(1, comp.fontSize);
      const pad = comp.textPadding ?? 8;
      const k = contextScale(targetCtx);

      targetCtx.save();
      targetCtx.font = `${comp.fontWeight} ${size}px "${comp.fontFamily}", Inter, sans-serif`;
      if ('letterSpacing' in targetCtx) targetCtx.letterSpacing = `${comp.letterSpacing || 0}px`;
      targetCtx.textBaseline = 'middle';

      const lines = wrapTextLines(targetCtx, raw, Math.max(1, w - pad * 2));
      const lineH = size * (comp.lineHeight || 1.2);
      const blockH = lines.length * lineH;
      let top = y + (h - blockH) / 2;
      if (comp.textVAlign === 'top') top = y + pad;
      else if (comp.textVAlign === 'bottom') top = y + h - pad - blockH;

      let tx = x + w / 2;
      targetCtx.textAlign = 'center';
      if (comp.textAlign === 'left') { tx = x + pad; targetCtx.textAlign = 'left'; }
      else if (comp.textAlign === 'right') { tx = x + w - pad; targetCtx.textAlign = 'right'; }

      const applyEffect = () => {
        if (comp.textEffect === 'shadow') {
          targetCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          targetCtx.shadowBlur = size * 0.15 * k;
          targetCtx.shadowOffsetY = Math.max(1, size * 0.06) * k;
        } else if (comp.textEffect === 'glow') {
          targetCtx.shadowColor = comp.textColor;
          targetCtx.shadowBlur = size * 0.5 * k;
        }
      };
      const clearEffect = () => {
        targetCtx.shadowColor = 'transparent';
        targetCtx.shadowBlur = 0;
        targetCtx.shadowOffsetY = 0;
      };

      lines.forEach((line, i) => {
        const ly = top + i * lineH + lineH / 2;
        applyEffect();
        if (comp.textStrokeWidth > 0) {
          // O traço é centrado na borda do glifo: dobrar a largura deixa o contorno externo com o valor pedido.
          targetCtx.lineWidth = comp.textStrokeWidth * 2;
          targetCtx.lineJoin = 'round';
          targetCtx.strokeStyle = comp.textStrokeColor;
          targetCtx.strokeText(line, tx, ly);
          clearEffect();
        }
        targetCtx.fillStyle = comp.textColor;
        targetCtx.fillText(line, tx, ly);
      });

      // Estouro no teste de tradução: bloco mais alto que a caixa ou palavra mais larga que ela.
      if (pseudo) {
        const room = Math.max(1, w - pad * 2);
        clearEffect();
        const overflow = blockH > h + 0.5 || lines.some(l => targetCtx.measureText(l).width > room + 0.5);
        if (overflow) {
          pseudoOverflowIds.add(comp.id);
          targetCtx.setLineDash([8, 5]);
          targetCtx.lineWidth = 2;
          targetCtx.strokeStyle = '#f43f5e';
          targetCtx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        }
      }
      targetCtx.restore();
    }

    // ---- Teste de tradução / pseudo-localização (R7) ----
    // Acentua as letras e alonga o texto como uma tradução faria (alemão, francês e português costumam
    // passar de 30%; texto curto cresce mais), entre colchetes para mostrar onde cortou.
    const PSEUDO_MAP = { a: 'á', e: 'é', i: 'í', o: 'ö', u: 'ü', c: 'ç', n: 'ñ', A: 'Å', E: 'É', I: 'Í', O: 'Ö', U: 'Ü', C: 'Ç', N: 'Ñ' };
    const pseudoOverflowIds = new Set();
    state.pseudoLoc = false;

    function pseudoLocalize(text) {
      return String(text).split('\n').map(line => {
        if (!line.trim()) return line;
        const n = line.length;
        const grow = Math.ceil(n * (n <= 10 ? 0.6 : n <= 20 ? 0.4 : 0.3));
        return `[${line.replace(/[aeiouncAEIOUNC]/g, ch => PSEUDO_MAP[ch])}${'·'.repeat(grow)}]`;
      }).join('\n');
    }

    const chkPseudoLoc = document.getElementById('chkPseudoLoc');
    const pseudoLocCount = document.getElementById('pseudoLocCount');
    chkPseudoLoc.addEventListener('change', () => {
      state.pseudoLoc = chkPseudoLoc.checked;
      renderScene();
    });

    function updatePseudoLocCount() {
      const n = pseudoOverflowIds.size;
      pseudoLocCount.classList.toggle('hidden', !state.pseudoLoc);
      pseudoLocCount.textContent = n ? t('{n} estouro(s)', { n }) : t('tudo cabe');
      pseudoLocCount.classList.toggle('text-rose-400', n > 0);
      pseudoLocCount.classList.toggle('text-emerald-400', n === 0);
    }

    // ---- Acessibilidade (R7) ----
    // Simulação de daltonismo: filtro SVG (matrizes de Machado 2009) só no canvas do editor.
    const visionSimSelect = document.getElementById('visionSimSelect');
    visionSimSelect.addEventListener('change', () => {
      mainCanvas.style.filter = visionSimSelect.value ? `url(#cb-${visionSimSelect.value})` : '';
    });

    // Contraste WCAG 2.x entre a cor do texto e o que está atrás dele: o próprio preenchimento (se
    // for opaco o bastante) ou o item de baixo que cobre o centro do texto, ou a cor de fundo da cena.
    function relativeLuminance(hex) {
      const c = String(hex).replace('#', '');
      const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c.slice(0, 6);
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const n = parseInt(full, 16) || 0;
      return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    }

    function contrastRatio(a, b) {
      const la = relativeLuminance(a), lb = relativeLuminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    const fillColorsOf = (c) => (c.fillType === 'gradient' ? [c.fillColor1, c.fillColor2] : [c.fillColor1]);

    function backgroundColorsBehind(comp) {
      if (comp.fillOpacity >= 0.5) return fillColorsOf(comp);
      const cx = comp.x + comp.w / 2, cy = comp.y + comp.h / 2;
      const idx = state.components.indexOf(comp);
      for (let i = idx - 1; i >= 0; i--) {
        const c = state.components[i];
        if (c.visible && c.fillOpacity >= 0.5 && pointInComponent(c, cx, cy)) return fillColorsOf(c);
      }
      return state.sceneBackground.mode === 'color' ? [state.sceneBackground.color] : null;
    }

    function textContrastInfo(comp) {
      if (!comp || !componentLabel(comp)) return null;
      const large = comp.fontSize >= 24 || (comp.fontSize >= 18.66 && comp.fontWeight >= 700);
      const need = large ? 3 : 4.5;
      const bgs = backgroundColorsBehind(comp);
      if (!bgs) return { unknown: true, need };
      let ratio = Math.min(...bgs.map(b => contrastRatio(comp.textColor, b)));
      // Contorno de 1 px ou mais separa a letra do fundo: vale o melhor dos dois.
      if (comp.textStrokeWidth >= 1) ratio = Math.max(ratio, Math.min(...bgs.map(b => contrastRatio(comp.textStrokeColor, b))));
      return { ratio, need, ok: ratio >= need, large };
    }

    const textContrastBadge = document.getElementById('textContrastBadge');
    function updateContrastBadge() {
      const comp = getSelectedComponent();
      const info = textContrastInfo(comp);
      textContrastBadge.classList.toggle('hidden', !info);
      if (!info) return;
      textContrastBadge.classList.remove('text-emerald-300', 'border-emerald-700/60', 'text-amber-300', 'border-amber-600/60', 'text-zinc-400', 'border-zinc-700');
      if (info.unknown) {
        textContrastBadge.textContent = t('Contraste: fundo transparente, depende do que ficar atrás no jogo');
        textContrastBadge.classList.add('text-zinc-400', 'border-zinc-700');
        return;
      }
      const r = info.ratio.toFixed(1).replace('.', currentLang === 'en' ? '.' : ',');
      textContrastBadge.textContent = info.ok
        ? t('Contraste {r}:1 ✓ legível (mínimo {need}:1)', { r, need: String(info.need).replace('.', currentLang === 'en' ? '.' : ',') })
        : t('Contraste {r}:1 ⚠ baixo: o mínimo é {need}:1', { r, need: String(info.need).replace('.', currentLang === 'en' ? '.' : ',') });
      textContrastBadge.classList.add(...(info.ok ? ['text-emerald-300', 'border-emerald-700/60'] : ['text-amber-300', 'border-amber-600/60']));
    }

    // ---- Textura: ruído e scanlines (R7) ----
    // O ruído é um ladrilho fixo (semente constante): a mesma imagem na tela, no PNG, no SVG e em
    // qualquer máquina. Pixel branco ou preto com alfa aleatório, então funciona sobre qualquer cor.
    const NOISE_TILE = 128;
    let noiseTileCanvas = null, noiseTileDataUrl = null;

    function noiseTile() {
      if (noiseTileCanvas) return noiseTileCanvas;
      let seed = 0x5eed1234;
      const rand = () => { // mulberry32
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      noiseTileCanvas = document.createElement('canvas');
      noiseTileCanvas.width = noiseTileCanvas.height = NOISE_TILE;
      const c = noiseTileCanvas.getContext('2d');
      const img = c.createImageData(NOISE_TILE, NOISE_TILE);
      for (let i = 0; i < img.data.length; i += 4) {
        const r = rand();
        const v = r > 0.5 ? 255 : 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.round(Math.abs(r - 0.5) * 2 * 255);
      }
      c.putImageData(img, 0, 0);
      return noiseTileCanvas;
    }

    function noiseTileUrl() {
      if (!noiseTileDataUrl) noiseTileDataUrl = noiseTile().toDataURL('image/png');
      return noiseTileDataUrl;
    }

    const hasTexture = (comp) => comp.noise > 0 || comp.scanlines > 0;
    const scanlineGap = (comp) => Math.max(2, Math.min(32, Math.round(comp.scanlineSpacing || 4)));

    // options: { ignoreIcon, ignoreText }. Um boolean ainda é aceito (compatibilidade: ignoreIcon).
    function renderComponentToContext(targetCtx, comp, originX = 0, originY = 0, options = {}) {
      if (!comp.visible) return;
      const opts = typeof options === 'boolean' ? { ignoreIcon: options } : (options || {});

      const x = originX + comp.x;
      const y = originY + comp.y;
      const w = comp.w;
      const h = comp.h;
      const [rTL, rTR, rBR, rBL] = getRadii(comp);
      const corner = comp.cornerStyle || 'round';
      const shapePath = (inset = 0) => {
        targetCtx.beginPath();
        addComponentGeometry(targetCtx, comp, x, y, w, h, inset);
      };
      const k = contextScale(targetCtx);
      const layerAlpha = Math.max(0, Math.min(1, comp.opacity ?? 1));
      const fillAlpha = comp.fillOpacity !== undefined ? comp.fillOpacity : 1.0;

      targetCtx.save();
      targetCtx.globalAlpha = layerAlpha;

      // Rotação em volta do centro do item (graus, sentido horário).
      if (comp.rotation) {
        const cx = x + w / 2, cy = y + h / 2;
        targetCtx.translate(cx, cy);
        targetCtx.rotate(comp.rotation * Math.PI / 180);
        targetCtx.translate(-cx, -cy);
      }

      // 1. Drop shadow. A forma que projeta a sombra é desenhada fora da área visível e só a sombra
      //    volta para o lugar; assim um fundo semitransparente não mostra um "bloco preto" por trás.
      // (R7: um cache de sprites para esta sombra foi medido e descartado; ver DOCS 5.5.)
      if (comp.dropShadow && fillAlpha > 0) {
        const far = 100000;
        targetCtx.save();
        targetCtx.shadowColor = hexToRgba(comp.shadowColor || '#000000', (comp.shadowOpacity ?? 0.6) * fillAlpha);
        targetCtx.shadowBlur = (comp.shadowBlur ?? 18) * k;
        // O deslocamento da sombra ignora a matriz: devolvemos o "far" já girado/escalado (m.a, m.b)
        // e somamos o offset pedido em espaço de tela, então a sombra continua caindo para baixo.
        const m = targetCtx.getTransform();
        targetCtx.shadowOffsetX = far * m.a + (comp.shadowOffsetX || 0) * k;
        targetCtx.shadowOffsetY = far * m.b + (comp.shadowOffsetY ?? 8) * k;
        targetCtx.beginPath();
        addComponentGeometry(targetCtx, comp, x - far, y, w, h, 0);
        targetCtx.fillStyle = '#000';
        targetCtx.fill();
        targetCtx.restore();
      }

      // 2. Preenchimento (a Barra desenha trilho + parte cheia)
      if (fillAlpha > 0) {
        if (comp.type === 'Barra') {
          drawBarFill(targetCtx, comp, x, y, w, h, () => shapePath(), fillAlpha);
        } else {
          shapePath();
          targetCtx.fillStyle = makeFillStyle(targetCtx, comp, x, y, w, h, fillAlpha);
          targetCtx.fill();
        }
      }

      // 3. Inner shadow
      if (comp.innerShadow && fillAlpha > 0.05) {
        targetCtx.save();
        shapePath();
        targetCtx.clip();
        const depth = Math.max(1, Math.min(comp.innerShadowSize ?? 24, h * 0.5));
        const shade = comp.innerShadowColor || '#000000';
        const topGrad = targetCtx.createLinearGradient(x, y, x, y + depth);
        topGrad.addColorStop(0, hexToRgba(shade, (comp.innerShadowOpacity ?? 0.55) * fillAlpha));
        topGrad.addColorStop(1, hexToRgba(shade, 0));
        targetCtx.fillStyle = topGrad;
        targetCtx.fillRect(x, y, w, h);
        const highlight = comp.innerHighlight ?? 0.12;
        if (highlight > 0) {
          const hl = Math.max(1, Math.min(depth * 0.75, h * 0.3));
          const btmGrad = targetCtx.createLinearGradient(x, y + h - hl, x, y + h);
          btmGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
          btmGrad.addColorStop(1, `rgba(255, 255, 255, ${highlight * fillAlpha})`);
          targetCtx.fillStyle = btmGrad;
          targetCtx.fillRect(x, y, w, h);
        }
        targetCtx.restore();
      }

      // 3b. Textura (R7): ruído (grão) e scanlines (CRT), recortados pela forma, por cima do preenchimento.
      if (hasTexture(comp) && fillAlpha > 0) {
        targetCtx.save();
        shapePath();
        targetCtx.clip();
        if (comp.noise > 0) {
          targetCtx.globalAlpha = layerAlpha * Math.min(1, comp.noise) * fillAlpha;
          const pattern = targetCtx.createPattern(noiseTile(), 'repeat');
          pattern.setTransform(new DOMMatrix().translateSelf(x, y)); // ancorado no item: mover não "cintila"
          targetCtx.fillStyle = pattern;
          targetCtx.fillRect(x, y, w, h);
        }
        if (comp.scanlines > 0) {
          const gap = scanlineGap(comp);
          targetCtx.globalAlpha = layerAlpha * Math.min(1, comp.scanlines) * fillAlpha;
          targetCtx.fillStyle = '#000';
          for (let ly = y; ly < y + h; ly += gap) targetCtx.fillRect(x, ly, w, gap / 2);
        }
        targetCtx.restore();
      }

      // 4. Imagem / ícone embutido
      if (comp.icon && !opts.ignoreIcon) {
        targetCtx.save();
        shapePath();
        targetCtx.clip();
        targetCtx.globalAlpha = layerAlpha * (comp.iconOpacity !== undefined ? comp.iconOpacity : 0.8);
        if (comp.iconFilter === 'grayscale') {
          targetCtx.filter = 'grayscale(100%)';
        } else if (comp.iconFilter === 'glow') {
          targetCtx.filter = 'brightness(140%) contrast(120%) drop-shadow(0 0 8px rgba(13,153,255,0.8))';
        }

        // SVG sem width/height pode vir com tamanho natural 0: nesse caso usa a caixa do componente.
        const natW = comp.icon.naturalWidth || comp.icon.width || w;
        const natH = comp.icon.naturalHeight || comp.icon.height || h;
        const scale = comp.iconScale !== undefined ? comp.iconScale : 0.7;
        let drawW, drawH;
        if (comp.iconFit === 'stretch') {
          drawW = w * scale; drawH = h * scale;
        } else if (comp.iconFit === 'cover') {
          const f = Math.max(w / natW, h / natH) * scale;
          drawW = natW * f; drawH = natH * f;
        } else if (comp.iconFit === 'original') {
          drawW = natW * scale; drawH = natH * scale;
        } else {
          const f = Math.min(w / natW, h / natH) * scale;
          drawW = natW * f; drawH = natH * f;
        }
        const iconX = x + (w - drawW) / 2 + (comp.iconOffsetX || 0);
        const iconY = y + (h - drawH) / 2 + (comp.iconOffsetY || 0);

        if (comp.iconFilter === 'silhouette') {
          const off = document.createElement('canvas');
          off.width = Math.max(1, Math.round(drawW * k));
          off.height = Math.max(1, Math.round(drawH * k));
          const offC = off.getContext('2d');
          offC.drawImage(comp.icon, 0, 0, off.width, off.height);
          offC.globalCompositeOperation = 'source-in';
          offC.fillStyle = '#050508';
          offC.fillRect(0, 0, off.width, off.height);
          targetCtx.drawImage(off, iconX, iconY, drawW, drawH);
        } else {
          targetCtx.drawImage(comp.icon, iconX, iconY, drawW, drawH);
        }
        targetCtx.restore();
      }

      // 5. Anel (medidor circular)
      if (comp.type === 'Anel') drawRing(targetCtx, comp, x, y, w, h);

      // 6. Borda
      if (comp.borderWidth > 0) {
        targetCtx.save();
        const bw = comp.borderWidth;
        targetCtx.lineWidth = bw;
        const style = comp.borderStyle;

        if (style === 'glow') {
          targetCtx.shadowColor = comp.borderColor;
          targetCtx.shadowBlur = 12 * k;
          targetCtx.strokeStyle = comp.borderColor;
        } else if (style === 'bevel' || style === 'inset') {
          const strength = comp.bevelStrength ?? 0.35;
          const light = mixHex(comp.borderColor, '#ffffff', strength);
          const dark = mixHex(comp.borderColor, '#000000', Math.min(0.85, strength + 0.35));
          const grad = targetCtx.createLinearGradient(x, y, x, y + h);
          grad.addColorStop(0, style === 'bevel' ? light : dark);
          grad.addColorStop(0.45, comp.borderColor);
          grad.addColorStop(1, style === 'bevel' ? dark : light);
          targetCtx.strokeStyle = grad;
        } else {
          targetCtx.strokeStyle = comp.borderColor;
          if (style === 'dashed') targetCtx.setLineDash([Math.max(4, bw * 3), Math.max(3, bw * 2)]);
        }

        if (style === 'double') {
          const line = Math.max(1, bw / 3);
          targetCtx.lineWidth = line;
          shapePath(line / 2);
          targetCtx.stroke();
          shapePath(bw - line / 2);
          targetCtx.stroke();
        } else {
          shapePath(bw / 2);
          targetCtx.stroke();
        }
        targetCtx.restore();
      }

      // 7. Texto / rótulo (por cima da borda, como um label de engine)
      if (componentLabel(comp) && !opts.ignoreText) drawComponentText(targetCtx, comp, x, y, w, h);

      targetCtx.restore();
    }

    // Onde o rascunho fica na cena (esticado, ou "conter" centralizado). Usado pelo canvas e pelo SVG.
    function referenceImageRect() {
      const img = state.reference.img;
      const cW = state.canvasWidth;
      const cH = state.canvasHeight;
      if (state.reference.fitMode === 'stretch') return { x: 0, y: 0, w: cW, h: cH };
      const imgAspect = img.naturalWidth / img.naturalHeight;
      if (imgAspect > cW / cH) {
        const h = cW / imgAspect;
        return { x: 0, y: (cH - h) / 2, w: cW, h };
      }
      const w = cH * imgAspect;
      return { x: (cW - w) / 2, y: 0, w, h: cH };
    }

    function renderReferenceImage(targetCtx) {
      if (!state.reference.img || !state.reference.visible) return;
      targetCtx.save();
      targetCtx.globalAlpha = state.reference.opacity;
      const r = referenceImageRect();
      targetCtx.drawImage(state.reference.img, r.x, r.y, r.w, r.h);
      targetCtx.restore();
    }

