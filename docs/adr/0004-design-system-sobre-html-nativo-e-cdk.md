# ADR 0004 · Design system sobre HTML nativo e o CDK, com ícones em SVG

- **Status:** aceita
- **Data:** 29/10/2026

## Contexto

Precisamos dos componentes base: Button, Field, StatusBadge, EmptyState, ErrorState, ConfirmDialog, aviso (toast), PageHeader e WorkdayTimeline. O Angular Material tem botão, campo (`mat-form-field`), snack bar e diálogo prontos. O CLAUDE.md pede API pública nossa, nenhuma cor ou medida fixa (só tokens), rótulo visível ligado ao campo, erro anunciado, alvo de toque de 44 px e ícones do Material Symbols.

## Decisão

1. **Componentes simples em HTML nativo e tokens:** Button, Field, StatusBadge, EmptyState, ErrorState, PageHeader e WorkdayTimeline.
   - O Button é o próprio `<button>` ou `<a>` (`<button app-button>`, seletor de atributo, como o `mat-button`).
   - O Field envolve um `<input>`, `<select>` ou `<textarea>` nativo marcado com `appFieldControl`. Funciona com qualquer API de formulário.
2. **Comportamento de acessibilidade difícil vem do CDK:**
   - o Dialog do CDK no ConfirmDialog: foco preso, Esc fecha, foco volta para quem abriu;
   - o Overlay e o LiveAnnouncer no aviso.
3. **O Material continua no tema** (ADR 0002) e entra em componentes complexos que vierem depois, como data em calendário, menu e tabela, sempre por trás da nossa API.
4. **Ícones em SVG, só os usados.** O `scripts/icons.mjs` lê o `@material-symbols/svg-400` (dependência de desenvolvimento) e gera `src/app/design-system/icon/icons.ts`, com o desenho de cada ícone da lista e o tipo `IconName`. Ícone novo: acrescentar o nome na lista e rodar `npm run icons`.
5. **Botão em loading fica com `aria-disabled` e `aria-busy`, não com `disabled`.** O `disabled` nativo tira o foco do botão e o foco cai no começo da página no meio da ação. O botão bloqueia o clique enquanto carrega.

## Alternativas consideradas

- **Componentes do Material com overrides de tokens** (`MatButton`, `mat-form-field`, `MatSnackBar`, `MatDialog`):
  - o rótulo do `mat-form-field` fica dentro do campo e flutua; queremos o rótulo sempre visível acima;
  - o snack bar não pausa com mouse ou foco (WCAG 2.2.1), e o "Desfazer" some antes de quem usa teclado chegar nele;
  - cada componente exige overrides próprios para seguir os tokens.
- **Fonte do Material Symbols** (`@fontsource/material-symbols-outlined`): 323 kB de woff2, e o nome do ícone aparece como texto até a fonte carregar.
- **Importar o `.svg` direto com um loader do build:** funciona no build do app (esbuild), mas o Storybook (Vite) e os testes (Vitest) precisariam de configuração própria. O arquivo gerado é TypeScript comum e funciona igual nos três.

## Consequências

- Mais código nosso, mas pequeno: cada componente tem story e teste unitário, e o axe roda nas stories nos dois temas.
- Nome de ícone errado não compila (`IconName`). Os 19 ícones de hoje somam cerca de 7 kB no código-fonte.
- O `styles.scss` inclui a classe `.cdk-visually-hidden` do CDK. Sem ela, o texto que o LiveAnnouncer manda para o leitor de tela aparece na página.
- Medidas que faltavam viraram tokens: `--border-width` (1 px) e `--focus-ring-width` (2 px).
- Se o Material resolver melhor um componente no futuro, dá para trocar por dentro sem mudar a API usada pelas telas.
