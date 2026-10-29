# ADR 0007 · Casca do app: navegação só com CSS e widgets do Angular Aria

- **Status:** aceita
- **Data:** 29/10/2026

## Contexto

A casca do app (`core/layout/`) tem um menu lateral no desktop e uma barra inferior com "Mais" no celular. Tem também o link "Pular para o conteúdo", a busca como paleta de comandos (Ctrl+K) e o menu do usuário com o tema. O CLAUDE.md pede o padrão ARIA de combobox com listbox na busca, Angular Aria para widgets sob medida e um `h1` por página. Também pede foco visível, alvos de 44 px e respeito ao tema escolhido.

## Decisão

1. **A casca é uma rota de layout.** O `AppShell` envolve as páginas como rotas filhas. O login e a aprovação pelo link do e-mail entram depois como irmãs da casca, sem menu.
2. **A troca entre desktop e celular é só de CSS**, a partir de 1024 px (`64em`, o mesmo ponto de quebra do `PageHeader`). As duas navegações ficam no HTML, e a escondida usa `display: none`, então sai do Tab e do leitor de tela.
3. **Angular Aria (`@angular/aria`) nos widgets:**
   - **Busca:** combobox no campo (`ngCombobox`, `alwaysExpanded`) e listbox com `focusMode="activedescendant"`. As opções ficam agrupadas por tipo (Páginas, Colaboradores, Grupos, Regras de jornada).
   - **Menu do usuário:** `ngMenuTrigger` e `ngMenu`, com o tema em `menuitemradio` e `aria-checked`.
   - **Paleta e "Mais":** ficam no Dialog do CDK, que prende o foco, fecha com Esc e devolve o foco a quem abriu.
4. **A busca é carregada sob demanda** (`import()` ao abrir). Isso tirou cerca de 30 kB do pacote inicial.
5. **O foco vai para o `<main>` quando o caminho da página muda.** Não vai no primeiro carregamento nem quando só a query muda (um filtro, por exemplo). O `<main>` tem `tabindex="-1"` e nunca mostra anel de foco.
6. **O tema fica no serviço `Theme`**, guardado no `localStorage` (`scua-tema`), e vira o `data-theme` do `<html>`. Um script curto no `index.html` aplica o tema antes do app carregar, para a página não abrir no tema errado.
7. **O número de pendentes faz parte do nome do link**, com "pendentes" em texto oculto ("Aprovações 8 pendentes"). Um `aria-label` reprovou no axe: o texto visível tem que estar dentro do nome (WCAG 2.5.3).
8. **O usuário simulado vem da API simulada** (`GET /api/eu`, serviço `CurrentUser` em `core/auth/`), como viria do backend real.

## Alternativas consideradas

- **`BreakpointObserver` do CDK com `@if`, para desenhar uma navegação só:** deixa menos HTML na página, mas o layout passa a depender de JavaScript e a tela pisca no carregamento.
- **Combobox escrito à mão com `aria-activedescendant`:** sem dependência nova, mas com mais código para manter e mais risco de errar o padrão ARIA.
- **CDK Menu (`@angular/cdk/menu`) no menu do usuário:** também serviria. Ficamos com uma biblioteca só para widgets sob medida, como pede o CLAUDE.md.
- **`mat-sidenav` e `mat-toolbar` do Material:** exigiriam overrides para seguir os tokens. O layout é simples e resolve com CSS grid.

## Consequências

- `@angular/aria` entra como dependência, na mesma versão do CDK.
- O combobox do Aria não deixa o Esc chegar ao diálogo, então o próprio campo fecha a paleta.
- Depois que a pessoa usa as setas, o listbox do Aria para de escolher a opção ativa sozinho. A paleta garante uma opção ativa quando a lista muda, por exemplo quando os dados chegam depois do texto digitado. Há um teste e2e com `?simular=lento` para isso.
- Com um diálogo modal aberto, o CDK põe `aria-hidden` no resto da página. Os testes que olham o botão de fora usam `includeHidden`.
- O projeto `celular` do Playwright passou a rodar em 390 px, a largura de referência da equipe.
- Ícones novos no `scripts/icons.mjs`: `today`, `fact_check`, `group`, `schedule`, `bar_chart`, `settings`, `search`, `more_horiz`, `person`, `light_mode`, `dark_mode` e `brightness_auto`.
