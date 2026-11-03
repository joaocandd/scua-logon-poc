# ADR 0017 · Angular 22 e migração por etapas, sem reescrita

- **Status:** aceita
- **Data:** 28/10/2026 (commit `27a28b0`, projeto base); registrada em 03/11/2026

## Contexto

O desafio é modernizar o front-end do Scua Logon. As telas atuais usam Angular com o Angular Material (premissa da [proposta de arquitetura](../proposta-arquitetura.md); versões: [CONFIRMAR]). A PoC precisa responder a duas perguntas: em que base as telas novas nascem e como o produto chega lá sem parar.

## Decisão

1. **A PoC usa a versão estável mais recente do Angular, a 22** (`@angular/core` 22.2), com os padrões do `ng new`: componentes standalone, control flow `@if` e `@for`, signals e zoneless. O `app.config.ts` não registra o zone.js: a tela se atualiza quando um signal muda (ADR 0018).
2. **Nenhuma biblioteca de interface fora do Angular.** O design system usa HTML nativo, o CDK e o Angular Aria (ADRs 0004 e 0014). As dependências de produção são o Angular, o `rxjs`, o `tslib` e a fonte (ADR 0015).
3. **Para o produto, a proposta é migrar por etapas, e não reescrever.** São cinco fases: rede de testes, tokens nas telas atuais, uma versão principal do Angular por vez, telas redesenhadas área por área atrás de uma chave de liga e desliga, e remoção do que ficou sem uso (proposta, seção 3).

## Alternativas consideradas

- **Reescrever tudo em Angular 22 e trocar num dia só.** O produto fica parado até a versão nova ficar pronta, o resultado só aparece no fim e o risco chega todo de uma vez.
- **Outro framework (React, Vue).** As telas novas não conviveriam com as atuais no mesmo app, e a equipe da Scua teria de aprender outra base. A migração por etapas deixaria de ser possível.
- **Uma versão anterior do Angular, mais perto da atual da Scua.** Encurtaria a fase 2 da proposta, mas a PoC mostraria um jeito de escrever que já está saindo. O `httpResource`, por exemplo, só é API estável a partir da 22 (`@publicApi 22.0`).

## Consequências

- O Angular lança uma versão principal a cada seis meses e dá suporte a cada uma por 18 meses (6 de suporte ativo e 12 de LTS). Manter a PoC em dia é um `ng update` por versão principal.
- Algumas APIs usadas são recentes: Signal Forms (ADR 0008), Angular Aria (ADR 0007) e o Storybook com Vite (ADR 0003). Elas ficam atrás dos componentes do design system, e uma mudança nelas mexe em poucos arquivos.
- A PoC não diz quanto custa a fase 2: depende da versão das telas atuais. Se elas forem AngularJS (1.x), não há `ng update` e o plano muda (proposta, "Riscos e mitigação"). [CONFIRMAR a versão com a Scua]
