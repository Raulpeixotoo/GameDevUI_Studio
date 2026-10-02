# src/ — código-fonte do Game Dev UI Studio

O app que o usuário abre continua sendo **um arquivo só** (`devUI-Studio.html`). Ele é montado a partir daqui:

```
node tools/build.mjs          # monta o HTML e atualiza o CSS do Tailwind
node tools/build.mjs --check  # confere se o HTML está em dia com src/ (a suíte de testes também confere)
node tests/run-all.mjs        # testes headless no Chrome/Edge
```

## Como funciona
- `shell.html` tem o `<head>`, o esqueleto do `<body>` e as diretivas `<!-- @include html/... -->`, `/* @include css/app.css */` e `/* @include js/*.js */`.
- `js/*.js` **não são ES modules**: são pedaços de **um único** `<script>`, concatenados em ordem de nome. Tudo compartilha o mesmo escopo, então uma função de `07-renderer.js` pode chamar outra de `11-viewport.js` sem import. A ordem dos arquivos é a ordem de execução do código de nível superior (constantes e listeners); funções declaradas com `function` valem no arquivo inteiro.
- O CSS do Tailwind é gerado (não fica em `src/`): use as classes normalmente no HTML ou em strings do JS e rode o build.

## Mapa dos arquivos
| Arquivo | Conteúdo |
|---|---|
| `css/app.css` | Estilos próprios (gizmo, Inspector, barra superior, réguas, área segura, textura...) |
| `html/10-topbar.html` | Barra superior e menu Exportar |
| `html/20-left-panel.html` | Rascunho e lista de camadas |
| `html/30-viewport.html` | Canvas, gizmo, réguas, sobreposições, barra inferior (Fundo, Visão, Teste de tradução), alça do Inspector |
| `html/40-right-panel.html` | Inspector |
| `html/50-modals.html` | Toast e Bancada de Scripts |
| `js/01-state-dom.js` | `state` e referências de DOM |
| `js/02-i18n.js` | Dicionário `EN`, `t()`, `setLanguage()` |
| `js/03-persistence.js` | Serialização do projeto, autosave em IndexedDB |
| `js/04-history-project.js` | Undo/redo, abrir/salvar projeto, toast |
| `js/05-model.js` | 9-slice, `COMPONENT_DEFAULTS`, âncoras, `normalizeComponent`, `sanitizeProjectData`, presets |
| `js/06-welcome-scene.js` | Cena de boas-vindas (também é o preset 👋 da Bancada) e `presetCodeFrom` |
| `js/06b-showcase-scene.js` | Vitrine 4K (preset 🏆): HUD de RPG completo em 3840×2160, 176 peças, 16 grupos |
| `js/07-renderer.js` | Geometria, preenchimento, texto, pseudo-localização, contraste, textura, `renderComponentToContext` |
| `js/08-svg-export.js` | Export SVG vetorial |
| `js/09-scene-layers.js` | `renderScene`, gizmo, grupos, lista de camadas |
| `js/10-inspector.js` | `INSPECTOR_BINDINGS`, seções, busca, resoluções por aparelho, painéis redimensionáveis |
| `js/11-viewport.js` | Zoom/pan, grid, preferências, resolução do export, fundo, réguas, guias, smart guides |
| `js/12-mouse.js` | Coordenadas, hit test, arrastar, redimensionar, girar, seleção por retângulo, zoom |
| `js/13-keyboard.js` | Duplo clique, soltar arquivos, atalhos, excluir, duplicar |
| `js/14-clipboard-merge.js` | Copiar/colar, importar para a cena, mesclar, colar imagem |
| `js/15-layers-toolbar-reference.js` | Ordem das camadas, botões de inserir, rascunho |
| `js/16-export.js` | PNG de item e cena, metadados de texto |
| `js/17-godot.js` | Cena `.tscn`, tema `.tres`, Batch ZIP e manifest |
| `js/18-studio-api.js` | API `Studio`, script da seleção |
| `js/19-workbench.js` | Templates prontos e execução de scripts |
| `js/20-templates-init.js` | Templates do usuário, menu Exportar, inicialização (`load`) |

Arquivo novo: escolha um nome que caia na posição certa na ordem alfabética. Ex.: `11b-algo.js` roda depois de `11-viewport.js` e antes de `12-mouse.js`.
