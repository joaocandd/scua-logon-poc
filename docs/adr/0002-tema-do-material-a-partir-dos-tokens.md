# ADR 0002 · O tema do Angular Material vem dos nossos tokens

- **Status:** aceita
- **Data:** 28/10/2026

## Contexto

O Angular Material 3 gera um tema a partir de uma cor de origem. O schematic `ng generate @angular/material:theme-color` com #C2560A cria paletas tonais, mas o primário que o Material usa no tema claro é o tom 40 dessa paleta: #9E4300, não o laranja da marca. No tema escuro ele usaria o tom 80 (#FFB691). Os tokens da Scua (`src/styles/tokens.css`) têm valores próprios para os dois temas, já conferidos no contraste.

Além disso, os estados de hover e foco do Material 3 clareiam o botão cheio com uma camada branca. Com texto branco sobre #C2560A (4,54:1), o contraste cai para 3,87:1 no foco.

## Decisão

1. Usar o schematic só para gerar as paletas (`src/styles/_theme-colors.scss`), que alimentam as cores que não temos como token (superfícies em camadas, secundária, terciária).
2. Com `mat.theme-overrides`, ligar os tokens de sistema do Material às nossas variáveis: `primary`, `on-primary`, `background`, `surface`, `on-surface`, `on-surface-variant`, `outline`, `outline-variant` e `error`.
3. O claro e o escuro seguem o `tokens.css`: o `color-scheme` é definido nos mesmos seletores do tema escuro, então o `light-dark()` do Material e as nossas variáveis sempre trocam juntos.
4. Ajustar os componentes com os mixins de override: raio de 8 px em botões e campos, 16 px em cards, anel de foco de 2 px (`strong-focus-indicators`) e estados dos botões que não baixam o contraste (camada de estado em `--color-text` no botão cheio; rótulos em `--color-link` nos botões de texto e com contorno).
5. `scripts/check-contrast.mjs` confere os pares de cor e também o texto dos botões em hover e foco.

## Alternativas consideradas

- **Só o tema gerado pelo schematic.** É o caminho mais curto, mas o primário seria #9E4300 e o tema escuro não seguiria os nossos valores.
- **Paleta escrita à mão com #C2560A no tom 40.** Distorce a escala tonal do Material e não resolve o tema escuro nem os estados de hover e foco.
- **Não usar o Angular Material.** Teríamos que construir e manter acessibilidade de diálogos, menus e campos. Está fora do tempo da PoC.

## Consequências

- Uma única fonte de cor: mudar um token no `tokens.css` muda o app, o Material e o Storybook, e o `npm run contrast` avisa se algo reprovar.
- Atualizações do Material podem renomear tokens de override. O build falha com mensagem clara quando isso acontece.
- Componentes novos do Material podem ter estados que ainda não conferimos. Cada componente do design system ganha story com o addon de acessibilidade, nos dois temas.
