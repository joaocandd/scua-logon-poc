# ADR 0019 · Meta de acessibilidade: ABNT NBR 17225:2025 (WCAG 2.2 AA)

- **Status:** aceita
- **Data:** 28/10/2026 (commit `d496a2d`, contexto do projeto); registrada em 03/11/2026

## Contexto

O Scua Logon tem três tipos de usuário. O gestor aprova pedidos no celular, muitas vezes longe da mesa. O RH configura regras no desktop. E o colaborador bloqueado precisa entender por quê. Uma tela que só funciona com mouse, ou com um contraste que some ao sol, tira alguém do fluxo.

A ABNT NBR 17225:2025 é a norma brasileira de acessibilidade para conteúdo web, e o `CLAUDE.md` a trata como equivalente à WCAG 2.2 AA. [CONFIRMAR se a NBR 17225 pede algo além da WCAG 2.2 AA que os testes abaixo não cobrem]

## Decisão

1. **A meta é a NBR 17225:2025 (WCAG 2.2 AA) em todas as telas**, inclusive a página pública do link do e-mail.
2. **As regras de projeto estão no `CLAUDE.md`** (Acessibilidade): HTML semântico, tudo pelo teclado, foco visível de 2 px, contraste de 4,5:1 para texto e 3:1 para bordas e ícones, alvos de 44 px no celular, alternativa a arrastar, rótulo e erro em texto nos formulários, `prefers-reduced-motion` e o ConfirmDialog no lugar de `alert` e `confirm`.
3. **O CI confere sozinho, em cada push e pull request:**
   - o axe (`@axe-core/playwright`) com as regras `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` e `best-practice` (`e2e/support/a11y.ts`), em todas as rotas e nos estados simulados, em desktop e celular, nos temas claro e escuro;
   - o percurso só com teclado (`e2e/keyboard.spec.ts`) e a largura de 320 px com zoom de 200% (`e2e/reflow.spec.ts`);
   - o contraste dos pares de cor do `tokens.css` nos dois temas (`npm run contrast`);
   - as regras de acessibilidade de template do angular-eslint (`templateAccessibility`).
4. **O Storybook** tem o addon de acessibilidade, que mostra as violações de cada componente nos dois temas.
5. **O teste com leitor de tela é manual,** em cada área, antes de dar a área por pronta. [CONFIRMAR quem faz e com qual leitor de tela]

## Alternativas consideradas

- **WCAG 2.1 AA.** Ainda é a referência de muitos contratos, mas deixa de fora critérios que pesam neste produto: o tamanho mínimo do alvo de toque (2.5.8), para o gestor no celular, o foco que não fica escondido (2.4.11) e o login sem teste de memória (3.3.8).
- **WCAG AAA.** Nem o W3C recomenda AAA como meta para um site inteiro: alguns critérios não se aplicam a todo conteúdo. Pontos de AAA entram quando são baratos, como o alvo de 44 px.
- **Só uma auditoria manual no fim.** Sai mais barato no começo, mas os problemas aparecem tarde e voltam a cada mudança.

## Consequências

- Uma violação do axe quebra o CI, e a tela não entra no `main`.
- A cor da marca tem limites. O #C2560A com texto branco fica no limite (4,54:1), e texto laranja pequeno sobre areia ou pêssego usa o #8F3D06 (`CLAUDE.md`, Tokens).
- O axe não pega tudo: uma ordem de leitura confusa ou um texto sem sentido passam. Por isso o teste manual continua.
- O e2e roda em quatro configurações (ADR 0020), e isso pesa no tempo do CI.
