# ADR 0014 · Sem Angular Material no app; o tema fica como referência

- **Status:** aceita
- **Data:** 03/11/2026
- **Substitui:** ADR 0002. Também revoga o item 3 da ADR 0004.

## Contexto

A ADR 0002 ligou o tema do Angular Material 3 aos nossos tokens, e a ADR 0004 deixou o Material para componentes complexos que viessem depois. Esses componentes não vieram: o design system ficou em HTML nativo, CDK e Angular Aria, e nenhuma tela, story ou teste usa um componente do Material.

Mesmo sem uso, o tema custava:

- umas 120 variáveis `--mat-sys-*` no CSS crítico, que o build põe dentro do `index.html` de toda página (cerca de 10 kB antes do gzip);
- um arquivo de paletas gerado (`_theme-colors.scss`) e regras de foco para classes que não existem no app;
- uma dependência a mais para atualizar a cada versão do Angular.

O tema continua útil para a proposta à Scua. Na fase 1 da migração, as telas antigas, que usam o Material, recebem a marca nova sem trocar de componentes.

## Decisão

1. Remover o `@angular/material`, o tema e as paletas do app. O `@angular/cdk` fica: o Dialog, o Overlay e o LiveAnnouncer sustentam o ConfirmDialog, o diálogo de recusa e o aviso.
2. Guardar o tema em `docs/tema-material.md`: o mapeamento dos tokens para os tokens de sistema do Material, o SCSS completo, o comando das paletas e os pares de contraste dos estados dos botões.
3. O `tokens.css` continua a única fonte de cor, no app e no tema de referência.

## Alternativas consideradas

- **Manter o tema sem uso.** Não quebra nada, mas paga o CSS crítico em toda página e dá a impressão de que o app depende do Material.
- **Usar componentes do Material no app** (data em calendário, menu, tabela). Os que precisamos já existem com HTML nativo, CDK e Angular Aria, com a nossa API e os nossos testes de acessibilidade.
- **Apagar o tema sem guardar.** A fase 1 da migração teria que refazer o mapeamento e redescobrir os problemas de contraste do hover e do foco.

## Consequências

- O CSS crítico do `index.html` fica menor, e o `styles.css` também.
- Componente novo segue a ADR 0004: HTML nativo e tokens; comportamento difícil de acessibilidade pelo CDK ou pelo Angular Aria.
- O `npm run contrast` confere só os estados dos nossos botões. Quem aplicar o tema nas telas antigas acrescenta os pares do Material (estão no `docs/tema-material.md`).
- Se uma tela da PoC precisar de um componente do Material no futuro, o tema volta a partir do documento, com uma ADR nova.
