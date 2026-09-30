    // ===== Idioma (PT / EN) =====
    // O texto em português é a própria chave: o HTML continua legível e só o inglês precisa de dicionário.
    // Estático: marque o elemento com data-i18n (texto), data-i18n-title ou data-i18n-ph (placeholder).
    // Dinâmico: t('Texto com {var}', { var }).
    const LANG_KEY = 'game_dev_ui_studio_lang';
    const EN = {
      // Tipos de componente
      'Botão': 'Button', 'Barra': 'Bar', 'Painel': 'Panel', 'Texto': 'Text', 'Anel': 'Ring', 'Grupo': 'Group',
      'Novo texto': 'New text', 'EQUIPAR': 'EQUIP',

      // Header e toolbar
      'Salvar': 'Save', 'Abrir': 'Open', '+ Botão': '+ Button', '+ Barra': '+ Bar', '+ Painel': '+ Panel',
      '+ Texto': '+ Text', '+ Anel': '+ Ring', 'Item': 'Item', 'Cena': 'Scene',
      'Salvar todo o layout em arquivo (.json)': 'Save the whole layout to a file (.json)',
      'Carregar layout salvo (.json)': 'Load a saved layout (.json)',
      'Desfazer (Ctrl+Z)': 'Undo (Ctrl+Z)', 'Refazer (Ctrl+Shift+Z / Ctrl+Y)': 'Redo (Ctrl+Shift+Z / Ctrl+Y)',
      'Caixa de texto (T)': 'Text box (T)',
      'Slot de inventário': 'Inventory slot', 'Barra (vida, mana, XP)': 'Bar (health, mana, XP)', 'Painel / janela': 'Panel / window',
      'Exportar item selecionado (PNG)': 'Export selected item (PNG)', 'Exportar a cena inteira (PNG)': 'Export the whole scene (PNG)',
      'Exportar tudo em ZIP com manifest para Unity, Unreal e Godot': 'Export everything as a ZIP with a Unity, Unreal and Godot manifest',
      'Medidor circular (vida, cooldown, atributo)': 'Circular gauge (health, cooldown, stat)',
      'Configurações da cena': 'Scene settings', 'Diminuir zoom (Ctrl −)': 'Zoom out (Ctrl −)', 'Aumentar zoom (Ctrl +)': 'Zoom in (Ctrl +)',
      'Enquadrar a cena (Shift+1)': 'Fit scene to view (Shift+1)', 'Zoom 100% (Shift+0)': 'Zoom 100% (Shift+0)', 'Scripts / Workbench (Ctrl+J)': 'Scripts / Workbench (Ctrl+J)',
      'Exportar (formato, resolução e destino)': 'Export (format, resolution and target)',
      'Formato': 'Format', 'Resolução': 'Resolution',
      'Item selecionado': 'Selected item', 'Só a seleção, no formato escolhido': 'Just the selection, in the chosen format',
      'Cena inteira': 'Whole scene', 'Uma imagem com tudo que está no canvas': 'One image with everything on the canvas',
      'Importar layout para a cena (soma os itens de outro .json aos atuais; também dá para arrastar o .json no canvas)':
        'Import layout into the scene (adds the items of another .json to the current ones; you can also drop the .json on the canvas)',
      '{n} item(ns) importado(s) para a cena!': '{n} item(s) imported into the scene!',
      '{n} item(ns) importado(s), escalados de {from} para caber na cena.': '{n} item(s) imported, scaled from {from} to fit the scene.',
      'Mesclar em uma imagem (Ctrl+E)': 'Merge into one image (Ctrl+E)', 'Mesclado': 'Merged',
      'Selecione 2 ou mais itens visíveis para mesclar.': 'Select 2 or more visible items to merge.',
      'Nada visível para mesclar.': 'Nothing visible to merge.',
      '{n} itens mesclados em "{name}". Ctrl+Z desfaz.': '{n} items merged into "{name}". Ctrl+Z undoes it.',
      'Resolução da cena': 'Scene resolution', 'Girar a cena (retrato ⇄ paisagem)': 'Rotate the scene (portrait ⇄ landscape)',
      'Área segura do aparelho (notch, barras do sistema)': 'Device safe area (notch, system bars)',
      'Desktop / Console': 'Desktop / Console', 'Celular (retrato)': 'Phone (portrait)', 'Tablet (paisagem)': 'Tablet (landscape)',
      'Personalizada': 'Custom', 'Cena girada: {res}': 'Scene rotated: {res}',
      'Arraste para ajustar a largura (duplo clique volta ao padrão)': 'Drag to adjust the width (double-click resets)',
      'Textura (grão e scanlines)': 'Texture (grain and scanlines)',
      'Âncora': 'Anchor', 'Esticar H': 'Stretch H', 'Esticar V': 'Stretch V', 'Auto': 'Auto',
      'Âncora: como o item se comporta quando a tela muda de proporção (vai para Unity, Unreal e Godot)':
        'Anchor: how the item behaves when the screen changes aspect ratio (exported to Unity, Unreal and Godot)',
      'Escolher a âncora pela posição do item na cena (vale para toda a seleção)': 'Pick the anchor from the item position in the scene (applies to the whole selection)',
      'Âncora automática em {n} item(ns).': 'Auto anchor on {n} item(s).',
      'Resolução: {res} ({n} item(ns) ajustado(s) pelas âncoras)': 'Resolution: {res} ({n} item(s) adjusted by anchors)',
      'Cena girada: {res} ({n} item(ns) ajustado(s) pelas âncoras)': 'Scene rotated: {res} ({n} item(s) adjusted by anchors)',
      'Visão': 'Vision', 'Normal': 'Normal', 'Protanopia (vermelho)': 'Protanopia (red)', 'Deuteranopia (verde)': 'Deuteranopia (green)',
      'Tritanopia (azul)': 'Tritanopia (blue)', 'Tons de cinza': 'Grayscale',
      'Simular como pessoas com daltonismo veem a cena (só na tela)': 'Simulate how color-blind people see the scene (screen only)',
      'Teste de tradução': 'Translation test',
      'Alonga e acentua os textos como uma tradução faria e marca em vermelho o que estourar (só na tela)':
        'Lengthens and accents texts like a translation would and marks overflows in red (screen only)',
      '{n} estouro(s)': '{n} overflow(s)', 'tudo cabe': 'everything fits',
      'Contraste: fundo transparente, depende do que ficar atrás no jogo': 'Contrast: transparent background, depends on what is behind it in the game',
      'Contraste {r}:1 ✓ legível (mínimo {need}:1)': 'Contrast {r}:1 ✓ readable (minimum {need}:1)',
      'Contraste {r}:1 ⚠ baixo: o mínimo é {need}:1': 'Contrast {r}:1 ⚠ low: the minimum is {need}:1',
      'Grão de filme e linhas de monitor antigo por cima do preenchimento. Sai igual no PNG e no SVG.':
        'Film grain and old-monitor lines over the fill. Exports the same in PNG and SVG.',
      'Ruído': 'Noise', 'Scanlines': 'Scanlines', 'Espaçamento (px)': 'Spacing (px)',
      'Distância entre as linhas (px)': 'Distance between lines (px)',
      'Textura (ruído/scanlines) estica junto com o centro no modo Sliced. Use Tiled no centro ou aplique a textura na engine.':
        'Texture (noise/scanlines) stretches with the center in Sliced mode. Use Tiled for the center or apply the texture in the engine.',
      'Gerar o código Studio que recria a seleção': 'Generate the Studio code that recreates the selection',
      'Script da seleção (JS)': 'Selection script (JS)', 'Código Studio para recriar ou compartilhar': 'Studio code to recreate or share',
      'Gerar o código Studio que recria a seleção (sem seleção: a cena inteira)': 'Generate the Studio code that recreates the selection (no selection: the whole scene)',
      '📋 Da seleção': '📋 From selection',
      'Gerado pelo Game Dev UI Studio (cena {w}×{h}). {n} item(ns).': 'Generated by Game Dev UI Studio ({w}×{h} scene). {n} item(s).',
      'Mude ox/oy para recriar o conjunto em outro lugar.': 'Change ox/oy to recreate the set somewhere else.',
      'imagem de {kb} KB omitida': '{kb} KB image omitted',
      'Nenhum componente para gerar script.': 'No components to generate a script from.',
      'Script de {n} item(ns) no editor. Revise e execute (Ctrl+Enter).': 'Script for {n} item(s) in the editor. Review and run (Ctrl+Enter).',
      'Sem seleção: script da cena inteira no editor.': 'No selection: whole-scene script in the editor.',
      'Pacote ZIP para engines': 'Engine ZIP package', 'PNGs 9-slice + manifest Unity, Unreal e Godot': '9-slice PNGs + Unity, Unreal and Godot manifest',

      // Rascunho
      'Rascunho / Blockout': 'Reference / Blockout', 'Remover': 'Remove', 'PNG, JPG ou WebP': 'PNG, JPG or WebP',
      'Opacidade:': 'Opacity:', 'Incluir rascunho ao exportar cena': 'Include reference in scene export',
      'Clique ou arraste seu Mockup 1080p': 'Click or drop your 1080p mockup',
      'Esticar': 'Stretch', 'Manter Proporção': 'Keep Aspect',

      // Camadas
      'Camadas da Cena': 'Scene Layers', 'Limpar Tudo': 'Clear All', 'Buscar camada...': 'Search layers...',
      'Trazer para frente (Ctrl+])': 'Bring forward (Ctrl+])', 'Enviar para trás (Ctrl+[)': 'Send backward (Ctrl+[)',
      'Agrupar selecionados (Ctrl+G)': 'Group selection (Ctrl+G)', 'Desagrupar (Ctrl+Shift+G)': 'Ungroup (Ctrl+Shift+G)',
      'Duplicar (Ctrl+D)': 'Duplicate (Ctrl+D)', 'Excluir (Del)': 'Delete (Del)',
      '{n} componente(s)': '{n} component(s)', '{n} componente(s) · {g} grupo(s)': '{n} component(s) · {g} group(s)',
      'Nenhum elemento adicionado. Use os botões no topo para criar.': 'Nothing here yet. Use the buttons at the top to add elements.',
      'Duplo clique para renomear': 'Double-click to rename', 'Ocultar': 'Hide', 'Mostrar': 'Show',
      'Destrancar': 'Unlock', 'Trancar (o clique no canvas atravessa)': 'Lock (canvas clicks pass through)',
      'Desagrupar': 'Ungroup', 'Nenhuma camada encontrada.': 'No layers match.',

      // Inspector
      'Selecione um elemento na cena ou nas camadas para editar.': 'Select an element in the scene or the layers list to edit it.',
      '{n} selecionados · estilo vale para todos, posição só para o principal': '{n} selected · style applies to all, position only to the primary',
      'Posição e Dimensão': 'Position & Size', 'Travar Quadrado (1:1)': 'Make Square (1:1)', 'Opacidade da Camada': 'Layer Opacity',
      'Texto / Rótulo': 'Text / Label', 'Digite o texto (Enter quebra linha)': 'Type the text (Enter adds a line)',
      'Tamanho da fonte': 'Font size', 'Esquerda': 'Left', 'Centro': 'Center', 'Direita': 'Right',
      'Topo': 'Top', 'Meio': 'Middle', 'Base': 'Bottom',
      'Espaçamento entre letras (px)': 'Letter spacing (px)', 'Altura da linha': 'Line height',
      'Efeito': 'Effect', 'Nenhum': 'None', 'Sombra': 'Shadow', 'Brilho (Glow)': 'Glow',
      'Contorno do texto (px)': 'Text outline (px)', 'Contorno': 'Outline', 'cor': 'color',
      'MAIÚSCULAS': 'UPPERCASE', 'Incluir texto no PNG exportado': 'Include text in exported PNG',
      'Barra de Progresso': 'Progress Bar', 'Direção': 'Direction',
      'Esquerda → Direita': 'Left → Right', 'Direita → Esquerda': 'Right → Left', 'Baixo → Cima': 'Bottom → Top', 'Cima → Baixo': 'Top → Bottom',
      'Segmentos (0 = contínua)': 'Segments (0 = continuous)', 'Seg.': 'Seg.', 'Cor do trilho vazio': 'Empty track color', 'trilho': 'track',
      'Medidor Circular': 'Circular Gauge', 'Espessura do anel': 'Ring thickness', 'Esp.': 'Thick.',
      'Ângulo inicial (graus, -90 = topo)': 'Start angle (degrees, -90 = top)', 'início': 'start', 'fim': 'end',
      'Brilho no arco': 'Arc glow',
      'Mostrar valor no centro': 'Show value in the center',
      'O número acompanha o valor do medidor. Desligue para um anel sem texto ou para usar o campo Texto.': 'The number follows the gauge value. Turn it off for a ring without text or to use the Text field.',
      'Imagem / Ícone Embutido': 'Embedded Image / Icon', 'Clique aqui ou arraste a imagem sobre o item': 'Click here or drop an image onto the item',
      'Escolher Imagem (PNG/JPG)': 'Choose Image (PNG/JPG)', 'Trocar Imagem': 'Replace Image',
      'Ajuste': 'Fit', 'Conter (proporção)': 'Contain (keep aspect)', 'Cobrir (corta)': 'Cover (crops)',
      'Esticar (preenche tudo)': 'Stretch (fill box)', 'Original 1:1 (px reais)': 'Original 1:1 (real px)',
      'Escala no Componente': 'Scale in Component', 'Opacidade da Imagem': 'Image Opacity',
      'Deslocamento horizontal': 'Horizontal offset', 'Deslocamento vertical': 'Vertical offset',
      'Filtro / Efeito': 'Filter / Effect', 'Original Colorido': 'Original Color', 'Silhueta Preta': 'Black Silhouette',
      'Escala de Cinza': 'Grayscale', 'Iluminado (High Contrast)': 'Lit (High Contrast)',
      'Incluir imagem no PNG individual': 'Include image in single PNG',
      'Cantos': 'Corners', 'Estilo do canto': 'Corner style', 'Arredondado': 'Rounded', 'Chanfrado (corte)': 'Chamfered (cut)',
      'Cantos Livres': 'Per-corner', 'Canto Único': 'Uniform',
      'Preenchimento': 'Fill', 'Gradiente': 'Gradient', 'Sólido': 'Solid', 'Direção do gradiente': 'Gradient direction',
      'Vertical ↓': 'Vertical ↓', 'Horizontal →': 'Horizontal →', 'Diagonal ↘': 'Diagonal ↘', 'Radial ◉': 'Radial ◉',
      'Opacidade do Fundo': 'Fill Opacity', '0% (Vazado)': '0% (Hollow)', '100% (Sólido)': '100% (Solid)',
      'Cor 1': 'Color 1', 'Cor 2': 'Color 2',
      'Borda / Moldura': 'Border / Frame', 'Plana (Solid)': 'Flat (Solid)', 'Bevel 3D (relevo)': 'Bevel 3D (raised)',
      'Inset (afundado)': 'Inset (sunken)', 'Glow Neon / Raridade': 'Neon Glow / Rarity', 'Tracejada': 'Dashed', 'Dupla': 'Double',
      'Cor Borda': 'Border Color', 'Intensidade do relevo': 'Bevel strength',
      'Profundidade & Sombra': 'Depth & Shadow', 'Sombra Externa (Drop Shadow)': 'Drop Shadow', 'Opacidade': 'Opacity',
      'Desfoque (blur)': 'Blur', 'Encaixe Interno (Inner Shadow)': 'Inner Shadow',
      'Guia 9-Slice (Unity / Unreal)': '9-Slice Guide (Unity / Unreal)',
      'Copiar Metadados JSON': 'Copy JSON Metadata', 'Copiado!': 'Copied!',

      // Bancada de scripts
      'Bancada de Scripts & Console': 'Script Workbench & Console',
      'Automatize, crie grids de inventário, altere temas e manipule elementos via código JavaScript.': 'Automate layouts, build inventory grids, restyle themes and edit elements with JavaScript.',
      'Templates:': 'Templates:', '⭐ Upgrade Stats': '⭐ Upgrade Stats', '🎒 Grid Inventário 4x4': '🎒 Inventory Grid 4x4',
      '⚔️ HUD RPG Completo': '⚔️ Full RPG HUD', '🔥 Hotbar 1 a 8': '🔥 Hotbar 1 to 8', '🎨 Pintar Botões Dourado': '🎨 Paint Buttons Gold',
      '📐 Distribuir Horizontal': '📐 Distribute Horizontally',
      'Meus templates:': 'My templates:', 'Nome do template': 'Template name', 'Cancelar': 'Cancel',
      '💾 Salvar como template': '💾 Save as template', 'Exportar': 'Export', 'Importar': 'Import',
      'Guarda o código do editor como um novo template': 'Store the editor code as a new template',
      'Baixar meus templates (.json) para compartilhar': 'Download my templates (.json) to share',
      'Importar templates de um .json': 'Import templates from a .json file',
      'Editor (JavaScript / Studio API):': 'Editor (JavaScript / Studio API):', 'Ctrl+Enter para executar': 'Ctrl+Enter to run',
      'Limpar': 'Clear',
      '// Use "Studio" ou "figma" diretamente aqui ou no Console (F12). Digite Studio.help() para ver a lista de comandos.': '// Use "Studio" or "figma" here or in the browser console (F12). Type Studio.help() to list the commands.',
      'Atalho:': 'Shortcut:', '⚠ Execute apenas scripts de fontes confiáveis': '⚠ Only run scripts from sources you trust',
      'Scripts rodam com acesso total à página e ao seu projeto.': 'Scripts run with full access to the page and your project.',
      'Limpar Código': 'Clear Code', 'Executar Script': 'Run Script',
      'Nenhum template salvo. Escreva um script e clique em "Salvar como template".': 'No saved templates yet. Write a script and click "Save as template".',
      'Excluir template "{name}"?': 'Delete template "{name}"?', 'Excluir template': 'Delete template',
      'Escreva algum código antes de salvar.': 'Write some code before saving.',
      'Dê um nome ao template.': 'Give the template a name.',
      'Template "{name}" salvo!': 'Template "{name}" saved!', 'Template "{name}" atualizado!': 'Template "{name}" updated!',
      'Template "{name}" excluído.': 'Template "{name}" deleted.',
      'Não foi possível salvar: armazenamento do navegador cheio.': 'Could not save: browser storage is full.',
      'Nenhum template para exportar.': 'No templates to export.', '{n} template(s) exportado(s).': '{n} template(s) exported.',
      '{n} template(s) importado(s)!': '{n} template(s) imported!', 'Arquivo de templates inválido.': 'Invalid templates file.',
      '✓ executado em {ms} ms': '✓ ran in {ms} ms',

      // Toasts
      'Autosave cheio (imagens grandes). Use "Salvar" para não perder o projeto!': 'Autosave is full (large images). Use "Save" so you don\'t lose the project!',
      'Desfeito': 'Undone', 'Refeito': 'Redone',
      'Nenhum componente para salvar no layout!': 'Nothing to save in the layout!',
      'Layout do projeto salvo (.json)!': 'Project layout saved (.json)!',
      'Layout carregado ({n} componentes)!': 'Layout loaded ({n} components)!',
      'Arquivo de projeto inválido!': 'Invalid project file!', '👋 Boas-vindas': '👋 Welcome','Arquivo grande demais (máx. {n} MB).': 'File too large (max {n} MB).','Erro ao carregar JSON do projeto': 'Could not load the project JSON',
      'Selecione ao menos 1 elemento para agrupar!': 'Select at least 1 element to group!',
      'Criado: {name}': 'Created: {name}', 'Nenhum grupo selecionado para desagrupar!': 'No group selected to ungroup!',
      '{name} desagrupado!': '{name} ungrouped!',
      'Selecione um item na tela antes de adicionar a imagem!': 'Select an item before adding the image!',
      'Formato inválido! Envie PNG, JPG, WebP ou SVG.': 'Invalid format! Use PNG, JPG, WebP or SVG.',
      'Imagem carregada em "{name}"!': 'Image loaded into "{name}"!', 'Erro ao processar imagem.': 'Could not process the image.',
      'Imagem': 'Image', 'Imagem colada como "{name}"!': 'Image pasted as "{name}"!',
      'Buscar propriedade ( / )': 'Search property ( / )', 'Limpar busca (Esc)': 'Clear search (Esc)',
      'Recolher / expandir todas as seções': 'Collapse / expand all sections', 'Nenhuma propriedade encontrada.': 'No property found.',
      'Nativo': 'Native', 'Resolução do export (PNGs, manifest e cena Godot)': 'Export resolution (PNGs, manifest and Godot scene)',
      'Gerar estados hover/pressed no ZIP': 'Generate hover/pressed states in the ZIP',
      'O ZIP ganha _hover.png (mais claro) e _pressed.png (mais escuro), já ligados na Unity, Unreal e Godot': 'The ZIP gets _hover.png (lighter) and _pressed.png (darker), already wired in Unity, Unreal and Godot', 'Imagem aplicada em {n} item(ns)!': 'Image applied to {n} item(s)!',
      'Selecione um elemento antes de adicionar imagem!': 'Select an element before adding an image!',
      'Imagem removida': 'Image removed', 'Resolução: {res}': 'Resolution: {res}',
      'Snap 16px ativado': '16px snap on', 'Snap desativado': 'Snap off',
      '{n} elemento(s) excluído(s)!': '{n} element(s) deleted!', '{n} elemento(s) duplicado(s)!': '{n} element(s) duplicated!',
      '{n} elemento(s) copiado(s)!': '{n} element(s) copied!', '{n} elemento(s) recortado(s)!': '{n} element(s) cut!',
      '{n} elemento(s) colado(s)!': '{n} element(s) pasted!',
      'Remover todos os {n} componentes da cena? (Ctrl+Z desfaz)': 'Remove all {n} components from the scene? (Ctrl+Z undoes)',
      'Cena limpa! Ctrl+Z para desfazer.': 'Scene cleared! Ctrl+Z to undo.',
      'Slot de inventário adicionado!': 'Inventory slot added!', 'Botão adicionado!': 'Button added!',
      'Barra de HUD adicionada!': 'HUD bar added!', 'Painel adicionado!': 'Panel added!',
      'Texto adicionado! Edite no painel à direita.': 'Text added! Edit it in the right panel.',
      'Anel adicionado!': 'Ring added!',
      'Selecione uma imagem válida (PNG, JPG, WebP)': 'Choose a valid image (PNG, JPG, WebP)',
      'Rascunho carregado!': 'Reference loaded!', 'Erro ao processar imagem do rascunho.': 'Could not process the reference image.',
      'Rascunho do projeto': 'Project reference', 'Rascunho': 'Reference', 'Rascunho removido': 'Reference removed',
      'Selecione um componente primeiro!': 'Select a component first!', 'Exportado: {name}.png': 'Exported: {name}.png',
      'Exportado: {name}.svg': 'Exported: {name}.svg', 'Formato de Item e Cena (SVG = vetor, para sites)': 'Item and Scene format (SVG = vector, for websites)',
      'Cena exportada com sucesso!': 'Scene exported!', 'Nenhum componente para exportar!': 'Nothing to export!',
      'Compactando ZIP com metadados para Unity, Unreal e Godot...': 'Packing ZIP with Unity, Unreal and Godot metadata...',
      'Download do ZIP concluído!': 'ZIP download complete!', 'JSON 9-Slice copiado!': '9-slice JSON copied!',
      // Rodada 3
      'Forma': 'Shape', '+ Forma': '+ Shape', 'Forma: estrela, polígono, elipse, seta': 'Shape: star, polygon, ellipse, arrow',
      'Forma adicionada!': 'Shape added!',
      'Encaixar no grid ao mover e redimensionar': 'Snap to the grid when moving and resizing', 'Tamanho do grid': 'Grid size',
      'Mostrar grid na cena': 'Show grid on the scene', 'Réguas e guias (Shift+R)': 'Rulers and guides (Shift+R)',
      'Snap {n}px ativado': '{n}px snap on',
      'Girar (Shift = passos de 15°)': 'Rotate (Shift = 15° steps)', 'Remover todas as guias': 'Remove all guides',
      'Remover todas as {n} guias?': 'Remove all {n} guides?', 'Guias removidas.': 'Guides removed.',
      'Fundo': 'Background', 'Transparente': 'Transparent', 'Cor sólida': 'Solid color', 'Cor de fundo da cena': 'Scene background color',
      'Rotação (graus)': 'Rotation (degrees)', 'Zerar rotação': 'Reset rotation',
      'Alinhar à esquerda': 'Align left', 'Centralizar na horizontal': 'Center horizontally', 'Alinhar à direita': 'Align right',
      'Alinhar ao topo': 'Align top', 'Centralizar na vertical': 'Center vertically', 'Alinhar à base': 'Align bottom',
      'Distribuir na horizontal': 'Distribute horizontally', 'Distribuir na vertical': 'Distribute vertically',
      'Selecione 3 ou mais itens para distribuir.': 'Select 3 or more items to distribute.',
      'Estrela': 'Star', 'Triângulo': 'Triangle', 'Losango': 'Diamond', 'Hexágono': 'Hexagon', 'Polígono': 'Polygon',
      'Elipse / círculo': 'Ellipse / circle', 'Seta': 'Arrow', 'Pontas / lados': 'Points / sides', 'Profundidade da estrela': 'Star depth',
      'Efeitos': 'Effects', 'Aplicar um estilo pronto de sombra': 'Apply a ready-made shadow style', 'Personalizado': 'Custom',
      'Nenhuma sombra': 'No shadow', 'Suave': 'Soft', 'Profunda': 'Deep', 'Flutuante': 'Floating', 'Encaixe de slot': 'Slot socket',
      'Sombra projetada': 'Drop shadow',
      'Sombra caindo para fora do item: dá sensação de que ele flutua.': 'A shadow cast outside the item: makes it look like it floats.',
      'Sombra interna (encaixe)': 'Inner shadow (socket)',
      'Escurece a borda de cima por dentro: parece afundado, como um slot.': 'Darkens the top edge from inside: it looks sunken, like a slot.',
      'Intensidade': 'Intensity', 'Profundidade (px)': 'Depth (px)', 'Brilho na base': 'Bottom highlight',
      'Trazido para a frente': 'Brought to front', 'Enviado para o fundo': 'Sent to back'
    };

    function detectLanguage() {
      try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved === 'pt' || saved === 'en') return saved;
      } catch (err) {}
      return 'pt'; // padrão do produto; o seletor de idioma grava a escolha (LANG_KEY)
    }

    let currentLang = detectLanguage();
    // true enquanto um lote de mudanças é montado (cena de boas-vindas): renderScene, lista de
    // camadas e Inspector viram no-op e o chamador redesenha uma vez no fim com refreshAll().
    let renderSuspended = false;

    function t(key, vars) {
      let text = currentLang === 'en' && EN[key] !== undefined ? EN[key] : key;
      if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? vars[name] : match));
      return text;
    }

    function applyStaticTranslations() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.dataset.i18nKey === undefined) el.dataset.i18nKey = el.textContent.trim();
        el.textContent = t(el.dataset.i18nKey);
      });
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        if (el.dataset.i18nTitleKey === undefined) el.dataset.i18nTitleKey = el.getAttribute('title') || '';
        el.setAttribute('title', t(el.dataset.i18nTitleKey));
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        if (el.dataset.i18nPhKey === undefined) el.dataset.i18nPhKey = el.getAttribute('placeholder') || '';
        el.setAttribute('placeholder', t(el.dataset.i18nPhKey));
      });
      document.documentElement.lang = currentLang === 'en' ? 'en' : 'pt-BR';
    }

    function setLanguage(lang) {
      currentLang = lang === 'en' ? 'en' : 'pt';
      try { localStorage.setItem(LANG_KEY, currentLang); } catch (err) {}
      langSelect.value = currentLang;
      applyStaticTranslations();
      renderLayersList();
      syncInspector();
      syncReferenceControls();
      renderCustomTemplates();
      buildResolutionOptions();
      refreshExportScaleOptions();
      copyJSONLabel.textContent = t('Copiar Metadados JSON');
      if (isPristineWelcomeScene()) buildWelcomeScene();
      else rerunPresetInNewLanguage();
    }

    langSelect.addEventListener('change', () => setLanguage(langSelect.value));

    const AUTOSAVE_KEY = 'game_dev_ui_studio_autosave';
    const REF_AUTOSAVE_KEY = 'game_dev_ui_studio_autosave_ref';

