# Scua Logon · protótipo e prova de conceito

Projeto de estudantes para o desafio de modernização do front-end do Scua Logon. Não é o código da Scua: é um app novo, com dados fictícios, que demonstra a proposta de UX e de arquitetura da equipe.

## O produto em uma frase
O Scua Logon bloqueia a estação de trabalho (Windows) fora do horário permitido. Hora extra só acontece depois que o colaborador pede uma extensão e o gestor aprova, e tudo fica registrado.

## Quem usa
- **RH / administrador** (desktop): configura jornadas, intervalos, exceções e feriados; acompanha relatórios e auditoria.
- **Gestor aprovador** (muitas vezes no celular): aprova ou recusa pedidos de extensão, rápido e com contexto.
- **Colaborador**: entende por que foi bloqueado, pede extensão com motivo e acompanha o status.

## Escopo desta PoC
1. **Fluxo A · Aprovar hora extra** (gestor, mobile primeiro): caixa de pedidos com contexto, aprovar, recusar com motivo, aprovar em lote, desfazer.
2. **Fluxo B · Configurar regra de jornada** (RH, desktop): editor com linha do tempo visual, resumo em português, prévia de impacto, conflitos e simulador "e se?".
3. Extras: login acessível; página pública de aprovação por e-mail com estados de erro humanos; painel "Hoje".

Fora do escopo: backend, autenticação real e integrações reais (Teams, WhatsApp, login corporativo). Tudo isso é simulado.

## Regras de negócio
- Fluxo de extensão: colaborador pede (motivo + novo horário de fim) → gestor aprova ou recusa → RH valida (etapa opcional, configurável por regra).
- Limite de 2 h extras por dia (CLT art. 59). Interjornada mínima de 11 h (CLT art. 66). Intervalo mínimo de 1 h em jornadas acima de 6 h (CLT art. 71).
- Estação: bloqueada antes do início; libera quando o colaborador registra o início; bloqueia nos intervalos; bloqueia no fim; extensão aprovada libera até o novo fim.
- Avisos antes do bloqueio: padrão de 15 e 5 minutos, configurável.
- Jornadas podem atravessar a meia-noite. Datas e horas sempre no fuso America/Sao_Paulo.
- Status do pedido: `aguardando_gestor`, `aguardando_rh`, `aprovado`, `recusado`, `expirado`, `cancelado`.
- Estado da estação: `em_jornada`, `intervalo`, `he_aprovada`, `bloqueada`, `fora_expediente`.

## Glossário (interface em pt-BR, código em inglês)
| Interface | Código |
|---|---|
| Colaborador | `Employee` |
| Gestor / aprovador | `Manager` / `approver` |
| Grupo | `Group` |
| Regra de jornada | `WorkSchedule` |
| Intervalo | `Break` |
| Exceção | `ScheduleException` |
| Feriado | `Holiday` |
| Pedido de extensão | `ExtensionRequest` |
| Estação | `Workstation` |
| Histórico | `ActivityEvent` |
| Aprovar / Recusar | `approve` / `reject` |

## Stack
- Angular na última versão estável (22.x em out/2026): componentes standalone, control flow `@if`/`@for`, signals, padrões atuais do `ng new` (zoneless, se for o padrão).
- Estado: signals em serviços; `httpResource`/`resource` para dados do servidor. NgRx SignalStore só se uma feature crescer muito.
- Formulários: Signal Forms (`@angular/forms/signals`) com o Field do design system; erros de campo só depois da primeira tentativa de envio (ADR 0008).
- UI: Angular Material 3 + CDK, tematizado com os tokens abaixo. Angular Aria para widgets sob medida.
- Estilos: SCSS + variáveis CSS. **Não usar** Tailwind, Bootstrap, jQuery nem PrimeNG (licença comercial desde a v22).
- Ícones: um único conjunto (Material Symbols), em SVG gerado só com os ícones usados (`npm run icons`, ADR 0004). Fonte: Montserrat via `@fontsource/montserrat` (woff2, sem Google Fonts).
- Testes: Vitest (unitário), Playwright + `@axe-core/playwright` (ponta a ponta e acessibilidade). Lint: angular-eslint com regras de acessibilidade de template. Storybook 10 com `@storybook/angular-vite` (Vite, sem webpack; ADR 0003) para o design system.
- Dados: API simulada por interceptor HTTP, com fixtures em `src/app/mocks/`.

## Estrutura
```
src/app/
  core/            layout, autenticação simulada, interceptor da API simulada, erro global
  design-system/   componentes base com stories
  features/
    today/         painel ao vivo                 /hoje
    approvals/     caixa de aprovações (fluxo A)  /aprovacoes  e  /aprovacao/:token (pública)
    schedules/     regras de jornada (fluxo B)    /regras  e  /regras/:id
    people/        colaboradores e grupos         /pessoas
    reports/       relatórios                     /relatorios
    settings/      configurações                  /configuracoes
  shared/          modelos, utilitários de data e hora, schedule-engine
  mocks/           fixtures e handlers
```
Cada feature tem `pages/` (rotas), `ui/` (apresentação, sem injetar serviços) e `data/` (serviços e signals). Rotas sob demanda. URLs em português, sem `#`.

## Tokens de design (marca atual da Scua, de scua.com.br)
Implementados em `src/styles/tokens.css`, que vale como fonte; mantenha este resumo igual a ele. O tema do Material deriva desses tokens (ADR 0002).
```css
:root {
  /* Primitivos */
  --scua-orange-500: #EB6B06; --scua-orange-600: #C2560A; --scua-orange-800: #8F3D06;
  --scua-orange-300: #F8A24A; --scua-peach-100: #FDEBD9;
  --scua-ink-900: #1C1C1C; --scua-ink-600: #5B5B58; --scua-ink-400: #8A8A86;
  --scua-sand-200: #D7D6D1; --scua-sand-50: #F5F4F1; --scua-white: #FFFFFF;

  /* Semânticos: componentes usam só estes */
  --color-bg: var(--scua-white);           --color-bg-subtle: var(--scua-sand-50);
  --color-surface: var(--scua-white);
  --color-text: var(--scua-ink-900);       --color-text-muted: var(--scua-ink-600);
  --color-border: var(--scua-sand-200);    --color-border-strong: var(--scua-ink-400);
  --color-primary: var(--scua-orange-600); --color-on-primary: var(--scua-white);
  --color-accent: var(--scua-orange-500);  --color-highlight-bg: var(--scua-peach-100);
  --color-link: var(--scua-orange-800);    --color-text-on-highlight: var(--scua-orange-800);
  --color-focus-ring: var(--scua-orange-600);
  --color-hatch: #E4E1DA;

  --status-approved: #067647; --status-pending: #B54708; --status-rejected: #B42318;
  --status-neutral: #5B5B58;  --status-blocked: var(--scua-ink-900);

  --font-sans: "Montserrat", system-ui, sans-serif;
  --text-xs: 12px; --text-sm: 14px; --text-md: 16px; --text-lg: 20px; --text-xl: 24px; --text-2xl: 32px;
  --leading-tight: 1.2; --leading-body: 1.5;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-pill: 999px;
  --control-height: 44px; --border-width: 1px; --focus-ring-width: 2px;
  --shadow-ring: 0 0 0 var(--border-width) var(--color-border);
  --shadow-raised: 0 1px 2px rgba(28,28,28,.06), 0 8px 24px -12px rgba(143,61,6,.25);
}
/* Tema escuro: em @media (prefers-color-scheme: dark) com :root:not([data-theme="light"]) e em :root[data-theme="dark"] */
/* --color-bg #141311 · --color-surface #1E1C19 · --color-bg-subtle #1A1816 · --color-text #F1EFEA · --color-text-muted #ABA79F
   --color-border #36322D · --color-border-strong #8A8A86 · --color-primary #F0883E · --color-on-primary #1C1C1C
   --color-accent #EB6B06 · --color-link #F0883E · --color-highlight-bg #3B2516 · --color-text-on-highlight #F8B06A
   --color-focus-ring #F0883E · --color-hatch #2C2925
   --status-approved #47CD89 · --status-pending #FDB022 · --status-rejected #F97066 · --status-neutral #ABA79F
   --status-blocked #F1EFEA */
```
Regras de uso (`npm run contrast` confere os pares nos dois temas):
- Botão com texto branco: `--color-primary` (#C2560A, 4,54:1, no limite). Hover e foco escurecem o botão, nunca clareiam.
- Link de texto: `--color-link` (#8F3D06; 7,4:1 no branco, 6,7:1 na areia). #C2560A como texto reprova na areia (4,12:1).
- O laranja #EB6B06 (`--color-accent`) só em áreas grandes, ícones e gráficos (com texto branco ele reprova: 3,16:1). Nunca sobre areia (2,88:1); ali use `--color-primary`.
- Texto laranja pequeno sobre areia ou pêssego: #8F3D06.
- Status nunca só por cor: sempre ícone + rótulo. Laranja é cor da marca, nunca significa "cancelado".
- Estação bloqueada = hachura diagonal; liberada = laranja (padrão visual do site da Scua).
- Produto é mais denso que o site: títulos de 24 a 32 px, corpo de 14 a 16 px, tabelas em 14 px.

## Voz e textos
- pt-BR, frases curtas e afirmativas. Fale do resultado, não do sistema: "Pedido aprovado", não "Request processado com sucesso".
- Erros dizem o que aconteceu e o que fazer. Nunca mostrar JSON, código HTTP ou stack para o usuário.
- O colaborador bloqueado não é infrator: tom neutro ("Fora do horário da sua jornada").
- Botões dizem a ação: "Aprovar", "Recusar", "Salvar regra".

## Acessibilidade (meta: ABNT NBR 17225:2025, equivalente a WCAG 2.2 AA)
- HTML semântico: `<button>` para ações, `<a>` para navegação, landmarks, um `<h1>` por página, `lang="pt-BR"`.
- Tudo funciona por teclado; foco visível (anel de 2 px em `--color-focus-ring`); ordem lógica.
- Contraste mínimo de 4,5:1 para texto e 3:1 para bordas e ícones que identificam controles.
- Alvos de toque de 44 px no celular (mínimo absoluto de 24 px).
- Toda ação de arrastar tem alternativa sem arrastar.
- Formulários: rótulo visível ligado ao campo, `autocomplete`, erro descrito em texto e anunciado.
- Respeitar `prefers-reduced-motion`. Nunca usar `alert`/`confirm` nativos: usar o ConfirmDialog.

## Comandos
Node 24 (`.nvmrc`). Depois de clonar: `npm ci` e `npx playwright install chromium`.
- `npm start`: servidor de desenvolvimento em http://localhost:4200.
- `npm test`: testes unitários (Vitest), uma execução. `npm run test:watch` para o modo observação.
- `npm run e2e`: ponta a ponta e acessibilidade (Playwright + axe) em desktop (1280 px), celular (390 px) e desktop no tema escuro. Sobe o servidor sozinho; relatório em `playwright-report/`.
- `npm run lint`: ESLint (com acessibilidade de template), tipos do `e2e/` e Prettier. `npm run format` corrige a formatação (Markdown fica de fora).
- `npm run build`: build de produção em `dist/`.
- `npm run contrast`: contraste WCAG dos pares de cor do `tokens.css`, nos temas claro e escuro.
- `npm run storybook`: Storybook em http://localhost:6006 (botão claro/escuro na barra). `npm run build-storybook` gera em `dist/storybook/`.
- `npm run icons`: regenera `src/app/design-system/icon/icons.ts` depois de mudar a lista em `scripts/icons.mjs`.
- CI: `.github/workflows/ci.yml` roda, em cada push e pull request, a checagem da cópia do CLAUDE.md, lint, contraste, testes, build, build do Storybook e e2e.

## Como trabalhar neste repositório
- Antes de mudanças grandes, proponha um plano curto e espere aprovação.
- Toda tela tem os estados carregando, vazio, erro, sem permissão e sucesso.
- Todo componente do design system tem story e teste. Toda feature tem ao menos um teste de ponta a ponta com axe.
- Ao terminar uma tarefa: rode lint, testes e build; corrija o que quebrar; resuma em português o que mudou e por quê.
- Decisões de arquitetura viram ADR curta em `docs/adr/` (contexto, decisão, alternativas, consequências).
- Ao mudar este arquivo, copie para `.github/copilot-instructions.md`. O CI falha se os dois forem diferentes.
- Não adicione dependência sem justificar no resumo.
- A equipe precisa dominar o código para a defesa: prefira soluções simples e explique quando pedirem.

## Confidencialidade
Só dados fictícios. Nunca coloque neste repositório dados reais de clientes, credenciais, documentos internos ou código da Scua.
