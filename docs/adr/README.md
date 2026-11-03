# Decisões de arquitetura (ADRs)

Cada ADR registra uma decisão em quatro partes: contexto, decisão, alternativas e consequências. Elas vêm do código que existe: quem quiser saber por que algo é assim começa por aqui.

Uma ADR não é reescrita quando a decisão muda. Uma ADR nova a substitui, e a antiga ganha no status quem a substituiu.

## Índice

| Nº | Decisão | Status | Data |
|---|---|---|---|
| [0001](0001-spa-sem-ssr.md) | App de página única, sem renderização no servidor | aceita | 28/10/2026 |
| [0002](0002-tema-do-material-a-partir-dos-tokens.md) | O tema do Angular Material vem dos nossos tokens | **substituída pela 0014** | 28/10/2026 |
| [0003](0003-storybook-com-angular-vite.md) | Storybook com o `@storybook/angular-vite` | aceita | 28/10/2026 |
| [0004](0004-design-system-sobre-html-nativo-e-cdk.md) | Design system sobre HTML nativo e o CDK, com ícones em SVG | aceita; **item 3 revogado pela 0014** | 29/10/2026 |
| [0005](0005-api-simulada-por-interceptor.md) | API simulada por interceptor HTTP | aceita | 29/10/2026 |
| [0006](0006-datas-fuso-e-motor-de-regras.md) | Datas, fuso e motor de regras sem biblioteca de datas | aceita | 29/10/2026 |
| [0007](0007-casca-do-app.md) | Casca do app: navegação só com CSS e widgets do Angular Aria | aceita | 29/10/2026 |
| [0008](0008-formularios-com-signal-forms.md) | Formulários com Signal Forms | aceita | 29/10/2026 |
| [0009](0009-caixa-de-aprovacoes.md) | Caixa de aprovações: desfazer no servidor, consulta periódica e detalhe na mesma rota | aceita | 01/11/2026 |
| [0010](0010-aprovacao-pelo-link-do-email.md) | Aprovação pelo link do e-mail: token nas rotas do fluxo A e resposta mínima | aceita | 02/11/2026 |
| [0011](0011-editor-de-regras-de-jornada.md) | Editor de regras de jornada: rascunho, dois tipos de erro e intervalo mínimo | aceita | 02/11/2026 |
| [0012](0012-editor-de-regras-impacto-observacao.md) | Editor de regras: aplicação, resumo, simulador, impacto ao salvar e modo observação | aceita | 02/11/2026 |
| [0013](0013-painel-hoje.md) | Painel "Hoje": estado real das estações, alertas e custo estimado | aceita | 02/11/2026 |
| [0014](0014-sem-angular-material.md) | Sem Angular Material no app; o tema fica como referência | aceita | 03/11/2026 |
| [0015](0015-fonte-variavel.md) | Montserrat variável no lugar de quatro pesos fixos | aceita | 03/11/2026 |
| [0016](0016-login-pela-api-simulada.md) | Login pela API simulada: quem entra vira o usuário atual | aceita | 30/10/2026 |
| [0017](0017-angular-22-e-migracao-por-etapas.md) | Angular 22 e migração por etapas, sem reescrita | aceita | 28/10/2026 |
| [0018](0018-estado-com-signals-e-httpresource.md) | Estado com signals e `httpResource`, sem biblioteca de estado | aceita | 29/10/2026 |
| [0019](0019-meta-de-acessibilidade.md) | Meta de acessibilidade: ABNT NBR 17225:2025 (WCAG 2.2 AA) | aceita | 28/10/2026 |
| [0020](0020-testes-com-vitest-playwright-e-axe.md) | Testes com Vitest, Playwright e axe | aceita | 28/10/2026 |

Duas observações:

- **0015** foi escrita como 0013 no `feat/auditoria` (commit `19daf81`). Virou 0015 ao juntar com o `main`, que já tinha a 0013 do painel Hoje.
- **0016 a 0020** registram decisões tomadas antes, que ficaram sem ADR na época. A data no índice é a da decisão; cada ADR diz o commit e o dia em que foi registrada.

## Por assunto

- **Base do app:** 0017 (versão do Angular e migração), 0001 (SPA), 0007 (casca), 0016 (login).
- **Design system e marca:** 0004 (componentes e ícones), 0014 (sem Material; antes, 0002), 0015 (fonte), 0003 (Storybook).
- **Dados e estado:** 0005 (API simulada), 0018 (signals e `httpResource`), 0006 (datas e motor de regras).
- **Formulários:** 0008, e os erros de regra do editor na 0011.
- **Qualidade:** 0019 (meta de acessibilidade), 0020 (testes).
- **Fluxo A, aprovar hora extra:** 0009 (caixa de aprovações), 0010 (link do e-mail).
- **Fluxo B, regras de jornada:** 0011 e 0012.
- **Painel Hoje:** 0013.

## Temas do prompt 12 e onde estão

O prompt 12 (`docs/prompts-claude-code.md`) listou seis temas de ADR:

| Tema | Onde está |
|---|---|
| Versão do Angular e migração incremental em vez de reescrita | 0017. As fases da migração estão na [proposta de arquitetura](../proposta-arquitetura.md). |
| Angular Material 3 com tokens em vez de PrimeNG ou Tailwind | 0002, substituída pela 0014: o app não usa o Material, e o tema a partir dos tokens ficou em [`docs/tema-material.md`](../tema-material.md) para as telas atuais da Scua. A 0004 explica o design system próprio. PrimeNG, Tailwind e Bootstrap estão proibidos no `CLAUDE.md`. |
| Signals e `httpResource` como estado | 0018. |
| API simulada por interceptor | 0005, e o login na 0016. |
| Meta de acessibilidade NBR 17225 / WCAG 2.2 AA | 0019. |
| Testes com Vitest, Playwright e axe | 0020. |

## Como escrever uma ADR nova

1. Use o próximo número livre e um nome curto: `0021-assunto-em-poucas-palavras.md`.
2. Comece por título, status (`aceita`, ou `substituída pela ADR N`) e data.
3. Escreva contexto, decisão, alternativas consideradas e consequências. Frases curtas, em português.
4. Se ela substitui outra, atualize o status da antiga e este índice.
