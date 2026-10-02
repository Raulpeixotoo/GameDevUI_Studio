# Game Dev UI Studio — Arquitetura e Processos

Documentação oficial do sistema: requisitos de produto (SRS/PRD), design técnico (TDD), API de scripts, pipeline de exportação e o playbook de processos dos agentes.

- **Arquivo da aplicação:** `devUI-Studio.html` (arquivo único)
- **Versão documentada:** Rodada 8: âncoras, acessibilidade, teste de tradução, tema da Godot, textura, templates bilíngues (R7: barra superior, mobile, mesclar/importar, script da seleção, Tailwind compilado). Formato de projeto 1.2, manifest v6
- **Testes:** `node tests/run-all.mjs` (Node 22+ e Chrome ou Edge)
- **Licença:** AGPL-3.0 (arquivo `LICENSE`)
- **Responsáveis:** @tech-lead e @product-spec, com seções de @script-dev, @backend-manifest e @engine-pipeline
- **Regras de convivência dos agentes:** ver `claude.md`

---

## Sumário

1. [Visão Geral & Escopo do Produto (PRD)](#1-visão-geral--escopo-do-produto-prd)
2. [Arquitetura Técnica & Estado (TDD)](#2-arquitetura-técnica--estado-tdd)
3. [API de Scripts (Studio / figma)](#3-api-de-scripts-studio--figma)
4. [Pipeline de Exportação & Engines](#4-pipeline-de-exportação--engines)
5. [POP — Playbook de Processos Multiagente](#5-pop--playbook-de-processos-multiagente)

---

## 1. Visão Geral & Escopo do Produto (PRD)

### 1.1 O que é
O Game Dev UI Studio é um editor de interfaces de jogo que roda no navegador, gratuito e de código aberto (AGPL-3.0). O usuário monta HUDs, inventários e menus sobre uma cena de 1920×1080 e exporta sprites prontos para 9-slice, com um manifest que diz à Unity, à Unreal e à Godot como fatiar e posicionar cada peça. Para a Godot 4, o ZIP traz também uma cena `.tscn` que monta o HUD inteiro. GameMaker, Defold e Phaser recebem as margens na ordem de cada engine.

**Público:** desenvolvedores indie que precisam de UI de jogo sem saber design avançado nem usar ferramentas pagas.

### 1.2 Restrições do produto
| Restrição | Motivo |
|---|---|
| Um único arquivo HTML | Baixar e abrir, sem instalação |
| Canvas 2D nativo, sem framework | Regra 2 do `claude.md`; controle total do PNG exportado |
| Tailwind compilado e embutido; JSZip via CDN | Regra 2 do `claude.md`. Desde a R7 o CSS do Tailwind é gerado por `node tools/build-css.mjs` e fica dentro do HTML (sem script de CDN). JSZip e fontes ainda pedem internet no primeiro carregamento |
| Base de design 1920×1080 | Regra 4 do `claude.md`. Há também 1280×720, 2560×1440, 3840×2160 e presets de celular e tablet (R7) |
| Idiomas PT e EN | Decisão do autor (R2) |

### 1.3 Canvas e cena
- **Resoluções (R7), em grupos no seletor da barra:**
  - Desktop / Console: 1280×720, 1920×1080 (padrão), 2560×1440, 3840×2160.
  - Celular (retrato): 1080×1920 (9:16), 1080×2400 (Android 20:9), 1170×2532 (iPhone).
  - Tablet (paisagem): 2048×1536 (iPad 4:3), 2732×2048 (iPad Pro).
  - O botão **girar** troca largura e altura (os itens não se movem). Resolução fora da lista (cena girada, projeto aberto) aparece no grupo "Personalizada".
- **Área segura (R7):** nos presets mobile, faixas listradas mostram notch, status bar e barra de gestos (valores em `SAFE_AREAS`: iPhone e iPad Pro pelos insets do Apple HIG; Android 20:9 com valores típicos, que variam por modelo). O botão ao lado liga/desliga (preferência do navegador). As bordas da área segura entram no snap. Não aparece no export; vai no manifest (`safeArea`).
- **Barra superior (R7):** 3 zonas. Esquerda: salvar, abrir, **importar para a cena**, desfazer/refazer e inserir. Centro: resolução, girar, área segura, snap, grid, réguas. Direita: zoom, Scripts, **Exportar ▾** e idioma.
- **Barra inferior do viewport (R8):** além de resolução e fundo, **Visão** simula protanopia, deuteranopia, tritanopia e tons de cinza (filtro SVG com as matrizes de Machado et al. 2009, só no canvas do editor) e **Teste de tradução** acentua e alonga os textos (+60% até 10 letras, +40% até 20, +30% acima, entre colchetes), marca em vermelho tracejado o que estourar a caixa e mostra a contagem. Nada disso entra no export.
- **Painéis laterais (R7):** a borda da lista de camadas e a do Inspector se arrastam (cursor de duas setas). Limites: camadas 200–480 px, Inspector 260–560 px, e o viewport nunca fica abaixo de 360 px. Duplo clique volta ao padrão (256/320); com foco na alça, setas movem 16 px (Shift = 64). A largura fica nas preferências do navegador.
- Zoom de 20% a 300%, com a roda do mouse centrada no cursor, mais os botões Fit e 1:1.
- Pan com Espaço + arrastar ou com o botão do meio.
- **Fundo da cena** (R3): transparente (xadrez) ou cor sólida. A cor entra no export da cena inteira, nunca no PNG de um item.
- **Grid** (R3): tamanho de 4, 8, 16, 32 ou 64 px, que pode ser mostrado sobre a cena, e snap no grid ligável.
- **Réguas e guias** (R3): réguas no topo e à esquerda; arrastar de uma régua cria uma guia e arrastar a guia de volta a remove.
- **Smart guides** (R3): ao mover ou redimensionar, o item gruda em bordas e centros de outros itens, do canvas e das guias. Uma linha magenta mostra o alinhamento.

### 1.4 Tipos de componente
| Tipo (interno) | Nome em EN | Uso típico | Recursos próprios |
|---|---|---|---|
| `Slot` | Slot | Slot de inventário, hotbar, retrato | Ícone embutido |
| `Botão` | Button | Botões de menu e ação | Rótulo padrão em Rajdhani |
| `Barra` | Bar | HP, mana, XP, stamina | Valor 0–100%, direção, segmentos, cor do trilho |
| `Painel` | Panel | Janelas e fundos | Bevel suave |
| `Texto` | Text | Títulos, rótulos, números | Caixa sem fundo e sem borda |
| `Anel` | Ring | Medidores circulares, cooldown | Valor, espessura, ângulo inicial, gradiente, brilho |
| `Forma` (R3) | Shape | Estrelas, badges, setas, losangos | Estrela, polígono de 3 a 12 lados, elipse e seta |

Todo tipo aceita texto, ícone, preenchimento, borda, sombras, opacidade e rotação.

### 1.5 Inspector (painel direito)
**Busca e seções recolhíveis (R5):** no topo do Inspector há uma busca de propriedades (atalho `/`, Esc limpa). Ela ignora acentos, procura no texto da tela, no termo em português (funciona com a interface em inglês), nos tooltips e no nome da prop de script (`shadowBlur`, `radius`). Se o título da seção casa, a seção aparece inteira; senão, só as linhas que casam. Clicar no título de uma seção recolhe ou expande (controles no título, como o select de Forma, continuam funcionando), e o botão ao lado da busca recolhe ou expande todas. As seções recolhidas ficam salvas no navegador.

O Inspector edita **toda a seleção**. A exceção são nome, posição e tamanho, que valem só para o item principal (o último selecionado). Um aviso mostra quantos itens estão selecionados.

| Seção | Controles |
|---|---|
| Alinhar (R3) | Esquerda, centro H, direita, topo, centro V, base, distribuir H e V. Com 1 item, alinha ao canvas |
| Posição e Dimensão | X, Y, W, H, rotação em graus (R3), travar 1:1, opacidade da camada |
| Texto / Rótulo | Texto multilinha, 13 fontes, peso, tamanho, cor, alinhamento H e V, espaçamento, altura de linha, efeito (sombra ou glow), contorno, MAIÚSCULAS, incluir no PNG |
| Forma (R3) | Preset (estrela, triângulo, losango, hexágono, polígono, elipse, seta), pontas/lados, profundidade da estrela |
| Barra de Progresso | Valor, direção, segmentos, cor do trilho |
| Medidor Circular | Valor, espessura, ângulo inicial, cores, brilho, **mostrar valor no centro** (R4: o número acompanha o valor; desligado = sem número ou o texto do campo Texto) |
| Imagem / Ícone | Upload ou arrastar, ajuste (conter, cobrir, esticar, original 1:1), escala, opacidade, deslocamento, filtro, incluir no PNG |
| Cantos | Arredondado ou chanfrado, raio único ou por canto |
| Preenchimento | Sólido ou gradiente (vertical, horizontal, diagonal, radial), opacidade, 2 cores |
| Borda | Solid, bevel, inset, glow, tracejada, dupla; largura, cor, intensidade do relevo |
| Efeitos (R3) | Preset de sombra (Nenhuma, Suave, Profunda, Flutuante, Encaixe de slot); **sombra projetada** (cor, opacidade, blur, X, Y); **sombra interna** (cor, intensidade, profundidade, brilho na base); **textura (R8)**: ruído/grão (`noise`), scanlines e espaçamento. O ruído é um ladrilho fixo de 128 px (semente constante), ancorado no item: igual na tela, no PNG e no SVG. O manifest avisa que a textura estica no 9-slice |
| Posição: âncora (R8) | Horizontal (esquerda, centro, direita, esticar) e vertical (topo, meio, base, esticar), mais **Auto** pela posição. Ver 2.9 |
| Texto: contraste (R8) | Selo com a razão WCAG entre a cor do texto e o que está atrás (o próprio fundo, se opaco; senão o item de baixo que cobre o centro do texto; senão a cor da cena). Mínimo 4,5:1, ou 3:1 para texto grande (≥ 24 px, ou ≥ 18,66 px em negrito). Contorno de 1 px ou mais conta a favor |
| Guia 9-Slice | Mostra as margens no canvas, copia os metadados em JSON e liga "Gerar estados hover/pressed no ZIP" (R5; ligado por padrão em Botões) |

### 1.6 Camadas e grupos
- A ordem das camadas é a ordem de `state.components`: índice 0 fica no fundo e o último fica na frente.
- Item novo sempre entra no **topo** da pilha, pela toolbar e pelos scripts.
- Busca por nome ou texto, duplo clique para renomear e ícone de olho para ocultar.
- **Cadeado (R5):** item trancado não é clicado, arrastado nem pego pelo retângulo de seleção no canvas; o clique atravessa. Serve para fundos e molduras grandes. Continua editável pela lista e pelo Inspector. Selecionado pela lista, ele mostra o gizmo tracejado e sem alças, e as setas e o arrasto movem só os destrancados.
- **Arrastar na lista (R5):** soltar na metade de cima de uma linha põe na frente dela, na metade de baixo põe atrás. Soltar sobre um membro de grupo entra no grupo; soltar fora sai dele. Soltar no cabeçalho do grupo põe no topo do grupo. Arrastar o cabeçalho leva o grupo inteiro sem desfazê-lo. Arrastar um item selecionado leva a seleção toda. Na busca, a lista não arrasta.
- Grupos de um nível, com recolher/expandir e renomear. Clicar no grupo seleciona todos os itens dele.
- **Mesclar (Ctrl+E, R7):** os itens **visíveis** da seleção (2 ou mais) viram um único item "só imagem" (PNG em 2×, cortado na área com pixels, com sombras e brilhos inteiros), no lugar do mais alto deles na pilha. Itens ocultos da seleção ficam como estão. Se todos eram do mesmo grupo, o resultado continua no grupo. Perde a edição e o 9-slice; um Ctrl+Z desfaz. Botão na barra das camadas.
- **Importar para a cena (R7):** botão na barra superior, ou arrastar um `.json` de layout para o canvas. Soma os itens aos atuais (o **Abrir** continua substituindo), com ids e grupos novos, no topo da pilha, já selecionados. Passa pela mesma validação do Abrir. Layout de outra resolução é escalado para caber e centralizado (posições, tamanhos, raios, bordas, sombras e fontes); guias, fundo e rascunho dele são ignorados.
- Com muitos itens a lista rola, e selecionar um item no canvas rola a lista até ele.

### 1.7 Rascunho / Blockout
Uma imagem de referência (mockup) fica atrás da cena, com opacidade ajustável e modo conter ou esticar. Ela pode ou não entrar no export da cena. É salva no projeto e no autosave, numa chave separada.

### 1.8 Atalhos
| Atalho | Ação |
|---|---|
| Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y | Desfazer / refazer |
| Arrastar a partir do vazio (R5) | Seleção por retângulo: pega o que cruzar o retângulo (a caixa já considera a rotação). Ignora itens ocultos e trancados |
| Shift/Ctrl + arrastar do vazio (R5) | Soma o retângulo à seleção atual |
| Delete / Backspace | Excluir a seleção |
| Ctrl+D | Duplicar |
| Ctrl+C / Ctrl+X / Ctrl+V (R4) | Copiar / recortar / colar. Funciona entre abas e projetos (o pacote vai como texto JSON no clipboard, com as imagens). A colagem entra no topo da pilha, 16 px deslocada a cada vez, com ids e grupos novos, e vira a seleção. Dentro de campos de texto, o atalho continua sendo o do navegador |
| Ctrl+V com imagem no clipboard (R5) | Print de tela ou "copiar imagem": cria um item só com a imagem (sem fundo, borda nem sombra), no tamanho natural (até 80% da cena), centralizado e selecionado. Não mexe no ícone da seleção |
| Ctrl+Shift+V com imagem (R5) | Troca o ícone de todos os itens selecionados. Sem seleção, cria um item novo |
| Ctrl+G / Ctrl+Shift+G | Agrupar / desagrupar |
| Ctrl+E (R7) | Mesclar a seleção numa imagem |
| Ctrl+Shift+L (R8) | Bloquear/desbloquear a seleção (também no botão de cadeado da barra das camadas, que fica aceso quando tudo está bloqueado) |
| Soltar `.json` no canvas (R7) | Importar o layout para a cena (soma, não substitui) |
| Ctrl+] / Ctrl+[ | Subir / descer uma camada |
| Ctrl+Shift+] / Ctrl+Shift+[ | Trazer para a frente / enviar para o fundo |
| Setas / Shift+setas | Mover 1 px / 10 px |
| T | Criar texto |
| / (R5) | Buscar propriedade no Inspector |
| Duplo clique no item | Editar o texto no Inspector |
| Shift+R (R3) | Mostrar/esconder réguas e guias |
| Alt durante o arrasto (R3) | Desligar o snap temporariamente |
| Shift na alça de canto | Manter a proporção |
| Shift na alça de rotação (R3) | Girar em passos de 15° |
| Espaço + arrastar / botão do meio | Pan |
| Shift+1 / Shift+0 (R8) | Enquadrar a cena / zoom 100% (também nos botões Fit e 1:1) |
| Ctrl + / Ctrl − (R8) | Zoom a partir do centro (no lugar do zoom da página) |
| Ctrl+J ou F2 | Abrir/fechar a Bancada de Scripts |
| Ctrl+Enter (na bancada) | Executar script |
| Esc (na bancada) | Fechar a bancada |

### 1.9 Cena de boas-vindas (R6)
- **Quando abre:** primeira visita (sem autosave). Guia rápido, mini-HUD de RPG e mostruário de peças, em 4 grupos, com o fundo trancado.
- **Idioma:** o padrão do app agora é PT (antes seguia o navegador). Trocar PT ⇄ EN refaz a cena no outro idioma **enquanto ninguém mexeu nela** (assinatura em `game_dev_ui_studio_welcome` no localStorage). Depois de editada, a troca só muda a interface.
- **Código:** `welcomeSceneScript(Studio)`, que usa só a API `Studio`. O preset **👋 Boas-vindas** da Bancada mostra o corpo dessa função, então editar num lugar atualiza os dois.
- **Desempenho:** a montagem roda com `renderSuspended` (sem redesenho por peça) e um `refreshAll()` no fim: de ~900 ms para ~40 ms. Ctrl+Z não desmonta a cena inicial.
- **Testes:** `window.studioReady` indica cena pronta (o `harness.mjs` espera por ele); suíte `tests/test-welcome-scene.mjs`.

---

## 2. Arquitetura Técnica & Estado (TDD)

### 2.1 Organização do código (R8: módulos em `src/`)
O usuário continua recebendo **um arquivo só**, `devUI-Studio.html`, mas desde a R8 ele é **gerado** a partir de `src/` por `node tools/build.mjs` (sem npm no app; o build só concatena e depois roda o `build-css`).

- `src/shell.html`: `<head>`, esqueleto do `<body>` e diretivas `@include`.
- `src/css/app.css`: estilos próprios. O CSS do Tailwind é gerado e embutido à parte.
- `src/html/10..50-*.html`: barra superior, painel esquerdo, viewport, Inspector, modais.
- `src/js/01..20-*.js`: o script principal em 20 pedaços, concatenados em ordem de nome num **único** `<script>`. Não são ES modules: tudo compartilha o escopo, então nada muda em tempo de execução. Mapa completo em `src/README.md`.

**Como o corte foi validado:** o primeiro build a partir de `src/` saiu byte a byte idêntico ao arquivo anterior. Daqui em diante, `test-static-deploy.mjs` confere que o HTML está em dia com `src/`, e o `build-deploy.mjs` se recusa a montar o `deploy/` se não estiver. O maior arquivo tem ~660 linhas (antes, 8.338 num só).

**Fluxo de mudança:** editar `src/` → `node tools/build.mjs` → `node tests/run-all.mjs`.

### 2.2 O objeto `state`
| Campo | Tipo | Descrição |
|---|---|---|
| `canvasWidth`, `canvasHeight` | number | Resolução da cena |
| `zoom`, `panX`, `panY` | number | Transformação do viewport |
| `components` | array | Os componentes; a ordem do array é a ordem das camadas |
| `selectedIds`, `selectedId` | array, number | Seleção e item principal |
| `groups`, `nextGroupId` | array, number | Grupos `{id, name, visible, collapsed}` |
| `nextId` | number | Próximo id de componente |
| `snapToGrid`, `gridSize`, `showGrid` | bool, number, bool | Snap e grid (preferências do navegador) |
| `showRulers` | bool | Réguas e guias visíveis |
| `guides`, `nextGuideId` | array, number | Guias `{id, axis: 'v' | 'h', pos}` em px da cena (vão no projeto) |
| `sceneBackground` | object | `{mode: 'transparent' | 'color', color}` (vai no projeto) |
| `reference` | object | Rascunho: `img`, `src`, `opacity`, `fitMode`, `visible`, `includeInSceneExport` |
| `drag` | object | Arrasto em andamento: `mode` (move, rotate ou alça), posições iniciais, alvos de snap |

### 2.3 Modelo de componente
Todo componente é um objeto plano. `COMPONENT_DEFAULTS` define o padrão de cada campo, e `normalizeComponent()` completa projetos antigos, então o renderer nunca encontra um campo ausente.

| Grupo | Campos |
|---|---|
| Identidade | `id`, `name`, `type`, `groupId`, `visible`, `locked` (R5) |
| Export | `exportWithIcon`, `exportWithText`, `exportStates` (R5; ausente = `true` só para Botão) |
| Transformação | `x`, `y`, `w`, `h`, `opacity`, `rotation` (graus, horário) |
| Cantos | `radius`, `independentRadius`, `radiusTL/TR/BR/BL`, `cornerStyle` (`round`, `chamfer`) |
| Preenchimento | `fillType` (`solid`, `gradient`), `gradientDir`, `fillOpacity`, `fillColor1`, `fillColor2` |
| Borda | `borderStyle`, `borderWidth`, `borderColor`, `bevelStrength` |
| Sombra projetada | `dropShadow`, `shadowColor`, `shadowOpacity`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY` |
| Sombra interna | `innerShadow`, `innerShadowColor`, `innerShadowOpacity`, `innerShadowSize`, `innerHighlight` |
| Ícone | `icon` (objeto Image, não serializado), `iconSrc`, `iconFit`, `iconScale`, `iconOpacity`, `iconOffsetX/Y`, `iconFilter`, `exportWithIcon` |
| Texto | `text`, `fontFamily`, `fontSize`, `fontWeight`, `textColor`, `textAlign`, `textVAlign`, `letterSpacing`, `lineHeight`, `textUppercase`, `textEffect`, `textStrokeWidth`, `textStrokeColor`, `textPadding`, `exportWithText` |
| Barra | `barValue`, `barDirection` (`ltr`, `rtl`, `btt`, `ttb`), `barSegments`, `trackColor` |
| Anel | `ringValue`, `ringThickness`, `ringStart`, `ringColor1`, `ringColor2`, `ringTrackColor`, `ringGlow`, `ringShowValue` (R4) |

**Rótulo do Anel (R4):** com `ringShowValue`, o texto desenhado é o próprio `ringValue`, calculado por `componentLabel()` na hora do desenho e do export; nada é copiado para `text`. O padrão é `false`, então projetos antigos mantêm o texto que tinham. Anel novo nasce com `true` e `text: ''`. Definir `text` num Anel (pelo Inspector ou por `create`/`update` sem passar `ringShowValue`) desliga o valor automático: o texto definido vence.
| Forma | `shapeKind` (`star`, `polygon`, `ellipse`, `arrow`), `shapeSides`, `shapeInnerRatio` |

### 2.4 Pipeline de renderização do `mainCanvas`
`renderScene()` limpa o canvas, pinta o fundo da cena (se for cor sólida), desenha o rascunho e chama `renderComponentToContext()` para cada componente, do índice 0 ao último. **Z-index = posição no array.** A mesma função desenha no canvas principal e nos canvases de export, o que garante PNG igual à tela.

Ordem dos passes de cada componente:

1. **Transformação:** `globalAlpha = opacity`. Se houver `rotation`, o contexto gira em volta do centro do item.
2. **Sombra projetada:** a forma que projeta a sombra é desenhada 100.000 px fora da área visível e só a sombra é deslocada de volta. Assim um fundo semitransparente não mostra um "bloco preto" atrás. O deslocamento usa a matriz atual (`m.a`, `m.b`), então a sombra acompanha rotação e escala do export. A opacidade da sombra é multiplicada pela do preenchimento.
3. **Preenchimento:** sólido ou gradiente em 4 direções. A Barra desenha trilho, parte cheia recortada pelo valor e divisórias.
4. **Sombra interna:** gradiente da cor escolhida no topo (profundidade em px) e brilho branco na base.
5. **Ícone:** recortado pela geometria do item, com ajuste conter, cobrir, esticar ou 1:1 e deslocamento X/Y.
6. **Anel:** trilho completo e arco com gradiente cônico (`createConicGradient`).
7. **Borda:** solid, bevel/inset (gradiente entre a cor da borda clareada e escurecida por `bevelStrength`), glow, tracejada ou dupla. É desenhada para dentro, com meia largura de recuo.
8. **Texto:** quebra por palavra, alinhamento, contorno (`strokeText` com o dobro da largura) e efeito. Fontes do Google carregam sob demanda e a cena redesenha quando chegam. O export espera `ensureFontsReady()`.

**Geometria única:** `addComponentGeometry(p, comp, x, y, w, h, inset)` gera o contorno de retângulo arredondado (`arcTo`) ou chanfrado, ou da Forma. `p` pode ser o contexto ou um `Path2D`. A mesma função alimenta o desenho, o recorte do ícone, a sombra e o hit test.

**Hit test:** o clique é desgirado para o espaço local do item. Para a Forma usa-se `isPointInPath` no contorno real; para os demais, a caixa.

**Sobreposições de DOM** (não entram no PNG): gizmo (gira via CSS com o item), guias 9-slice, grid (padrão CSS), guias de régua, smart guides (SVG com `vector-effect: non-scaling-stroke`) e réguas (dois canvases do tamanho do viewport, com passo de marcação adaptado ao zoom). A espessura de 1 px na tela vem da variável CSS `--inv-zoom`.

**Snap (R3):** no início do arrasto, `snapTargets()` coleta as bordas e centros do canvas, dos itens visíveis que não estão sendo arrastados e das guias. A cada movimento, `nearestSnap()` procura o alvo mais próximo dentro de 6 px de tela. O snap no grid só atua quando não há alvo inteligente. Alt desliga o snap. O resize de item girado não faz snap.

### 2.5 Interação, histórico e Inspector
- **Ponto único de gravação:** toda mudança chama `renderScene()`, que agenda `onDocumentSettled()` para 500 ms depois. Ali o histórico e o autosave são gravados. Arrastos e sliders viram um só passo de Ctrl+Z.
- **Clipboard (R4):** os eventos `copy`, `cut` e `paste` do documento carregam o pacote `{format: "devui-components", version: 1, copyId, components, groups}` como texto. Eles não pedem permissão ao navegador, ao contrário de `navigator.clipboard.readText`. Na colagem, `normalizeComponent` completa campos ausentes, tipos desconhecidos são ignorados e texto de outro app não cola nada. `clipboardMemory` é a reserva usada pela API `Studio`. **Ordem no Ctrl+V (R5):** pacote do Studio, depois imagem (`clipboardData.files`/`items`), depois a reserva (só com o clipboard vazio). O evento `paste` não informa o Shift, então o `keydown` de Ctrl+Shift+V marca o pedido de troca, que vale por 1 s.
- **Histórico:** snapshots JSON (até 100). Imagens ficam em `assetRegistry` e o snapshot guarda só a chave `asset:N`, sem duplicar base64. Guias e fundo da cena entram no snapshot.
- **Inspector:** `INSPECTOR_BINDINGS` é uma tabela `{id, key, kind, scope, min, max, label, after}`. Um controle novo é uma linha na tabela; `syncInspector()` e os listeners são genéricos.
- **Idioma:** o texto em português é a chave. Elementos estáticos usam `data-i18n`, `data-i18n-title` e `data-i18n-ph`; textos dinâmicos usam `t('texto {var}', {var})`. O dicionário `EN` só traduz.

### 2.6 Persistência (IndexedDB + `localStorage`)
| Chave | Onde | Conteúdo |
|---|---|---|
| `game_dev_ui_studio_autosave` | IndexedDB (R4) | Projeto (componentes, grupos, guias, fundo da cena) |
| `game_dev_ui_studio_autosave_ref` | IndexedDB (R4) | Rascunho (imagem grande, gravada só quando muda) |
| `game_dev_ui_studio_templates` | localStorage | Templates de script do usuário |
| `game_dev_ui_studio_editor_prefs` | localStorage | Snap, tamanho do grid, grid visível, réguas visíveis, resolução do export (R5), área segura visível e largura dos painéis (R7) |
| `game_dev_ui_studio_lang` | localStorage | Idioma (`pt` ou `en`) |
| `game_dev_ui_studio_inspector_ui` | localStorage | Seções recolhidas do Inspector (R5) |

**Autosave em IndexedDB (R4):**
- **Onde fica:** banco `game_dev_ui_studio`, store `autosave`, com as mesmas chaves de antes.
- **Limite:** o antigo teto de cerca de 5 MB do localStorage acabou. Em Chrome e Edge o espaço é uma fração do disco livre, e o teste passou com uma imagem de 11,5 MB.
- **Como grava:** o objeto é gravado direto (structured clone), sem `JSON.stringify`, no mesmo debounce de 500 ms. Quando a aba é escondida (`visibilitychange`), o que estava pendente é gravado na hora.
- **Migração:** na primeira abertura, o autosave antigo do localStorage é carregado e gravado no IndexedDB. A chave antiga só é apagada depois disso.
- **Plano B:** sem IndexedDB, tudo continua no localStorage, e o aviso de cota volta a valer.
- **Os dados ficam só no navegador:** use **Salvar** (arquivo `.json`) para backup ou para levar o projeto a outro PC.

**Arquivo de projeto `.json` (versão 1.2):** `version`, `resolution`, `canvasWidth`, `canvasHeight`, `nextId`, `groups`, `nextGroupId`, `guides`, `nextGuideId`, `sceneBackground`, `components` (com `iconSrc` em base64) e `reference` (só no Salvar manual).

### 2.7 Segurança e deploy (R6, @security-auditor)
Todo JSON de fora (Abrir layout, autosave, colar) é tratado como não confiável:
- **`sanitizeProjectData(data)`** (em `loadProjectFromData`): resolução só entre 16 e 8192 px (fora disso mantém a atual), ids ausentes/repetidos renumerados, `nextId`/`nextGroupId`/`nextGuideId` acima do maior id, grupos e guias com campos validados, fundo da cena só com cor hex, rascunho só com `data:image/`.
- **`normalizeComponent(comp)`**: além de completar campos, força o tipo pelo padrão de `COMPONENT_DEFAULTS` (número finito, boolean, string), cores só em hex (`#rgb`, `#rrggbb`, `#rrggbbaa`), `iconSrc` só `data:image/`, `groupId` número ou `null`. Vale também para colar (Ctrl+V).
- **Limite de arquivo:** `MAX_PROJECT_BYTES` = 50 MB no Abrir layout.
- **CDN:** JSZip com SRI (`integrity`). **Tailwind (R7):** o Play CDN (script de terceiro sem SRI, que compilava o CSS no navegador a cada carregamento) saiu. `node tools/build-css.mjs` roda o Tailwind CLI 3.4.17 (via `npx`, config em `tools/tailwind.config.cjs`) sobre uma cópia do HTML e embute o CSS minificado (~25 KB) entre `<!-- tailwind:start -->` e `<!-- tailwind:end -->`, no fim do `<head>` (mesma posição da cascata do Play CDN). `--check` diz se o bloco está desatualizado. Classe Tailwind nova no HTML ou em string do JS **exige rodar o build**. Validação da troca: screenshots antes/depois em 1920 e 1366 px idênticos pixel a pixel.
- **Vercel (`vercel.json`):** rewrite de `/` para `devUI-Studio.html` e headers CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP. O CSP precisa de `'unsafe-eval'` (Script Workbench usa `AsyncFunction`) e `'unsafe-inline'` (script principal inline e estilos). Desde a R7, `cdn.tailwindcss.com` saiu do `script-src`.
- **Publicação sem git:** `node tools/build-deploy.mjs` monta `deploy/` com o que vai para o GitHub (upload pelo navegador). `.vercelignore` tira testes e docs do site publicado.
- Testes: `tests/test-security-import.mjs`.

### 2.8 TDD — Script da seleção (R7, B2)
**Objetivo:** transformar um layout feito à mão em código `Studio` legível, para servir de base a outros devs e de template reaproveitável.

**Entradas na interface**
- Menu **Exportar ▾ → Script da seleção (JS)**: abre a Bancada com o código no editor (não executa). Sem seleção, gera a cena inteira.
- Bancada: botão **📋 Da seleção** na linha de templates, mesmo comportamento.
- API: `Studio.toScript(alvos?, { relative, icons })` devolve a string.

**Formato gerado**
```js
// Gerado pelo Game Dev UI Studio (cena 1920×1080). 3 item(ns).
// Mude ox/oy para recriar o conjunto em outro lugar.
const ox = 600, oy = 300;
const janela = Studio.create('Painel', { name: "Janela", x: ox + 0, y: oy + 0, w: 480, h: 320, fillColor1: "#1e1e24" });
const titulo = Studio.text("INVENTÁRIO", { name: "Título", x: ox + 24, y: oy + 16, w: 432, h: 48, fontSize: 28 });
await Studio.setIcon(slot, "data:image/png;base64,...");
Studio.group([janela, titulo], "Janela Inventário");
```

**Regras (@script-dev)**
1. **Ordem:** a das camadas (fundo → frente). O script recria a mesma pilha, porque `create` sempre empilha no topo.
2. **Só o que difere:** cada prop é comparada com o preset do tipo (`createComponentPreset(tipo)` gerado sem gastar id: `nextId` é restaurado). Entram sempre `name`, `x`, `y`, `w`, `h`. Ficam de fora `id`, `type`, `groupId`, `icon` e `iconSrc`.
3. **Texto:** item `Texto` usa `Studio.text(texto, props)`. **Anel:** se `text` entra, `ringShowValue` entra junto (senão o `applyProps` desligaria o valor automático).
4. **Valores:** sempre por `JSON.stringify` (aspas, quebras de linha e `</script>` saem escapados; nome malicioso não vira código). Números com até 2 casas.
5. **Variáveis:** nome do item em camelCase sem acento, só `[a-zA-Z0-9_]`, sem colidir com palavras reservadas nem entre si (`painel`, `painel2`); fallback `item1`.
6. **Posição relativa** (`relative`, padrão `true`): `ox`/`oy` = canto superior esquerdo da seleção; `x: ox + dx`. Com `false`, coordenadas absolutas.
7. **Imagens** (`icons`: `'embed'` padrão ou `'omit'`): `embed` gera `await Studio.setIcon(var, dataURL)` depois do `create` (as props de ajuste do ícone já foram no `create`). Imagem maior que 200 KB vira linha comentada `// Studio.setIcon(var, ...) — imagem de N KB omitida`, para o script não ficar enorme.
8. **Grupos:** para cada grupo com membros na seleção, `Studio.group([vars], nome)` no fim, na ordem dos grupos.
9. **Sem efeito colateral:** gerar não mexe em `state` (seleção, `nextId` e histórico ficam iguais).

**Critério de aceite (@qa-auditor):** round-trip. Gerar o script da cena, limpar, executar o script e comparar cada componente com o original (todas as props de `COMPONENT_DEFAULTS` menos `id`/`groupId`, mais a imagem e o nome do grupo). Também: script de nome com aspas e `</script>` não quebra, variáveis únicas, imagem grande omitida, seleção inalterada.

**Fora do escopo:** gerar `createGrid` a partir de itens alinhados (detectar padrão) e scripts de animação.

### 2.9 TDD — Âncoras (R8)
**Objetivo:** dizer à engine como cada item se comporta quando a tela tem outra proporção (20:9, 4:3, ultrawide). Hoje o export só leva posição fixa a partir do canto superior esquerdo.

**Modelo:** duas props novas por componente, com o padrão igual ao comportamento atual (nada muda em projetos antigos):
- `anchorH`: `left` (padrão) | `center` | `right` | `stretch`
- `anchorV`: `top` (padrão) | `middle` | `bottom` | `stretch`

**Editor**
- Inspector, seção Posição: dois seletores (Horizontal / Vertical) e o botão **Auto**, que escolhe pela posição do item na cena (terço esquerdo/central/direito; item com mais de 80% da largura = esticar). Vale para toda a seleção.
- **Prévia responsiva:** trocar a resolução pelo seletor ou pelo botão girar reposiciona os itens pelas âncoras, como as constraints do Figma: `left` mantém a margem esquerda; `right` mantém a direita; `center` mantém a distância ao centro; `stretch` mantém as duas margens e muda a largura. Com o padrão (`left`/`top`) nada se move. Abrir projeto e desfazer **não** reposicionam. Um Ctrl+Z desfaz a troca inteira.

**Export (manifest, por asset, em px de saída; W×H = resolução de saída)**, bloco `anchors`:
- `unity` (Y para cima): `anchorMin`, `anchorMax`, `pivot` e `offsetMin`/`offsetMax` (cantos inferior-esquerdo e superior-direito do rect em relação às âncoras; basta atribuir no RectTransform). Âncora de ponto: pivot = âncora.
- `unreal` (Y para baixo, CanvasPanel Slot): `minimum`, `maximum`, `alignment` e `offsets {left, top, right, bottom}`. Eixo de ponto: left/top = posição do ponto de alinhamento em relação à âncora e right/bottom = tamanho; eixo esticado: margens.
- `godot`: `anchor_left/top/right/bottom` e `offset_*` do retângulo da textura (com o padding, igual ao `.tscn`). O `.tscn` passa a usar `layout_mode = 1` com essas âncoras quando o item não é `left`/`top`, e `grow_horizontal/vertical` coerentes (direita/base = crescer para o início).

**Critérios de aceite (@qa-auditor):** padrão não muda nada (manifest e `.tscn` iguais para `left`/`top`); para cada combinação, recompor o rect a partir de `offsetMin/offsetMax` (Unity), `offsets` (Unreal) e `offset_*` (Godot) devolve a posição e o tamanho originais; prévia responsiva (item `right` a 20 px da borda continua a 20 px em outra largura; `stretch` mantém margens); Auto escolhe certo nos terços; undo desfaz a troca de resolução com a relayout num passo.

**Fora do escopo:** âncoras relativas a grupos (hoje os grupos não são contêineres) e Canvas Scaler por item.

### 2.10 TDD — Componentes reutilizáveis (R8, aguardando aprovação do autor)
**Objetivo:** mudar o estilo de todos os botões (slots, painéis...) de um jogo editando um só. É o que Figma (main component/instance) e as engines (prefab) fazem, e o que mais ajuda projetos grandes.

**Modelo (MVP: componente de 1 item; grupo como componente fica para depois)**
- `symbolId` (número ou `null`): liga mestre e instâncias. `isMaster` (bool): o mestre é um item vivo da cena, como no Figma.
- `overrides` (array de chaves): props que a instância mudou por conta própria e que o mestre não sobrescreve mais.
- **Nunca sincronizam** (sempre da instância): `id`, `name`, `x`, `y`, `w`, `h`, `rotation`, `groupId`, `visible`, `locked`, `anchorH/V`. Todo o resto (estilo, texto, ícone, textura, estados) vem do mestre até virar override.

**Comportamento**
- **Criar componente** (Ctrl+Alt+K e botão nas camadas): o item selecionado vira mestre ◆. **Criar instância**: duplicar (Ctrl+D) ou copiar/colar um mestre ou uma instância gera instância ◇ (duplicar o mestre não cria um segundo mestre).
- **Propagação:** um passo `syncInstances()` antes de cada `renderScene` copia do mestre as chaves que não são override. Editar uma prop numa instância (Inspector ou script) adiciona a chave em `overrides`.
- **Inspector:** "Mestre: N instâncias" ou "Instância de *X*", com **Ir para o mestre**, **Restaurar do mestre** (limpa overrides) e **Desvincular**.
- **Excluir o mestre:** as instâncias ficam desvinculadas (continuam iguais, sem ligação) e um toast avisa; Ctrl+Z restaura tudo. *(Decisão do autor: alternativa seria promover a primeira instância a mestre.)*
- Mesclar instâncias gera item desvinculado. Importar layout traz mestres e instâncias com ids novos, ligados entre si.

**Export**
- `asset.component = { symbol, role: "master" | "instance", overrides }`.
- **Textura compartilhada** *(decisão do autor, recomendado ligar)*: instância sem override visual reaproveita o PNG do mestre (o 9-slice estica para o tamanho dela), `asset.file` aponta para o arquivo do mestre e `sharedTexture: true`. Menos arquivos no ZIP e um sprite só na engine; na Godot, a mesma textura/variação de tema.

**Scripts:** `Studio.makeComponent(alvo)`, `Studio.instance(mestre, props)`, `Studio.detach(alvos)`, `Studio.resetOverrides(alvos)`. O script da seleção gera `makeComponent` e `instance` em vez de copiar o estilo.

**Segurança:** `normalizeComponent` valida `symbolId` (número ou `null`), `isMaster` (bool) e `overrides` (só chaves de `COMPONENT_DEFAULTS` que podem sincronizar); instância órfã (sem mestre) fica desvinculada ao abrir.

**Critérios de aceite:** mudar a cor do mestre muda as instâncias sem override; override de texto sobrevive a mudança de texto no mestre; Restaurar volta ao mestre; Desvincular congela; excluir mestre desvincula e Ctrl+Z desfaz; salvar/abrir e colar em outra aba mantêm a ligação; ZIP com textura compartilhada tem 1 PNG para mestre + instâncias iguais; projeto antigo abre igual; `syncInstances` com 500 instâncias abaixo de 2 ms.

---

## 3. API de Scripts (Studio / figma)

### 3.1 Onde usar
- **Bancada de Scripts** (Ctrl+J): editor com console próprio. O código roda como função assíncrona, então `await` funciona no nível de cima. `return valor` imprime o valor no console.
- **Console do navegador (F12):** `Studio` e o apelido `figma` são globais.
- **Segurança:** scripts rodam com acesso total à página e ao projeto. Execute só código de fontes confiáveis.

### 3.2 Alvos
Os métodos que recebem **alvos** aceitam um id (número), um nome (texto, sem diferenciar maiúsculas), um tipo (`'Botão'`, `'button'`...), o objeto componente, ou um array misturando esses. Sem alvo, vale a seleção atual.

Apelidos de tipo aceitos: `slot`; `botão`/`botao`/`button`/`btn`; `barra`/`bar`; `painel`/`panel`; `texto`/`text`/`label`; `anel`/`ring`/`gauge`; `forma`/`shape`/`estrela`/`star`.

### 3.3 Métodos
| Método | Retorno | Descrição |
|---|---|---|
| `Studio.help()` | — | Lista os comandos no idioma atual |
| `Studio.canvas` | `{width, height}` | Resolução da cena (propriedade) |
| `Studio.get(alvo)` | componente ou `null` | Primeiro que casar |
| `Studio.getAll()` | array | Cópia da lista de componentes |
| `Studio.getSelected()` | array | Seleção atual |
| `Studio.find(fn)` | array | Filtra com uma função (`c => c.w > 100`) |
| `Studio.select(alvos)` | array | Seleciona no editor (`[]` limpa) |
| `Studio.create(tipo, props)` | componente | Cria no **topo** da pilha e seleciona |
| `Studio.text(conteúdo, props)` | componente | Atalho para criar um Texto |
| `await Studio.setIcon(alvos, src, opts)` | array | Aplica imagem (ver 3.5) |
| `Studio.update(alvos, props)` | array | Altera propriedades |
| `Studio.updateAll(filtro, props)` | array | Filtro = tipo, função, alvo; sem filtro = todos |
| `Studio.remove(alvos)` | número | Exclui e limpa grupos vazios |
| `Studio.copy(alvos)` (R4) | número | Guarda os alvos na reserva interna (não mexe no clipboard do sistema) |
| `await Studio.paste()` (R4) | array | Cola a reserva (a mesma regra do Ctrl+V) e devolve os componentes novos |
| `Studio.lang` / `Studio.tr(pt, en)` (R8) | texto | Idioma da interface e texto no idioma certo (base dos templates bilíngues) |
| `Studio.autoAnchor(alvos)` (R8) | array | Âncora pela posição na cena, como o botão Auto |
| `await Studio.batch(async () => {...})` (R8) | o retorno da função | Monta muita coisa sem redesenhar a cada peça nem mostrar toasts; um refresh no fim (aninhável). A Vitrine 4K monta 176 peças em ~150 ms |
| `Studio.setResolution(w, h)` (R8) | `{width, height}` | Troca a resolução da cena (16–8192) sem reposicionar itens |
| `Studio.safeArea` (R7) | objeto ou `null` | Área segura da resolução atual `{top, right, bottom, left}` em px (só presets mobile) |
| `Studio.toScript(alvos?, opts)` (R7) | texto | Código que recria os alvos (sem alvo: seleção; sem seleção: cena). `opts`: `relative` (padrão `true`), `icons: 'embed' \| 'omit'`. Regras no 2.8 |
| `await Studio.merge(alvos)` (R7) | componente ou `null` | Mescla numa imagem só, como o Ctrl+E |
| `await Studio.importLayout(json)` (R7) | array | Soma um layout salvo à cena (mesma validação do Abrir; escala se a resolução for outra) |
| `Studio.group(alvos, nome)` | grupo | Agrupa |
| `Studio.ungroup(grupoIdOuAlvo)` | — | Desagrupa |
| `Studio.align(alvos, modo)` | array | `left`, `right`, `top`, `bottom`, `centerX`, `centerY`; 1 alvo = em relação ao canvas |
| `Studio.distribute(alvos, eixo, gap?)` | array | `'x'` ou `'y'`; sem `gap` = espaçamento igual entre o primeiro e o último |
| `Studio.createGrid(opts)` | array | Grade de componentes (ver 3.4) |
| `Studio.addGuide(eixo, px)` | guia | `'v'` (vertical) ou `'h'` (horizontal) |
| `Studio.clearGuides()` | — | Remove todas as guias |
| `Studio.clear()` | — | Remove todos os componentes |
| `Studio.undo()` / `Studio.redo()` | — | Histórico |

`id`, `type`, `icon` e `iconSrc` são protegidos: `create`/`update` recusam essas chaves. Para imagem, use `setIcon`.

### 3.4 `createGrid(opts)`
| Opção | Padrão | Descrição |
|---|---|---|
| `rows`, `cols` | 4, 4 | Linhas e colunas |
| `size` ou `w`/`h` | 96 | Tamanho de cada célula |
| `gap` | 12 | Espaço entre células |
| `x`, `y` | centralizado | Canto superior esquerdo |
| `type` | `'Slot'` | Tipo de cada célula |
| `name` | tipo | Prefixo do nome (`Inv 1`, `Inv 2`...) |
| `props` | `{}` | Props aplicadas a todas as células |
| `group` | `true` | `false` = sem grupo; texto = nome do grupo |

```js
const slots = Studio.createGrid({ rows: 1, cols: 8, size: 80, gap: 10, name: 'Hotbar', y: 960, group: 'Hotbar 1-8' });
```

### 3.5 Injeção de SVG e imagens (`setIcon`)
`src` pode ser:
- **Só o miolo do SVG** (`<path/>`, `<rect/>`, `<text/>`...): o Studio monta um `<svg>` com `width`/`height`/`viewBox` iguais ao componente e desenha **1:1** (`iconFit: 'stretch'`, `iconScale: 1`, `iconOpacity: 1`). As coordenadas do SVG são os pixels do componente.
- **Um `<svg>` completo:** usa o ajuste atual (padrão `contain`).
- **URL ou dataURL** de imagem.

`opts`: `{ fit, scale, opacity }`.

```js
const gem = Studio.create('Slot', { x: 900, y: 500, w: 48, h: 48, fillOpacity: 0, borderWidth: 0, dropShadow: false, innerShadow: false });
await Studio.setIcon(gem, '<polygon points="24,2 46,24 24,46 2,24" fill="#431407" stroke="#f59e0b" stroke-width="2"/>');
```

Texto dentro de SVG usa as fontes do sistema, porque SVG em `<img>` não carrega web fonts. Para texto, use o tipo **Texto** ou o campo `text`.

### 3.6 Referência de props para scripts
```text
Camada:    visible locked (trancado = o clique no canvas atravessa)
Estilo:    opacity rotation radius cornerStyle(round|chamfer) fillType(solid|gradient)
           gradientDir(vertical|horizontal|diagonal|radial) fillColor1 fillColor2 fillOpacity
           borderStyle(solid|bevel|inset|glow|dashed|double) borderWidth borderColor bevelStrength visible
Sombras:   dropShadow shadowColor shadowOpacity shadowBlur shadowOffsetX shadowOffsetY
           innerShadow innerShadowColor innerShadowOpacity innerShadowSize innerHighlight
Texto:     text fontFamily fontSize fontWeight textColor textAlign(left|center|right)
           textVAlign(top|middle|bottom) letterSpacing lineHeight textUppercase
           textEffect(none|shadow|glow) textStrokeWidth textStrokeColor textPadding exportWithText
Barra:     barValue(0-100) barDirection(ltr|rtl|btt|ttb) barSegments trackColor
Anel:      ringValue ringThickness ringStart ringColor1 ringColor2 ringTrackColor ringGlow
           ringShowValue (número no centro acompanha o valor; passar text desliga)
Forma:     shapeKind(star|polygon|ellipse|arrow) shapeSides(3-12) shapeInnerRatio(0.05-0.95)
Ícone:     iconFit(contain|cover|stretch|original) iconScale iconOpacity iconOffsetX iconOffsetY
           iconFilter(none|silhouette|grayscale|glow) exportWithIcon
```

### 3.7 Templates
- **Prontos:** Upgrade Stats, Grid Inventário 4x4, HUD RPG, Hotbar 1–8, Pintar Botões Dourado, Distribuir Horizontal.
- **🏆 Vitrine 4K (R8):** HUD de RPG sci-fantasia em 3840×2160 (desenhado em unidades de 1080p × 2) que usa quase todo recurso: os 7 tipos, as 6 bordas, chanfro, gradientes (4 direções), sombras, textura CRT, 15 ícones SVG, rotação, as 12 fontes, estados de botão, `createGrid`, `batch`, âncoras por bloco e grupos numerados. Como a boas-vindas, é uma função de verdade (`src/js/06b-showcase-scene.js`) e o preset mostra o corpo dela. Pacote ZIP dela: 8,6 s, 827 arquivos, 64 MB (dado para decidir export em Web Worker e textura compartilhada dos componentes).
- **Bilíngues (R8):** todos usam `Studio.tr('PT', 'EN')`, então geram nomes, textos e grupos no idioma da interface. Se o último script rodado foi um template **sem edição** e a cena não mudou desde então, trocar PT ⇄ EN volta ao estado de antes e roda o template de novo no outro idioma (como a cena de boas-vindas). Mexer na cena ou no código desliga isso.
- **Do usuário:** "💾 Salvar como template" guarda o código do editor com um nome. Os templates aparecem em "Meus templates" (clique carrega, × exclui).
- **Compartilhar:** Exportar gera `devui_script_templates.json` (`{format: "devui-script-templates", version: 1, templates: [{name, code, createdAt}]}`). Importar mescla por nome.

---

## 4. Pipeline de Exportação & Engines

### 4.1 Tipos de export
Desde a R7 tudo fica no menu **Exportar ▾** da barra superior (`#btnExportMenu` abre `#exportMenu`): formato e resolução no topo, as três ações embaixo. Os IDs dos botões e selects não mudaram.

| Ação do menu | Saída |
|---|---|
| **Item selecionado** (`#btnExportSelected`) | PNG do item selecionado, com 32 px de padding |
| **Cena inteira** (`#btnExportScene`) | PNG da cena inteira na resolução atual, com o fundo da cena e, opcionalmente, o rascunho |
| **Pacote ZIP para engines** (`#btnExportBatch`) | Todos os componentes, versões sem ícone, barras separadas, o manifest e a pasta da Godot |

**Script da seleção (R7):** quarto item do menu; abre a Bancada com o código `Studio` que recria a seleção (ver 2.8).

**Resolução do export (R5):** o seletor no topo do menu escolhe a saída: nativa, 2K ou 4K. A escala é `lado menor alvo / lado menor da cena` (R7: em paisagem é a altura, como antes; em retrato é a largura, então 1080×1920 em 4K sai 2160×3840). Ex.: 1080p → 2K = 1,333; 4K = 2 e vale para Item, Cena, Batch ZIP e "Copiar Metadados JSON". Só existem opções que ampliam: numa cena 1440p, o seletor mostra nativo e 4K. Texto, SVG, linhas, sombras e brilhos saem nítidos; ícone PNG/JPG ampliado além do tamanho original ganha aviso de "borrado" no manifest. A escolha fica nas preferências do navegador, não no projeto.

Regras comuns: camadas ocultas também são exportadas no ZIP; o PNG de um item sai **sem rotação**; o texto só entra no PNG quando "Incluir texto no PNG" estiver marcado.

### 4.2 Estrutura do ZIP
```text
GameUI_Batch_1920x1080.zip
├── GameUI_1080p_Assets/
│   ├── <nome>.png                 PNG completo (ícone e texto conforme os checkboxes)
│   ├── <nome>_hover.png           (R5) Estado hover: RGB × 1,15. Botões, e outros itens com "Gerar estados"
│   ├── <nome>_pressed.png         (R5) Estado pressed: RGB × 0,80
│   └── ui_engine_manifest.json
├── Frames_Only_NoIcons/
│   └── <nome>_frame.png           Só a moldura (sem ícone e sem texto): use este no modo Sliced
├── Bars_Track_And_Fill/           Só quando há Barras
│   ├── <nome>_track.png           Trilho vazio
│   └── <nome>_fill.png            Preenchimento cheio, sem borda e sem sombra
└── GameUI_Godot/                  (R4) Copie para a raiz do projeto Godot
    ├── game_ui.tscn               Cena que monta o HUD inteiro (R8: itens ancorados usam layout_mode = 1)
    ├── game_ui_theme.tres         (R8) Theme: cada Botão = variação de Button (normal/hover/pressed), cada Painel/Slot = variação de PanelContainer; StyleBoxTexture 9-slice com expand_margin = padding
    └── *.png                      Só as texturas que a cena usa
```
Nomes repetidos recebem o sufixo `_<id>` para não se sobrescreverem.

### 4.3 Schema do `ui_engine_manifest.json` (v6)
A v5 (R4) só acrescenta campos: `godot` no topo, e `godotSettings` e `engines` em cada asset. Quem lê a v4 continua funcionando. A R5 acrescenta `designResolution` e `exportScale` no topo, e `states` nos assets com estados. **A v6 (R7, mobile)** só acrescenta, no topo:
- `orientation`: `"portrait"` ou `"landscape"`.
- `safeArea`: `{top, right, bottom, left}` em px de saída, ou `null` (desktop).
- `unityCanvasScaler`: `{uiScaleMode: "ScaleWithScreenSize", referenceResolution: {x, y}, screenMatchMode: "MatchWidthOrHeight", matchWidthOrHeight}`; retrato casa a largura (`0`), paisagem a altura (`1`).
- `godot.projectSettings` ganha `display/window/handheld/orientation` (`0` paisagem, `1` retrato), e em retrato o `stretch/aspect` vira `keep_width`.
- **R8 (ainda v6, só acrescenta):** `anchors` em cada asset (`horizontal`, `vertical`, `unity`, `unreal`, `godot`; fórmulas no 2.9) e `godot.theme` (`file`, `resPath`, `typeVariations: [{name, baseType, component}]`).

 **Todos os valores em px estão na resolução de saída** (`resolution`), inclusive `positionIn1080pScene`, que mantém o nome antigo por compatibilidade.

```json
{
  "project": "Game Dev UI Studio Export",
  "manifestVersion": 6,
  "resolution": { "width": 1920, "height": 1080 },
  "orientation": "landscape",
  "safeArea": null,
  "unityCanvasScaler": { "uiScaleMode": "ScaleWithScreenSize", "referenceResolution": { "x": 1920, "y": 1080 }, "screenMatchMode": "MatchWidthOrHeight", "matchWidthOrHeight": 1 },
  "exportPadding": 32,
  "engineReady": true,
  "godot": {
    "folder": "GameUI_Godot",
    "scene": "GameUI_Godot/game_ui.tscn",
    "resPath": "res://GameUI_Godot/game_ui.tscn",
    "projectSettings": {
      "display/window/size/viewport_width": 1920, "display/window/size/viewport_height": 1080,
      "display/window/stretch/mode": "canvas_items", "display/window/stretch/aspect": "keep"
    }
  },
  "assets": [
    {
      "name": "Botão Equipar",
      "type": "Botão",
      "file": "bot_o_equipar.png",
      "frameFile": "bot_o_equipar_frame.png",
      "dimensions": { "width": 240, "height": 56 },
      "textureSize": { "width": 304, "height": 120 },
      "positionIn1080pScene": { "x": 840, "y": 575 },
      "texturePositionInScene": { "x": 808, "y": 543 },
      "opacity": 1,
      "nineSlice": { "left": 46, "right": 46, "top": 46, "bottom": 46 },
      "nineSliceFromComponentEdge": { "left": 14, "right": 14, "top": 14, "bottom": 14 },
      "unitySettings": {
        "textureType": "Sprite (2D and UI)", "spriteMode": "Single", "meshType": "FullRect", "imageType": "Sliced",
        "spriteBorder": { "x": 46, "y": 46, "z": 46, "w": 46 },
        "spriteBorderLBRT": "46, 46, 46, 46"
      },
      "unrealSettings": {
        "drawAs": "Box",
        "imageSize": { "x": 304, "y": 120 },
        "margin": { "left": 0.1513, "top": 0.3833, "right": 0.1513, "bottom": 0.3833 }
      },
      "godotSettings": {
        "node": "Button",
        "patchMargin": { "left": 46, "top": 46, "right": 46, "bottom": 46 },
        "position": { "x": 808, "y": 543 }, "size": { "x": 304, "y": 120 },
        "rotationRadians": 0, "pivotOffset": { "x": 152, "y": 60 },
        "fillMode": null, "label": false
      },
      "engines": {
        "gameMaker": { "nineSlice": { "left": 46, "top": 46, "right": 46, "bottom": 46 } },
        "defold": { "slice9": [46, 46, 46, 46] },
        "phaser": { "leftWidth": 46, "rightWidth": 46, "topHeight": 46, "bottomHeight": 46 }
      },
      "text": { "content": "EQUIPAR", "fontFamily": "Rajdhani", "fontSize": 22, "fontWeight": 700, "color": "#f4f4f5",
                "align": "center", "verticalAlign": "middle", "letterSpacing": 1.5, "lineHeight": 1.2,
                "outline": null, "effect": "none", "bakedIntoPng": true },
      "rotation": null,
      "shape": null,
      "warnings": ["Texto embutido no PNG distorce no modo Sliced. ..."]
    }
  ]
}
```

| Campo | Significado |
|---|---|
| `dimensions` | Tamanho do componente na cena |
| `textureSize` | Tamanho do PNG = componente + 2 × `exportPadding` |
| `positionIn1080pScene` | Canto do componente na cena |
| `texturePositionInScene` | Canto do PNG na cena (posição − padding) |
| `nineSlice` | Margens **em px da textura** (já incluem o padding); é o valor que vai para a engine |
| `nineSliceFromComponentEdge` | As mesmas margens medidas da borda do componente (as guias do canvas) |
| `unitySettings.spriteBorder` | Vector4 na ordem do Unity: `x` = Left, `y` = Bottom, `z` = Right, `w` = Top |
| `unrealSettings.margin` | Frações 0..1 da textura por eixo (Slate Brush Margin) |
| `text` | Dados para recriar o texto na engine; `null` sem texto |
| `bar` | Só Barra: `value`, `direction`, `segments`, `trackFile`, `fillFile`, `unity` (Image Filled) e `unreal` (ProgressBar) |
| `ring` | Só Anel: `value`, `startAngle`, `thickness`, `colors`, `unity` (Filled, Radial360) |
| `rotation` | `{degrees, unityRotationZ, unrealAngle}` ou `null`. No Unity o sinal é invertido (Z positivo é anti-horário) |
| `designResolution`, `exportScale` (R5) | Resolução da cena no editor e o fator aplicado. `resolution` = `designResolution` × `exportScale` |
| `states` (R5) | `{hover, pressed, brightness}` quando há estados. Junto vêm `unitySettings.transition: "SpriteSwap"` com `highlightedSprite`/`pressedSprite` e `unrealSettings.buttonStyle` (`normal`, `hovered`, `pressed`) |
| `godotSettings` (v5) | Nó da Godot (`NinePatchRect`, `Button`, `TextureProgressBar`, `TextureRect` ou `Control`), `patchMargin` em px (`null` quando não fatia), posição e tamanho da textura, rotação em radianos (sem troca de sinal), `fillMode` da Barra e `label` (se há `Label` filho) |
| `engines` (v5) | As mesmas margens na forma de cada engine: GameMaker (L, T, R, B), Defold `slice9` (`[L, T, R, B]`) e Phaser (`leftWidth`, `rightWidth`, `topHeight`, `bottomHeight`) |
| `shape` | Só Forma: `{kind, sides, innerRatio}` |
| `warnings` | Por que aquele sprite não deve ser fatiado como está |

**Cálculo das margens:** para cada lado, `margem = max(maior raio dos cantos daquele lado + largura da borda + 2, 6)`, limitada a metade do lado menos 1 px. Na textura soma-se o padding de 32 px.

### 4.4 Importação na Unity (uGUI)
1. Arraste a pasta `Frames_Only_NoIcons` (ou `GameUI_1080p_Assets`) para `Assets/`.
2. Em cada PNG: **Texture Type** = Sprite (2D and UI), **Sprite Mode** = Single, **Mesh Type** = Full Rect.
3. Abra o **Sprite Editor** e preencha **Border** com `spriteBorderLBRT` (ordem L, B, R, T). Clique em Apply.
4. No Canvas (Canvas Scaler: Scale With Screen Size, Reference Resolution = `resolution` do manifest, ex.: 3840×2160 num export 4K), crie uma **Image** com o sprite e **Image Type** = Sliced. Com a referência igual à saída, os sprites ficam 1:1 e não é preciso mexer no Pixels Per Unit.
   - **Botão com estados (R5):** no componente Button, Transition = **Sprite Swap**, Highlighted Sprite = `_hover.png`, Pressed Sprite = `_pressed.png` (mesmo Border do normal).
5. Posição: use `texturePositionInScene` e `textureSize`, ou `positionIn1080pScene` e `dimensions` descontando o padding transparente.
6. **Rotação:** `RectTransform` Rotation Z = `rotation.unityRotationZ`.
7. **Texto:** crie um TextMeshPro com os dados de `text` (ou use o PNG com o texto já embutido, sem fatiar).
8. **Barras:** use `_track.png` como fundo e `_fill.png` numa Image **Filled** (Horizontal ou Vertical, `fillAmount` = `bar.unity.fillAmount`).
9. **Anéis:** Image **Filled**, Fill Method **Radial 360**.

### 4.5 Importação na Unreal (UMG)
1. Importe os PNGs como Texture2D (Texture Group: UI, Compression: UserInterface2D).
2. Num widget **Image** ou **Border**, em Brush: **Draw As** = Box.
3. **Margin:** use `unrealSettings.margin` (left, top, right, bottom em fração).
4. **Image Size:** `unrealSettings.imageSize`. No DPI Scaling do projeto, use `resolution` do manifest como referência.
   - **Botão com estados (R5):** no widget Button, Style → Normal / Hovered / Pressed com as texturas de `unrealSettings.buttonStyle`, todas com Draw As = Box e a mesma Margin.
5. **Rotação:** Render Transform → Angle = `rotation.unrealAngle`.
6. **Texto:** widget Text com os dados de `text`.
7. **Barras:** **ProgressBar** com Background Image = `_track.png` e Fill Image = `_fill.png`, Percent = `bar.unreal.percent`.

### 4.6 Importação na Godot 4 (R4)
1. Copie a pasta `GameUI_Godot` do ZIP para a **raiz** do projeto (`res://GameUI_Godot/`). A cena usa esse caminho.
2. Em Project Settings: Viewport Width/Height = `godot.projectSettings` (a resolução de saída, ex.: 3840×2160 num export 4K), Stretch Mode = `canvas_items`, Aspect = `keep`.
3. Abra `game_ui.tscn`. O HUD já vem montado, na ordem das camadas:

| Tipo no Studio | Nó | Configuração |
|---|---|---|
| Slot, Painel | `NinePatchRect` | `patch_margin_*` = `nineSlice` |
| Botão | `Button` | Um `StyleBoxTexture` por estado (normal, hover, pressed; R5) com as mesmas margens; focus vazio |
| Barra | `TextureProgressBar` | `_track.png` em Under, `_fill.png` em Progress, `fill_mode` pela direção, `nine_patch_stretch` |
| Anel, Forma | `TextureRect` | Imagem simples |
| Texto | `TextureRect`, ou `Control` + `Label` | `Label` quando o texto não vai no PNG |

- A opacidade já está no PNG; a cena não usa `modulate`.
- Texto fora do PNG ("Incluir texto no PNG" desmarcado) vira `Label` filho, com cor, tamanho, alinhamento e contorno. A fonte fica a padrão da Godot.
- Grupos do Studio viram grupos da Godot (aba Node → Groups), sem mudar a ordem de desenho.
- Só o `Button` recebe mouse; o resto usa `mouse_filter = Ignore`.
- Nomes de nó: `. : @ / " %` viram `_`.

**Outras engines:** GameMaker (Nine Slice no editor de sprite), Defold (`slice9` do nó de GUI) e Phaser (`NineSlice`) usam os valores de `engines`. libGDX/MonoGame (`NinePatch`) e Construct 3 (9-patch) usam `nineSlice` direto, em px.

**Não automatizável:** a Unreal não permite gerar `.uasset` fora do editor. Um script Python do editor que leia o manifest está no roadmap. **Validação em projeto real:** a Godot foi validada pelo autor na versão 4.7 (30/09/2026), seguindo o roteiro do 4.6. Unity e Unreal ainda **não foram validadas**; isso depende do autor ou da comunidade.

---

## 5. POP — Playbook de Processos Multiagente

### 5.1 Papéis (resumo)
| Agente | Responsabilidade |
|---|---|
| @tech-lead | Impacto no `state`, plano por etapas, delegação e veto a dependências desnecessárias |
| @product-spec | Fluxos, atalhos, estados vazios, regras de snap e resize |
| @front-manager | HTML/Tailwind, Inspector, modais, i18n dos textos |
| @front-canvas-dev | Renderer, geometria, gizmo, coordenadas e zoom |
| @front-state-dev | `state`, seleção, eventos, arrastar e soltar, persistência, histórico |
| @backend-manifest | Schema do projeto e do manifest, JSZip, reidratação |
| @script-dev | API `Studio`, bancada, presets e templates |
| @engine-pipeline | 9-slice, Unity e Unreal |
| @qa-auditor | Testes, edge cases, relatórios de bug |
| @perf-profiler | 60 FPS, memória, Blob URLs, debounce |
| @security-auditor | Entrada não confiável (JSON, clipboard, templates), innerHTML, CDN/SRI, headers do deploy |
| @field-research | Benchmark de ferramentas e jogos, docs oficiais das engines, pesquisa com usuários; entrega brief com fontes, sem código |

### 5.2 Fluxo padrão: nova feature
1. **Pedido:** o autor descreve o que quer (em chat ou com @tag).
2. **Triagem (@tech-lead):** classifica a complexidade (baixa, média, alta) e decide se precisa de TDD. Feature média ou alta = TDD antes de codar.
   - **Pesquisa (@field-research), quando a resposta não é óbvia:** como ferramentas e jogos resolvem o mesmo problema e o que as engines exigem, em brief com fontes. Entra antes da especificação.
3. **Especificação (@product-spec):** fluxo do usuário, atalhos, estados visuais, textos PT e EN, e o que acontece com projetos antigos.
4. **Design técnico (@tech-lead + especialistas):** campos novos em `COMPONENT_DEFAULTS`, impacto no renderer, no histórico e no manifest. Registrar no TDD.
5. **Implementação:** em blocos, com edições pontuais (regra 1 do `claude.md`). Controles novos do Inspector entram por `INSPECTOR_BINDINGS`; textos novos entram no dicionário `EN`.
6. **Validação (@qa-auditor + @perf-profiler):** checklists 5.4 e 5.5.
7. **Registro:** atualizar este documento, o painel dos agentes e a lista de bugs resolvidos.
8. **Entrega:** resumo para o autor, com o que foi testado, o que não foi e o que depende dele.

### 5.3 Fluxo padrão: correção de bug
1. **Relato:** passos para reproduzir, o esperado e o que acontece, com print ou script se possível.
2. **Reprodução (@qa-auditor):** reproduzir num teste headless antes de corrigir.
3. **Causa raiz (especialista da área):** explicar por que acontece, não só o sintoma.
4. **Correção mínima:** mexer só no necessário.
5. **Teste de regressão:** o teste do passo 2 passa a fazer parte da suíte.
6. **Registro:** entrada na tabela 5.7.

### 5.4 Checklist do @qa-auditor
- [ ] `node tests/run-all.mjs` passando: confere a sintaxe do script e roda todas as suítes headless no Chrome/Edge, com **zero erros de runtime**
- [ ] Feature nova ganha a sua suíte em `tests/test-<área>.mjs` (base comum em `tests/harness.mjs`, sem dependências de npm)
- [ ] Undo/redo desfaz a mudança num passo só
- [ ] Salvar → Abrir reproduz o projeto igual, e um projeto de versão antiga abre sem erro (`normalizeComponent`)
- [ ] Multi-seleção: a mudança vale para todos (estilo) ou só para o principal (posição e tamanho)
- [ ] Idioma: nenhuma chave nova sem tradução (script `check-i18n`), e a troca PT ⇄ EN atualiza a tela
- [ ] Export: manifest com os campos novos e PNG com o tamanho esperado
- [ ] Atalhos não disparam dentro de inputs nem com a bancada aberta
- [ ] Screenshot da interface em 1366 px e 1920 px, sem estouro de layout (a `test-topbar.mjs` mede 1280/1366/1920)
- [ ] Classe Tailwind nova? `node tools/build-css.mjs` e depois `--check` sem aviso

### 5.5 Checklist do @perf-profiler
- [ ] Nada pesado dentro de `mousemove`: alvos de snap calculados no `mousedown`
- [ ] `URL.createObjectURL` sempre com `revokeObjectURL`
- [ ] Canvas temporários zerados (`width = 0`) depois do `toBlob`
- [ ] Histórico sem duplicar imagens (`assetRegistry`)
- [ ] Autosave e histórico no debounce de 500 ms, nunca por evento
- [ ] Nenhum canvas do tamanho da cena criado para sobreposições (grid em CSS, linhas em SVG)
- [ ] Otimização só entra com medição antes/depois. **Registro R7:** cache de sprites para a sombra projetada foi implementado, medido e **descartado**. `renderScene` da cena de boas-vindas: 1,96 → 2,49 ms com GPU (Intel Iris Xe) e 2,75 → 2,73 ms sem GPU; 200 painéis com blur 40: 1,06× (GPU) e 1,25× (software). O render inteiro já cabe folgado nos 16 ms de um quadro, e o cache custaria até 64 MB de memória. Reavaliar só se aparecer cena real acima de ~8 ms
- [ ] `shadowBlur` usado só onde há sombra ligada

### 5.6 Definição de pronto
Uma entrega está pronta quando os dois checklists passaram, a documentação foi atualizada e o autor recebeu o resumo, com as limitações ditas com clareza.

### 5.7 Bugs conhecidos já resolvidos
| Rodada | Bug | Causa raiz | Correção |
|---|---|---|---|
| R1 | Bancada de Scripts não executava nada | Só havia o HTML; botões e presets sem listener | Executor assíncrono, console, presets e API completa |
| R1 | 9-slice deslocado na engine | O PNG tinha 24 px de padding, mas as margens do manifest não somavam o padding | Padding de 32 px somado às margens; margens por lado |
| R1 | `spriteBorder` do Unity e margem do Unreal errados | Ordem e unidades erradas | Unity em L, B, R, T; Unreal em fração por eixo |
| R1 | Sem Ctrl+Z | Não existia histórico | Snapshots com debounce e registro de imagens |
| R1 | "Limpar Tudo" voltava após recarregar | Autosave ignorava cena vazia | Autosave sempre grava |
| R1 | Autosave falhava em silêncio | `catch {}` vazio com quota cheia | Aviso ao usuário |
| R1 | Arquivos sobrescritos no ZIP | Nomes iguais geravam o mesmo arquivo | Sufixo com o id |
| R1 | Resize em multi-seleção mexia só em um item | Mousemove usava só o item principal | Escala proporcional da caixa |
| R1 | Zoom não seguia o cursor | Pan não era compensado | `zoomAt()` |
| R1 | Soltar imagem na área vazia trocava o ícone do selecionado | Prioridade errada no drop | Área vazia vira rascunho |
| R1 | Delete apagava itens com a bancada aberta | Atalhos globais sem checar o modal | Atalhos bloqueados com o modal aberto |
| R2 | **Painel ia para trás de tudo** | A toolbar original criava Painel com `unshift()` (índice 0 = fundo) e os outros tipos com `push()` (topo). Na R1, `Studio.create` copiou essa regra, e scripts que criavam um fundo e depois painéis viam os painéis sumirem atrás do fundo | Todo item novo usa `push()`, na toolbar e nos scripts. Ctrl+Shift+[ envia para o fundo quando for o caso |
| R2 | Ícone/SVG encolhia | O tamanho usava `Math.min(w, h) × escala` | Ajustes conter, cobrir, esticar e 1:1 |
| R2 | Lista de camadas não rolava | Flex item sem `min-h-0` crescia com o conteúdo | `min-h-0` |
| R2 | Canvas achatado em telas menores que 1920 px | `#canvasWorld` sem `shrink-0` era encolhido pelo flexbox | `shrink-0` |
| R2 | Header estourava em 1366–1600 px | Rótulos fixos | Rótulos somem abaixo de certas larguras, ícones com tooltip |
| R2 | Fundo transparente projetava um "bloco preto" | A forma da sombra era desenhada no lugar com preto 90% | Forma desenhada fora da tela; só a sombra volta |
| R2 | Bevel com aspecto de plástico | O topo do bevel era branco puro | Mistura da cor da borda com intensidade ajustável |
| R3 | Sombras confusas | Dois checkboxes sem explicação e sombra interna fixa | Seção Efeitos com presets, textos explicativos e sombra interna configurável |
| R5 | Clicar em falso no meio da tela pegava e arrastava o fundo de tela cheia | O `hitTest` testava todo item visível | Cadeado por camada: o `hitTest` pula itens trancados |
| R4 | Autosave parava em projetos com imagens grandes | localStorage tem teto de cerca de 5 MB por origem | Autosave no IndexedDB, com migração automática e o localStorage como plano B |
| R4 | Até 500 ms de edição se perdiam ao fechar a aba | O autosave só gravava depois do debounce | Gravação imediata em `visibilitychange` |
| R4 | Anel sempre nascia com "75" no centro, e o número não acompanhava o valor | O preset gravava `text: '75'` fixo | Opção "Mostrar valor no centro" (`ringShowValue`): o número vem de `ringValue` no desenho; desligada, o anel fica sem texto |
| R6 | JSON de layout de terceiros podia injetar HTML (XSS) e travar a aba | `normalizeComponent` só completava campos ausentes, sem checar tipo; as snap lines montam `<line>` por `innerHTML` com as coordenadas; resolução aceitava qualquer valor | `sanitizeProjectData` + tipagem em `normalizeComponent`, imagens só `data:image/`, resolução 16–8192, limite de 50 MB |
| R7 | Barra superior poluída e cortada em 1366 px (Exportar e idioma fora da tela) | 8 grupos com estilos diferentes; Res, formato, resolução e 3 botões de export disputando a mesma linha | Grid de 3 zonas (arquivo/inserir, cena, visualização/export) com `.tb-group`/`.tb-btn`; export num menu único. `tests/test-topbar.mjs` mede o estouro em 1280/1366/1920 px |
| R8 | Ícones da barra das camadas saíam para fora do painel; sem botão de bloquear (relatado pelo autor) | Título de 2 linhas e 7 botões na mesma linha; o botão de desagrupar usava um ícone de cadeado, que parecia ser o bloqueio | Título numa linha e barra própria com 8 ações de 20 px (cabe em 200 px); ícone de desagrupar = pasta com "−"; botão de bloquear a seleção + Ctrl+Shift+L. `tests/test-layers-toolbar.mjs` mede 200/256/480 px |
| R8 | Botões −, +, Fit e 1:1 da barra não faziam nada (relatado pelo autor) | Os botões existiam no HTML e nas constantes do JS, mas nenhum listener ligava eles; `setZoom` não tinha chamadas. Nenhum teste cobria | Listeners religados (zoom a partir do centro), atalhos Shift+1/Shift+0/Ctrl±, e 4 verificações em `test-topbar.mjs` |
| R7 | Alça do painel esquerdo não pegava o clique (achado no teste) | A régua vertical do viewport tinha o mesmo `z-30` e vinha depois no DOM, cobrindo metade da alça | Alças em `z-[35]` |
| R7 | Seletor de resolução alargava a barra em 1280 px (achado no teste) | Opção "Personalizada" com texto longo define a largura do `<select>` | Personalizada vira um `<optgroup>` próprio com o texto só "W×H"; rótulo "Snap" some abaixo de 1400 px |
| R8 | Teste "fiel ao PNG: Barra" do export SVG falhava (média 5,21, 2,54% de pixels muito diferentes, Chrome 154) | Não era a Barra: era a borda `glow`. Na franja externa do brilho o alpha é 1/255 e o RGB é ruído de arredondamento (PNG `255,0,0,1` × SVG `0,0,0,1`); o teste comparava o RGB cru e contava 255 de diferença num pixel invisível. Com borda sólida ou sem borda a diferença era 0 | `__diff` em `test-export-svg.mjs` compara a cor pré-multiplicada pelo alpha. O exportador não mudou |
| R3 | Régua vertical com 10 px de altura (achado nos testes antes da entrega) | `<canvas>` absoluto com `top`+`bottom` não estica: usa a altura intrínseca | Largura/altura explícitas com `calc(100% - 1.25rem)` |

### 5.8 Limitações e pendências conhecidas
- Funciona só com internet no primeiro carregamento (JSZip e fontes via CDN).
- Autosave é por navegador e não sincroniza duas abas no mesmo projeto: a última a gravar vence.
- Import na Unity e na Unreal ainda não validado em projeto real (Godot 4.7 validada pelo autor em 30/09/2026).
- Godot: o Anel sai como imagem simples (sem `TextureProgressBar` radial) e as fontes do Google não vão junto.
- Edição livre de pontos e curvas (pen tool) está fora do escopo atual.

### 5.9 Backlog de features (pedidas pelo autor)
**Entregues na R7:** B1 (painéis redimensionáveis, ver 1.3) e B2 (script da seleção, TDD em 2.8). Também: mesclar (Ctrl+E), importar para a cena, resoluções mobile com área segura, Tailwind compilado.

| # | Feature | Pedido | Agentes | Notas iniciais |
|---|---|---|---|---|
| B3 | **Vídeo de divulgação com /brag** | Gerar vídeo curto do Studio para README e redes | @field-research, @product-spec | Plano em `BRAG_PLANO_CASA.md` (o autor roda em casa). Hipótese de produto: exportar animação da UI (hover, barra caindo) em MP4/GIF, que passaria por TDD |
| B1 ✓ | **Painéis laterais redimensionáveis** | Arrastar a borda da barra de camadas (esquerda) e do Inspector (direita) com o cursor de duas setas (`col-resize`) e ajustar a largura como quiser | @front-manager, @product-spec, @front-state-dev | Largura mínima/máxima por painel; duplo clique na alça volta ao padrão; salvar em `game_dev_ui_studio_editor_prefs`; recalcular o fit do canvas ao soltar; testar em 1366 px |
| B2 ✓ | **Ver/copiar o script de um objeto ou da seleção** | Selecionar um item ou um conjunto (ex.: uma carta com painel, texto e outros campos) e obter o JS completo que recria aquilo | @script-dev, @backend-manifest, @front-manager | Gerar chamadas `Studio.create(tipo, props)` só com as props diferentes do preset, na ordem das camadas; ícones via `Studio.setIcon` (base64 pode ser grande: opção de omitir); grupos via `Studio.group`; posições relativas opcionais (para colar em outro lugar); abrir na Bancada ou copiar. Pedir TDD antes (complexidade média) |
