# /brag — plano para rodar em casa

Escopo levantado pelo @field-research (30/09/2026). Objetivo: gerar um vídeo curto de divulgação do Game Dev UI Studio para o README, o GitHub e as redes, e avaliar se vale virar recurso do produto.

## O que é
- **/brag** ([latent-spaces/brag](https://github.com/latent-spaces/brag), MIT): skill do Claude Code que lê o projeto, escolhe o ângulo de venda, escreve roteiro e texto de post e renderiza um vídeo de lançamento.
- **Motor:** [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache 2.0). O vídeo é montado em HTML/CSS/JS e gravado quadro a quadro no Chrome headless + FFmpeg, **tudo local**, sem chave paga nem custo por vídeo.
- **Saída:** pasta `brag-output/` com o plano, o brief de composição, o texto do post e `brag.mp4`.

## Pré-requisitos (PC de casa)
- [ ] Node.js 22+ (`node -v`)
- [ ] FFmpeg no PATH (`ffmpeg -version`). No Windows: `winget install Gyan.FFmpeg`, depois feche e reabra o terminal
- [ ] Chrome ou Edge instalado (o HyperFrames usa o Chrome headless)
- [ ] Windows: **Modo Desenvolvedor** ligado (Configurações → Sistema → Para desenvolvedores), senão a instalação falha nos symlinks. Alternativa: terminal como administrador
- [ ] Git (para clonar o repositório do Studio em casa)

## Passo a passo
1. Clonar ou copiar o projeto do Studio para uma pasta e abrir o Claude Code nela.
2. Instalar a skill:
   ```
   /plugin marketplace add latent-spaces/brag
   /plugin install brag@brag
   ```
3. Antes de gerar, rodar `node tests/run-all.mjs` para garantir que o app está sadio (o vídeo pode usar screenshots dele).
4. Gerar o primeiro vídeo com um tom que combine com ferramenta de game dev:
   ```
   /brag --tone "trailer de ferramenta indie de game dev, energia de devlog, 30 segundos"
   ```
5. Conferir `brag-output/brag.mp4` e o texto do post.

## O que mostrar no vídeo (roteiro sugerido)
1. Tela vazia → cena de boas-vindas aparecendo (o app abre pronto).
2. Criar um botão e um slot pela barra, mudar cor e bevel no Inspector.
3. Bancada de Scripts: rodar o preset "🎒 Grid Inventário 4x4" (a grade aparece de uma vez).
4. Menu **Exportar ▾** → Pacote ZIP para engines, com o texto "Unity · Unreal · Godot".
5. Fecho: link `dev-ui-studio.vercel.app` e "open source (AGPL-3.0)".

## Cuidados
- **Não commitar** `brag-output/` no repositório (vídeos pesam). Adicionar ao `.vercelignore` e não incluir no `deploy/`.
- O estilo padrão é "lançamento de startup"; sem `--tone` o texto pode soar exagerado.
- Voz (opcional) usa Kokoro via HyperFrames; testar primeiro sem voz.
- Conferir se o vídeo não mostra dados pessoais (e-mail, caminhos de pasta, abas abertas).

## Critério de sucesso
- [ ] `brag.mp4` de 20 a 40 s gerado sem erro
- [ ] Texto do post revisado (PT e EN)
- [ ] Vídeo adicionado ao README (GIF curto ou link)
- [ ] Anotar tempo total e problemas encontrados para o @field-research

## Próximo passo possível (produto, hipótese)
O Studio desenha UI em Canvas/HTML, o mesmo tipo de conteúdo que o HyperFrames grava. Se o teste for bom, avaliar um recurso "exportar animação" (hover de botão, barra de vida caindo, anel carregando) em MP4/GIF. Isso passa por TDD e pelo @tech-lead antes (dependência de FFmpeg não roda no navegador; alternativa seria WebCodecs/MediaRecorder no próprio app).
