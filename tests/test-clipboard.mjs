// Copiar / recortar / colar (R4), pelos mesmos eventos copy/cut/paste que o Ctrl+C/X/V dispara.
import { launch, reporter } from './harness.mjs';

const { check, finish } = reporter();
const page = await launch('clipboard', 9338);
try {
  await page.open();
  const o = JSON.parse(await page.evaluate(`(async () => {
    const o = {};
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const fire = (type, dt, target = document.body) => {
      const ev = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
      target.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    Studio.clear();
    const a = Studio.create('Slot', { name: 'A', x: 100, y: 100 });
    await Studio.setIcon(a, '<rect x="10" y="10" width="40" height="40" fill="red"/>');
    const b = Studio.create('Botão', { name: 'B', x: 300, y: 100 });
    const c = Studio.text('C', { name: 'C', x: 600, y: 100 });
    const g = Studio.group([a, b], 'G1');
    Studio.select([a, b]);
    await wait(700);

    // Ctrl+C
    const dt = new DataTransfer();
    o.copyPrevented = fire('copy', dt);
    const payload = JSON.parse(dt.getData('text/plain'));
    o.payloadFormat = payload.format === 'devui-components' && payload.components.length === 2;
    o.payloadLayerOrder = payload.components.map(x => x.name).join() === 'A,B';
    o.payloadNoImageObject = payload.components.every(x => !('icon' in x));
    o.payloadKeepsIconSrc = !!payload.components[0].iconSrc && payload.components[0].iconSrc.startsWith('data:');
    o.payloadGroup = payload.groups.length === 1 && payload.groups[0].name === 'G1';

    // Ctrl+V
    const n0 = Studio.getAll().length;
    o.pastePrevented = fire('paste', dt);
    await wait(300);
    const all1 = Studio.getAll();
    const p = all1.slice(-2);
    o.pastedTwoOnTop = all1.length === n0 + 2 && p.map(x => x.name).join() === 'A,B';
    o.newIds = p.every(x => x.id !== a.id && x.id !== b.id);
    o.offset16 = p[0].x === 116 && p[0].y === 116;
    o.newGroup = !!p[0].groupId && p[0].groupId === p[1].groupId && p[0].groupId !== g.id;
    o.iconRehydrated = p[0].icon instanceof HTMLImageElement && p[0].icon.naturalWidth > 0;
    o.selectionIsPasted = Studio.getSelected().map(x => x.id).join() === p.map(x => x.id).join();
    o.originalsUntouched = a.x === 100 && a.groupId === g.id;

    // Ctrl+V de novo: +32 (depois da janela de 500 ms do histórico, para virar um passo próprio)
    await wait(700);
    fire('paste', dt);
    await wait(300);
    o.secondPasteOffset32 = Studio.getAll().slice(-2)[0].x === 132;

    // Undo desfaz uma colagem inteira
    await wait(700);
    const nBeforeUndo = Studio.getAll().length;
    Studio.undo();
    await wait(100);
    o.undoOneStep = Studio.getAll().length === nBeforeUndo - 2;
    await wait(700);

    // Ctrl+X
    Studio.select(Studio.get('C'));
    const dtCut = new DataTransfer();
    const nCut = Studio.getAll().length;
    fire('cut', dtCut);
    o.cutRemoves = Studio.getAll().length === nCut - 1 && !Studio.getAll().some(x => x.id === c.id);
    fire('paste', dtCut);
    await wait(300);
    o.cutThenPaste = Studio.getAll().length === nCut && Studio.getAll().slice(-1)[0].name === 'C';

    // Bloqueios
    const nBlock = Studio.getAll().length;
    const input = document.getElementById('propName');
    input.focus();
    fire('paste', dt, input);
    await wait(200);
    o.inputBlocksPaste = Studio.getAll().length === nBlock;
    input.blur();
    const dtForeign = new DataTransfer();
    dtForeign.setData('text/plain', 'texto de outro app');
    o.foreignTextIgnored = !fire('paste', dtForeign);
    await wait(200);
    o.foreignTextNoChange = Studio.getAll().length === nBlock;
    const dtEvil = new DataTransfer();
    dtEvil.setData('text/plain', JSON.stringify({ format: 'devui-components', version: 1, components: [{ type: 'Evil', name: 'x' }], groups: [] }));
    fire('paste', dtEvil);
    await wait(200);
    o.unknownTypeIgnored = Studio.getAll().length === nBlock;
    const dtBroken = new DataTransfer();
    dtBroken.setData('text/plain', '{"format": "devui-components", broken');
    fire('paste', dtBroken);
    await wait(200);
    o.brokenJsonIgnored = Studio.getAll().length === nBlock;
    toggleScriptModal(true);
    fire('paste', dt);
    await wait(200);
    o.workbenchBlocksPaste = Studio.getAll().length === nBlock;
    toggleScriptModal(false);

    // Pacote mínimo (campos ausentes): normalizeComponent completa
    const dtOld = new DataTransfer();
    dtOld.setData('text/plain', JSON.stringify({ format: 'devui-components', version: 1, components: [{ type: 'Painel', name: 'Old', x: 5, y: 5, w: 50, h: 50 }], groups: [] }));
    fire('paste', dtOld);
    await wait(200);
    const old = Studio.getAll().slice(-1)[0];
    o.minimalPayloadNormalized = old.name === 'Old' && old.borderStyle !== undefined && old.ringShowValue === false;

    // API Studio
    const nApi = Studio.getAll().length;
    o.studioCopy = Studio.copy('B') >= 1;
    const pasted = await Studio.paste();
    o.studioPaste = Array.isArray(pasted) && Studio.getAll().length === nApi + pasted.length;
    return JSON.stringify(o);
  })()`));
  for (const [k, v] of Object.entries(o)) check(k, v);

  // ---- R5: colar imagem ----
  const img = JSON.parse(await page.evaluate(`(async () => {
    const o = {};
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const png = async (w, h, color) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.fillStyle = color; cx.fillRect(0, 0, w, h);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      return new File([blob], 'print.png', { type: 'image/png' });
    };
    const pasteWith = (file, text, target = document.body) => {
      const dt = new DataTransfer();
      if (file) dt.items.add(file);
      if (text) dt.setData('text/plain', text);
      const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      target.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    const ctrlV = (shift) => window.dispatchEvent(new KeyboardEvent('keydown', { key: shift ? 'V' : 'v', ctrlKey: true, shiftKey: shift, bubbles: true }));
    const last = () => Studio.getAll().slice(-1)[0];

    Studio.clear();
    Studio.create('Slot', { name: 'S1', x: 100, y: 100 });
    Studio.create('Slot', { name: 'S2', x: 300, y: 100 });
    Studio.select([]);
    await wait(700);

    // Ctrl+V sem seleção: item novo do tamanho da imagem, centralizado, sem fundo/borda/sombra.
    let n = Studio.getAll().length;
    ctrlV(false);
    o.imagePastePrevented = pasteWith(await png(200, 100, '#ff0000'));
    await wait(300);
    const a = last();
    o.newItemCreated = Studio.getAll().length === n + 1 && a.name.startsWith('Imagem');
    o.naturalSize = a.w === 200 && a.h === 100;
    o.centered = a.x === 860 && a.y === 490;
    o.bareItem = a.fillOpacity === 0 && a.borderWidth === 0 && a.dropShadow === false && a.innerShadow === false;
    o.stretch1to1 = a.iconFit === 'stretch' && a.iconScale === 1 && a.iconOpacity === 1;
    o.iconLoaded = a.icon instanceof HTMLImageElement && a.icon.naturalWidth === 200 && a.iconSrc.startsWith('data:image/png');
    o.pastedIsSelected = state.selectedId === a.id;
    o.rendersRed = (() => {
      const d = document.getElementById('mainCanvas').getContext('2d').getImageData(960, 540, 1, 1).data;
      return d[0] > 200 && d[1] < 40 && d[2] < 40;
    })();
    await wait(700);
    Studio.undo();
    o.undoRemovesImageItem = Studio.getAll().length === n;
    await wait(700);

    // Imagem maior que a cena: 80% da cena, mantendo a proporção.
    pasteWith(await png(4000, 1000, '#00ff00'));
    await wait(300);
    o.bigImageFits = last().w === 1536 && last().h === 384;

    // O undo recria os objetos a partir do snapshot: buscar pelo nome daqui em diante.
    const s1 = Studio.get('S1'), s2 = Studio.get('S2');

    // Ctrl+V com seleção: NÃO mexe no ícone da seleção, cria item novo.
    Studio.select([s1, s2]);
    n = Studio.getAll().length;
    ctrlV(false);
    pasteWith(await png(50, 50, '#0000ff'));
    await wait(300);
    o.plainPasteKeepsSelectionIcon = !s1.iconSrc && !s2.iconSrc && Studio.getAll().length === n + 1;

    // Ctrl+Shift+V com seleção: troca o ícone de todos os selecionados.
    Studio.select([s1, s2]);
    n = Studio.getAll().length;
    ctrlV(true);
    pasteWith(await png(64, 64, '#ffff00'));
    await wait(300);
    o.replaceAppliesToSelection = !!s1.iconSrc && s1.iconSrc === s2.iconSrc && s1.icon instanceof HTMLImageElement && Studio.getAll().length === n;

    // Ctrl+Shift+V sem seleção: cria item novo.
    Studio.select([]);
    n = Studio.getAll().length;
    ctrlV(true);
    pasteWith(await png(30, 30, '#ffffff'));
    await wait(300);
    o.replaceWithoutSelectionCreates = Studio.getAll().length === n + 1;

    // Pedido de troca expira: Ctrl+Shift+V sem colar, e 1 s depois um paste (menu de contexto) cria item.
    Studio.select([s1]);
    const before = s1.iconSrc;
    ctrlV(true);
    await wait(1100);
    n = Studio.getAll().length;
    pasteWith(await png(20, 20, '#123456'));
    await wait(300);
    o.replaceRequestExpires = s1.iconSrc === before && Studio.getAll().length === n + 1;

    // Pacote do Studio + imagem no clipboard: o pacote vence.
    Studio.select([s2]);
    const payloadText = JSON.stringify({ format: 'devui-components', version: 1, copyId: 'x1', components: [{ type: 'Painel', name: 'Do pacote', x: 1, y: 1, w: 40, h: 40 }], groups: [] });
    pasteWith(await png(10, 10, '#000000'), payloadText);
    await wait(300);
    o.payloadBeatsImage = last().name === 'Do pacote';

    // Texto de outro app + imagem (ex.: copiar do Word): a imagem entra.
    n = Studio.getAll().length;
    pasteWith(await png(10, 10, '#abcdef'), 'legenda qualquer');
    await wait(300);
    o.imageBeatsForeignText = Studio.getAll().length === n + 1 && last().name.startsWith('Imagem');

    // Arquivo corrompido: nada é criado.
    n = Studio.getAll().length;
    pasteWith(new File([new Uint8Array([1, 2, 3, 4])], 'x.png', { type: 'image/png' }));
    await wait(400);
    o.corruptImageIgnored = Studio.getAll().length === n;

    // Dentro de um campo de texto, o navegador cuida da colagem.
    const input = document.getElementById('propName');
    input.focus();
    n = Studio.getAll().length;
    pasteWith(await png(10, 10, '#ff00ff'), null, input);
    await wait(300);
    o.inputBlocksImagePaste = Studio.getAll().length === n;
    input.blur();
    return JSON.stringify(o);
  })()`));
  for (const [k, v] of Object.entries(img)) check(`imagem: ${k}`, v);

  check('zero erros de runtime', page.errors.length === 0, page.errors.join(' | '));
} catch (e) {
  check('execução do teste', false, e.stack || String(e));
} finally {
  page.close();
}
finish();
