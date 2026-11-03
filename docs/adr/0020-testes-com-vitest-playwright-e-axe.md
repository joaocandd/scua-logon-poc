# ADR 0020 · Testes com Vitest, Playwright e axe

- **Status:** aceita
- **Data:** 28/10/2026 (commit `27a28b0`, projeto base); registrada em 03/11/2026

## Contexto

A PoC vai ser defendida diante da banca e pode ser herdada pela Scua. Cada etapa termina com lint, testes e build verdes. Há dois tipos de coisa para testar:

- **regras com muitos casos:** o limite de 2 h extras, a interjornada de 11 h, o intervalo mínimo e as jornadas que atravessam a meia-noite. Elas pedem testes rápidos;
- **fluxos inteiros no navegador:** aprovar no celular, configurar uma regra no desktop, nos temas claro e escuro, com a acessibilidade conferida (ADR 0019).

## Decisão

1. **Unitários com Vitest,** pelo builder `@angular/build:unit-test`, o padrão dos projetos novos do Angular, com o jsdom. As funções puras (motor de regras, contas das telas, rotas da API simulada) são testadas sem o `TestBed`. Todo componente do design system tem teste.
2. **Ponta a ponta com Playwright,** em quatro projetos: `desktop` (1280 px), `celular` (390 px), `desktop-escuro` e `celular-escuro`, que roda só a varredura do axe. Fuso America/Sao_Paulo e idioma pt-BR em todos (`playwright.config.ts`).
3. **Os testes acham os elementos como uma pessoa acha:** pelo papel e pelo nome (`getByRole('button', { name: 'Aprovar' })`), nunca por classe CSS.
4. **O axe roda dentro dos testes de ponta a ponta,** com o `@axe-core/playwright`: uma chamada a `expectNoA11yViolations(page)` depois de cada estado que importa. Toda feature tem ao menos um teste de ponta a ponta com axe.
5. **O CI roda tudo em cada push e pull request** (`.github/workflows/ci.yml`): lint, contraste, unitários, build, build do Storybook e ponta a ponta. No CI, um teste que falha tem uma nova tentativa, e o relatório do Playwright fica guardado.

## Alternativas consideradas

- **Karma com Jasmine.** Era o padrão antigo do Angular, mas o próprio projeto do Karma o descontinuou em 2023.
- **Jest.** Popular, mas no Angular depende de um preset de terceiros. O Vitest tem builder do próprio Angular CLI.
- **Cypress.** Cobre o mesmo que o Playwright no ponta a ponta. O Playwright roda os mesmos testes em vários tamanhos de tela e temas com uma configuração só, em paralelo e sem plano pago, e a Deque, que mantém o axe, publica o `@axe-core/playwright`.

## Consequências

- Em 03/11/2026: 502 testes unitários em 54 arquivos e 187 testes de ponta a ponta em 10 arquivos. Nos quatro projetos, os 187 viram 606 execuções. Dessas, 94 são puladas de propósito, quando o teste não vale para o projeto: o reflow, por exemplo, fixa a largura e roda só no `desktop`.
- Rodar o ponta a ponta inteiro num notebook ocupado pode estourar a espera de 5 s de um teste, porque o servidor de desenvolvimento compila sob demanda. Um teste que só falha assim passa quando roda de novo (`npx playwright test --last-failed`). No CI, a nova tentativa faz isso sozinha.
- Como os testes acham os elementos pelo papel e pelo nome, eles continuam valendo quando o visual muda. É o que a fase 0 da proposta de arquitetura pede para as telas atuais.
- Um texto de botão mudado quebra o teste que o usa. É intencional: o texto faz parte do que a pessoa vê.
- O ponta a ponta é a parte lenta do CI, porque roda cada teste em até quatro configurações.
