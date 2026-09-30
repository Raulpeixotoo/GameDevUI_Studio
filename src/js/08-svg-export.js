    // ===== Export SVG vetorial (R5) =====
    // Segue os mesmos passos de renderComponentToContext, escrevendo SVG em vez de pintar pixels.
    // A geometria sai da mesma addComponentGeometry, por um gravador de path: cantos e formas idênticos ao PNG.
    const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const svgNum = (v) => { const n = Math.round(v * 100) / 100; return Object.is(n, -0) ? '0' : String(n); };

    function hex6(hex) {
      let c = String(hex || '#000000').replace('#', '');
      if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
      return /^[0-9a-f]{6}/i.test(c) ? `#${c.slice(0, 6).toLowerCase()}` : '#000000';
    }

    // fill/stroke com opacidade separada (rgba() em atributo não é aceito por todo editor de vetor).
    const svgPaint = (attr, hex, alpha = 1) =>
      `${attr}="${hex6(hex)}"${alpha < 1 ? ` ${attr}-opacity="${svgNum(Math.max(0, alpha))}"` : ''}`;

    function lerpHex(a, b, t) {
      const pa = parseInt(hex6(a).slice(1), 16), pb = parseInt(hex6(b).slice(1), 16);
      const ch = (p, s) => (p >> s) & 255;
      return '#' + [16, 8, 0].map(s => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t).toString(16).padStart(2, '0')).join('');
    }

    // Recebe as chamadas que o canvas recebe (moveTo/lineTo/arcTo/ellipse/closePath) e monta o "d".
    function svgPathRecorder() {
      let d = '', px = 0, py = 0, sx = 0, sy = 0;
      const n = svgNum;
      return {
        moveTo(x, y) { d += `M${n(x)} ${n(y)}`; px = sx = x; py = sy = y; },
        lineTo(x, y) { d += `L${n(x)} ${n(y)}`; px = x; py = y; },
        // arcTo do canvas = reta até o ponto de tangência + arco de raio r até a segunda tangência.
        arcTo(x1, y1, x2, y2, r) {
          const ux = px - x1, uy = py - y1, vx = x2 - x1, vy = y2 - y1;
          const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
          const cross = (x1 - px) * (y2 - y1) - (y1 - py) * (x2 - x1);
          if (r <= 0 || lu === 0 || lv === 0 || Math.abs(cross) < 1e-9) { this.lineTo(x1, y1); return; }
          const angle = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv))));
          const dist = r / Math.tan(angle / 2);
          const t1x = x1 + (ux / lu) * dist, t1y = y1 + (uy / lu) * dist;
          const t2x = x1 + (vx / lv) * dist, t2y = y1 + (vy / lv) * dist;
          // Y para baixo: curva à direita (cross > 0) = sentido horário = sweep 1.
          d += `L${n(t1x)} ${n(t1y)}A${n(r)} ${n(r)} 0 0 ${cross > 0 ? 1 : 0} ${n(t2x)} ${n(t2y)}`;
          px = t2x; py = t2y;
        },
        // Só a elipse completa da Forma (0 → 2π, horário): duas meias-voltas.
        ellipse(ex, ey, rx, ry) {
          const a = ex + rx, b = ex - rx;
          d += `L${n(a)} ${n(ey)}A${n(rx)} ${n(ry)} 0 1 1 ${n(b)} ${n(ey)}A${n(rx)} ${n(ry)} 0 1 1 ${n(a)} ${n(ey)}`;
          px = a; py = ey;
        },
        closePath() { d += 'Z'; px = sx; py = sy; },
        get d() { return d; }
      };
    }

    // Contexto de um documento SVG: defs (gradientes, filtros, recortes) com ids únicos,
    // fontes usadas (para o @import) e um canvas só para medir texto (mesmas quebras do PNG).
    function svgContext() {
      const prefix = `dv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}_`;
      let n = 0;
      const defs = [];
      return {
        defs,
        fonts: new Map(),
        measure: document.createElement('canvas').getContext('2d'),
        def(build) { const id = `${prefix}${++n}`; defs.push(build(id)); return id; },
        filter(inner) {
          return this.def(id => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">${inner}</filter>`);
        },
        clip(d) { return this.def(id => `<clipPath id="${id}"><path d="${d}"/></clipPath>`); },
        gradient(type, coords, stops) {
          const attrs = Object.entries(coords).map(([k, v]) => `${k}="${svgNum(v)}"`).join(' ');
          const body = stops.map(([o, c, a]) => `<stop offset="${svgNum(o)}" stop-color="${hex6(c)}"${a < 1 ? ` stop-opacity="${svgNum(a)}"` : ''}/>`).join('');
          return this.def(id => `<${type} id="${id}" gradientUnits="userSpaceOnUse" ${attrs}>${body}</${type}>`);
        }
      };
    }

    function svgFillFor(S, comp, x, y, w, h, alpha) {
      if (comp.fillType !== 'gradient') return svgPaint('fill', comp.fillColor1, alpha);
      const stops = [[0, comp.fillColor1, alpha], [1, comp.fillColor2, alpha]];
      let id;
      if (comp.gradientDir === 'horizontal') id = S.gradient('linearGradient', { x1: x, y1: y, x2: x + w, y2: y }, stops);
      else if (comp.gradientDir === 'diagonal') id = S.gradient('linearGradient', { x1: x, y1: y, x2: x + w, y2: y + h }, stops);
      else if (comp.gradientDir === 'radial') id = S.gradient('radialGradient', { cx: x + w / 2, cy: y + h / 2, r: Math.max(1, Math.hypot(w, h) / 2) }, stops);
      else id = S.gradient('linearGradient', { x1: x, y1: y, x2: x, y2: y + h }, stops);
      return `fill="url(#${id})"`;
    }

    function svgRing(S, comp, x, y, w, h) {
      const th = Math.max(1, comp.ringThickness);
      const r = Math.min(w, h) / 2 - th / 2 - 1;
      if (r <= 0) return '';
      const cx = x + w / 2, cy = y + h / 2;
      const start = (comp.ringStart ?? -90) * Math.PI / 180;
      const v = Math.max(0, Math.min(1, (comp.ringValue ?? 0) / 100));
      const pt = (a) => `${svgNum(cx + Math.cos(a) * r)} ${svgNum(cy + Math.sin(a) * r)}`;
      const arc = (a0, a1) => `M${pt(a0)}A${svgNum(r)} ${svgNum(r)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}`;
      const out = [`<circle cx="${svgNum(cx)}" cy="${svgNum(cy)}" r="${svgNum(r)}" fill="none" ${svgPaint('stroke', comp.ringTrackColor)} stroke-width="${svgNum(th)}"/>`];
      if (v <= 0) return out.join('');

      const total = v * Math.PI * 2;
      if (comp.ringGlow) {
        const f = S.filter(`<feGaussianBlur stdDeviation="${svgNum(th * 0.7)}"/>`);
        const glowAttrs = `fill="none" ${svgPaint('stroke', comp.ringColor2)} stroke-width="${svgNum(th)}" filter="url(#${f})"`;
        out.push(v >= 1
          ? `<circle cx="${svgNum(cx)}" cy="${svgNum(cy)}" r="${svgNum(r)}" ${glowAttrs}/>`
          : `<path d="${arc(start, start + total)}" stroke-linecap="round" ${glowAttrs}/>`);
      }
      // SVG não tem gradiente cônico: o arco vira segmentos com a cor interpolada (início → fim),
      // um pouco sobrepostos para não aparecer emenda.
      const segs = Math.max(2, Math.ceil(v * 96));
      const step = total / segs;
      for (let i = 0; i < segs; i++) {
        const a0 = start + i * step;
        const a1 = Math.min(start + total, a0 + step + (i < segs - 1 ? 0.01 : 0));
        out.push(`<path d="${arc(a0, a1)}" fill="none" stroke="${lerpHex(comp.ringColor1, comp.ringColor2, (i + 0.5) / segs)}" stroke-width="${svgNum(th)}"/>`);
      }
      if (v < 1) {
        const cap = (a, c) => `<circle cx="${svgNum(cx + Math.cos(a) * r)}" cy="${svgNum(cy + Math.sin(a) * r)}" r="${svgNum(th / 2)}" fill="${hex6(c)}"/>`;
        out.push(cap(start, comp.ringColor1), cap(start + total, comp.ringColor2));
      }
      return out.join('');
    }

    function svgText(S, comp, x, y, w, h) {
      const label = String(componentLabel(comp));
      const raw = comp.textUppercase ? label.toUpperCase() : label;
      const size = Math.max(1, comp.fontSize);
      const pad = comp.textPadding ?? 8;
      const m = S.measure;
      m.font = `${comp.fontWeight} ${size}px "${comp.fontFamily}", Inter, sans-serif`;
      if ('letterSpacing' in m) m.letterSpacing = `${comp.letterSpacing || 0}px`;
      const lines = wrapTextLines(m, raw, Math.max(1, w - pad * 2));
      const lineH = size * (comp.lineHeight || 1.2);
      const blockH = lines.length * lineH;
      let top = y + (h - blockH) / 2;
      if (comp.textVAlign === 'top') top = y + pad;
      else if (comp.textVAlign === 'bottom') top = y + h - pad - blockH;
      let tx = x + w / 2, anchor = 'middle';
      if (comp.textAlign === 'left') { tx = x + pad; anchor = 'start'; }
      else if (comp.textAlign === 'right') { tx = x + w - pad; anchor = 'end'; }

      const weights = S.fonts.get(comp.fontFamily) || new Set();
      weights.add(comp.fontWeight);
      S.fonts.set(comp.fontFamily, weights);

      let filter = '';
      if (comp.textEffect === 'shadow') {
        filter = ` filter="url(#${S.filter(`<feDropShadow dx="0" dy="${svgNum(Math.max(1, size * 0.06))}" stdDeviation="${svgNum(size * 0.075)}" flood-color="#000000" flood-opacity="0.75"/>`)})"`;
      } else if (comp.textEffect === 'glow') {
        filter = ` filter="url(#${S.filter(`<feDropShadow dx="0" dy="0" stdDeviation="${svgNum(size * 0.25)}" flood-color="${hex6(comp.textColor)}"/>`)})"`;
      }
      const stroke = comp.textStrokeWidth > 0
        ? ` ${svgPaint('stroke', comp.textStrokeColor)} stroke-width="${svgNum(comp.textStrokeWidth * 2)}" stroke-linejoin="round" paint-order="stroke"`
        : '';
      const family = `'${String(comp.fontFamily).replace(/'/g, '')}', Inter, sans-serif`;
      const tspans = lines.map((line, i) =>
        `<text x="${svgNum(tx)}" y="${svgNum(top + i * lineH + lineH / 2)}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${xmlEsc(family)}" font-weight="${xmlEsc(comp.fontWeight)}" font-size="${svgNum(size)}"${comp.letterSpacing ? ` letter-spacing="${svgNum(comp.letterSpacing)}"` : ''} ${svgPaint('fill', comp.textColor)}${stroke} style="white-space:pre">${xmlEsc(line)}</text>`
      ).join('');
      return `<g${filter}>${tspans}</g>`;
    }

    // Um componente como <g>. options = as mesmas do PNG ({ ignoreIcon, ignoreText }).
    function componentToSvg(S, comp, originX = 0, originY = 0, opts = {}) {
      if (!comp.visible) return '';
      const x = originX + comp.x, y = originY + comp.y, w = comp.w, h = comp.h;
      const shapeD = (inset = 0) => { const p = svgPathRecorder(); addComponentGeometry(p, comp, x, y, w, h, inset); return p.d; };
      const layerAlpha = Math.max(0, Math.min(1, comp.opacity ?? 1));
      const fillAlpha = comp.fillOpacity !== undefined ? comp.fillOpacity : 1;
      const rot = comp.rotation ? ` transform="rotate(${svgNum(comp.rotation)} ${svgNum(x + w / 2)} ${svgNum(y + h / 2)})"` : '';
      const parts = [];

      // 1. Sombra projetada: deslocada fora da rotação (no canvas ela sempre cai para baixo na tela).
      let shadow = '';
      if (comp.dropShadow && fillAlpha > 0) {
        const f = S.filter(`<feGaussianBlur stdDeviation="${svgNum((comp.shadowBlur ?? 18) / 2)}"/>`);
        shadow = `<g transform="translate(${svgNum(comp.shadowOffsetX || 0)} ${svgNum(comp.shadowOffsetY ?? 8)})"><g${rot}><path d="${shapeD()}" ${svgPaint('fill', comp.shadowColor || '#000000', (comp.shadowOpacity ?? 0.6) * fillAlpha)} filter="url(#${f})"/></g></g>`;
      }

      // 2. Preenchimento (Barra: trilho + parte cheia + divisórias, recortados pela forma)
      if (fillAlpha > 0) {
        if (comp.type === 'Barra') {
          const clip = S.clip(shapeD());
          parts.push(`<path d="${shapeD()}" ${svgPaint('fill', comp.trackColor, fillAlpha)}/>`);
          const v = Math.max(0, Math.min(1, (comp.barValue ?? 100) / 100));
          const inner = [];
          if (v > 0) {
            let fx = x, fy = y, fw = w, fh = h;
            if (comp.barDirection === 'rtl') { fw = w * v; fx = x + w - fw; }
            else if (comp.barDirection === 'btt') { fh = h * v; fy = y + h - fh; }
            else if (comp.barDirection === 'ttb') { fh = h * v; }
            else { fw = w * v; }
            inner.push(`<rect x="${svgNum(fx)}" y="${svgNum(fy)}" width="${svgNum(fw)}" height="${svgNum(fh)}" ${svgFillFor(S, comp, x, y, w, h, fillAlpha)}/>`);
          }
          const segments = Math.floor(comp.barSegments || 0);
          if (segments > 1) {
            const vertical = comp.barDirection === 'btt' || comp.barDirection === 'ttb';
            let d = '';
            for (let i = 1; i < segments; i++) {
              if (vertical) { const sy = y + (h * i) / segments; d += `M${svgNum(x)} ${svgNum(sy)}L${svgNum(x + w)} ${svgNum(sy)}`; }
              else { const sx = x + (w * i) / segments; d += `M${svgNum(sx)} ${svgNum(y)}L${svgNum(sx)} ${svgNum(y + h)}`; }
            }
            inner.push(`<path d="${d}" fill="none" ${svgPaint('stroke', comp.trackColor)} stroke-width="${svgNum(Math.max(2, Math.min(w, h) * 0.08))}"/>`);
          }
          if (inner.length) parts.push(`<g clip-path="url(#${clip})">${inner.join('')}</g>`);
        } else {
          parts.push(`<path d="${shapeD()}" ${svgFillFor(S, comp, x, y, w, h, fillAlpha)}/>`);
        }
      }

      // 3. Sombra interna (topo escuro + brilho na base), recortada pela forma
      if (comp.innerShadow && fillAlpha > 0.05) {
        const clip = S.clip(shapeD());
        const depth = Math.max(1, Math.min(comp.innerShadowSize ?? 24, h * 0.5));
        const shade = comp.innerShadowColor || '#000000';
        const topId = S.gradient('linearGradient', { x1: x, y1: y, x2: x, y2: y + depth },
          [[0, shade, (comp.innerShadowOpacity ?? 0.55) * fillAlpha], [1, shade, 0]]);
        let inner = `<rect x="${svgNum(x)}" y="${svgNum(y)}" width="${svgNum(w)}" height="${svgNum(h)}" fill="url(#${topId})"/>`;
        const highlight = comp.innerHighlight ?? 0.12;
        if (highlight > 0) {
          const hl = Math.max(1, Math.min(depth * 0.75, h * 0.3));
          const btmId = S.gradient('linearGradient', { x1: x, y1: y + h - hl, x2: x, y2: y + h },
            [[0, '#ffffff', 0], [1, '#ffffff', highlight * fillAlpha]]);
          inner += `<rect x="${svgNum(x)}" y="${svgNum(y)}" width="${svgNum(w)}" height="${svgNum(h)}" fill="url(#${btmId})"/>`;
        }
        parts.push(`<g clip-path="url(#${clip})">${inner}</g>`);
      }

      // 3b. Textura (R7): o mesmo ladrilho de ruído do PNG (uma <image> por documento) e scanlines em pattern.
      if (hasTexture(comp) && fillAlpha > 0) {
        const clip = S.clip(shapeD());
        if (comp.noise > 0) {
          if (!S.noiseImageId) S.noiseImageId = S.def(id => `<image id="${id}" width="${NOISE_TILE}" height="${NOISE_TILE}" href="${noiseTileUrl()}"/>`);
          const pat = S.def(id => `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${svgNum(x)}" y="${svgNum(y)}" width="${NOISE_TILE}" height="${NOISE_TILE}"><use href="#${S.noiseImageId}"/></pattern>`);
          parts.push(`<g clip-path="url(#${clip})" opacity="${svgNum(Math.min(1, comp.noise) * fillAlpha)}"><rect x="${svgNum(x)}" y="${svgNum(y)}" width="${svgNum(w)}" height="${svgNum(h)}" fill="url(#${pat})"/></g>`);
        }
        if (comp.scanlines > 0) {
          const gap = scanlineGap(comp);
          const pat = S.def(id => `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${svgNum(x)}" y="${svgNum(y)}" width="${gap}" height="${gap}"><rect width="${gap}" height="${svgNum(gap / 2)}" fill="#000"/></pattern>`);
          parts.push(`<g clip-path="url(#${clip})" opacity="${svgNum(Math.min(1, comp.scanlines) * fillAlpha)}"><rect x="${svgNum(x)}" y="${svgNum(y)}" width="${svgNum(w)}" height="${svgNum(h)}" fill="url(#${pat})"/></g>`);
        }
      }

      // 4. Imagem / ícone (dataURL embutido), recortado pela forma
      if (comp.icon && comp.iconSrc && !opts.ignoreIcon) {
        const natW = comp.icon.naturalWidth || comp.icon.width || w;
        const natH = comp.icon.naturalHeight || comp.icon.height || h;
        const scale = comp.iconScale !== undefined ? comp.iconScale : 0.7;
        let drawW, drawH;
        if (comp.iconFit === 'stretch') { drawW = w * scale; drawH = h * scale; }
        else if (comp.iconFit === 'cover') { const f = Math.max(w / natW, h / natH) * scale; drawW = natW * f; drawH = natH * f; }
        else if (comp.iconFit === 'original') { drawW = natW * scale; drawH = natH * scale; }
        else { const f = Math.min(w / natW, h / natH) * scale; drawW = natW * f; drawH = natH * f; }
        const ix = x + (w - drawW) / 2 + (comp.iconOffsetX || 0);
        const iy = y + (h - drawH) / 2 + (comp.iconOffsetY || 0);
        let filter = '';
        if (comp.iconFilter === 'grayscale') filter = S.filter('<feColorMatrix type="saturate" values="0"/>');
        else if (comp.iconFilter === 'silhouette') filter = S.filter('<feFlood flood-color="#050508"/><feComposite in2="SourceAlpha" operator="in"/>');
        else if (comp.iconFilter === 'glow') {
          filter = S.filter('<feComponentTransfer><feFuncR type="linear" slope="1.4"/><feFuncG type="linear" slope="1.4"/><feFuncB type="linear" slope="1.4"/></feComponentTransfer><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#0d99ff" flood-opacity="0.8"/>');
        }
        const clip = S.clip(shapeD());
        const href = xmlEsc(comp.iconSrc);
        const iconAlpha = comp.iconOpacity !== undefined ? comp.iconOpacity : 0.8;
        parts.push(`<g clip-path="url(#${clip})"><image x="${svgNum(ix)}" y="${svgNum(iy)}" width="${svgNum(drawW)}" height="${svgNum(drawH)}" preserveAspectRatio="none" href="${href}" xlink:href="${href}"${iconAlpha < 1 ? ` opacity="${svgNum(iconAlpha)}"` : ''}${filter ? ` filter="url(#${filter})"` : ''}/></g>`);
      }

      // 5. Anel
      if (comp.type === 'Anel') parts.push(svgRing(S, comp, x, y, w, h));

      // 6. Borda (desenhada para dentro: traço centrado a meia largura da borda)
      if (comp.borderWidth > 0) {
        const bw = comp.borderWidth;
        const style = comp.borderStyle;
        let strokeAttr = svgPaint('stroke', comp.borderColor);
        let extra = '';
        if (style === 'bevel' || style === 'inset') {
          const strength = comp.bevelStrength ?? 0.35;
          const light = mixHex(hex6(comp.borderColor), '#ffffff', strength);
          const dark = mixHex(hex6(comp.borderColor), '#000000', Math.min(0.85, strength + 0.35));
          const id = S.gradient('linearGradient', { x1: x, y1: y, x2: x, y2: y + h },
            [[0, style === 'bevel' ? light : dark, 1], [0.45, comp.borderColor, 1], [1, style === 'bevel' ? dark : light, 1]]);
          strokeAttr = `stroke="url(#${id})"`;
        } else if (style === 'dashed') {
          extra = ` stroke-dasharray="${svgNum(Math.max(4, bw * 3))} ${svgNum(Math.max(3, bw * 2))}"`;
        }
        if (style === 'glow') {
          const f = S.filter('<feGaussianBlur stdDeviation="6"/>');
          parts.push(`<path d="${shapeD(bw / 2)}" fill="none" ${strokeAttr} stroke-width="${svgNum(bw)}" filter="url(#${f})"/>`);
        }
        if (style === 'double') {
          const line = Math.max(1, bw / 3);
          parts.push(`<path d="${shapeD(line / 2)}" fill="none" ${strokeAttr} stroke-width="${svgNum(line)}"/>`);
          parts.push(`<path d="${shapeD(bw - line / 2)}" fill="none" ${strokeAttr} stroke-width="${svgNum(line)}"/>`);
        } else {
          parts.push(`<path d="${shapeD(bw / 2)}" fill="none" ${strokeAttr} stroke-width="${svgNum(bw)}"${extra}/>`);
        }
      }

      // 7. Texto
      if (componentLabel(comp) && !opts.ignoreText) parts.push(svgText(S, comp, x, y, w, h));

      return `<g data-name="${xmlEsc(comp.name)}"${layerAlpha < 1 ? ` opacity="${svgNum(layerAlpha)}"` : ''}>${shadow}<g${rot}>${parts.join('')}</g></g>`;
    }

    // Google Fonts usadas no SVG, com os mesmos pesos que a página carrega (lidos dos <link> do <head>).
    function svgFontImport(S) {
      if (S.fonts.size === 0) return '';
      const specs = new Map();
      document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]').forEach(l => {
        new URL(l.href).searchParams.getAll('family').forEach(f => specs.set(f.split(':')[0], f));
      });
      const families = [...S.fonts.keys()].filter(f => specs.has(f)).map(f => `family=${specs.get(f).replace(/ /g, '+')}`);
      return families.length ? `@import url('https://fonts.googleapis.com/css2?${families.join('&')}&display=swap');` : '';
    }

    function svgDocument(S, body, vb, outW, outH) {
      const fonts = svgFontImport(S);
      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgNum(outW)}" height="${svgNum(outH)}" viewBox="${vb.map(svgNum).join(' ')}">`,
        fonts ? `<style><![CDATA[${fonts}]]></style>` : '',
        S.defs.length ? `<defs>${S.defs.join('')}</defs>` : '',
        body,
        '</svg>',
        ''
      ].filter(Boolean).join('\n');
    }

    // Item: mesmo recorte do PNG (padding de 32 px, sem rotação, camada oculta também sai).
    function componentSvgString(comp, scale = 1, forceCleanFrame = false) {
      const S = svgContext();
      const body = componentToSvg(S, { ...comp, visible: true, rotation: 0 }, -comp.x + EXPORT_PAD, -comp.y + EXPORT_PAD, {
        ignoreIcon: forceCleanFrame || comp.exportWithIcon === false,
        ignoreText: forceCleanFrame || comp.exportWithText === false
      });
      const vw = comp.w + EXPORT_PAD * 2, vh = comp.h + EXPORT_PAD * 2;
      return svgDocument(S, body, [0, 0, vw, vh], vw * scale, vh * scale);
    }

    // Cena: fundo e rascunho conforme as opções da cena, itens na ordem das camadas (ocultos não saem).
    function sceneSvgString(scale = 1) {
      const S = svgContext();
      const W = state.canvasWidth, H = state.canvasHeight;
      const body = [];
      if (state.sceneBackground.mode === 'color') body.push(`<rect width="${W}" height="${H}" fill="${hex6(state.sceneBackground.color)}"/>`);
      if (state.reference.img && state.reference.visible && state.reference.includeInSceneExport && state.reference.src) {
        const r = referenceImageRect();
        const href = xmlEsc(state.reference.src);
        body.push(`<image x="${svgNum(r.x)}" y="${svgNum(r.y)}" width="${svgNum(r.w)}" height="${svgNum(r.h)}" preserveAspectRatio="none" href="${href}" xlink:href="${href}" opacity="${svgNum(state.reference.opacity)}"/>`);
      }
      state.components.forEach(comp => body.push(componentToSvg(S, comp)));
      return svgDocument(S, body.join('\n'), [0, 0, W, H], W * scale, H * scale);
    }

