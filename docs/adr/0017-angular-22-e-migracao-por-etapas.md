# ADR 0017 · Angular 22 e migração por etapas, sem reescrita

- **Status:** aceita
- **Data:** 28/10/2026 (commit `27a28b0`, projeto base); registrada em 03/11/2026

## Contexto

O desafio é modernizar o front-end do Scua Logon. As telas atuais estão no **Angular 15.2.10**, com o Angular Material, o Bootstrap 4 e o jQuery, rotas com hash (`/#/`) e cerca de 24 módulos carregados sob demanda. Fonte: inspeção da equipe no navegador, no ambiente de demonstração do Scua atual, em 28/10/2026 (atributo `ng-version` e classes `mat-`; o endereço não foi guardado). A versão exata do Material não aparece no navegador: [CONFIRMAR] (ver a seção 1 da [proposta de arquitetura](../proposta-arquitetura.md)). A PoC precisa responder a duas perguntas: em que base as telas novas nascem e como o produto chega lá sem parar.

## Decisão

1. **A PoC usa a versão estável mais recente do Angular, a 22** (`@angular/core` 22.2), com os padrões do `ng new`: componentes standalone, control flow `@if` e `@for`, signals e zoneless. O `app.config.ts` não registra o zone.js: a tela se atualiza quando um signal muda (ADR 0018).
2. **Nenhuma biblioteca de interface fora do Angular.** O design system usa HTML nativo, o CDK e o Angular Aria (ADRs 0004 e 0014). As dependências de produção são o Angular, o `rxjs`, o `tslib` e a fonte (ADR 0015).
3. **Para o produto, a proposta é migrar por etapas, e não reescrever.** São cinco fases: rede de testes, tokens nas telas atuais, uma versão principal do Angular por vez, telas redesenhadas área por área atrás de uma chave de liga e desliga, e remoção do que ficou sem uso (proposta, seção 3).

## Alternativas consideradas

- **Reescrever tudo em Angular 22 e trocar num dia só.** O produto fica parado até a versão nova ficar pronta, o resultado só aparece no fim e o risco chega todo de uma vez.
- **Outro framework (React, Vue).** As telas novas não conviveriam com as atuais no mesmo app, e a equipe da Scua teria de aprender outra base. A migração por etapas deixaria de ser possível.
- **Uma versão anterior do Angular, mais perto da 15 da Scua.** Encurtaria a fase 2 da proposta, mas a PoC mostraria um jeito de escrever que já está saindo. O `httpResource`, por exemplo, só é API estável a partir da 22 (`@publicApi 22.0`).

## Consequências

- O Angular lança uma versão principal a cada seis meses e dá suporte a cada uma por 18 meses (6 de suporte ativo e 12 de LTS). Manter a PoC em dia é um `ng update` por versão principal.
- Algumas APIs usadas são recentes: Signal Forms (ADR 0008), Angular Aria (ADR 0007) e o Storybook com Vite (ADR 0003). Elas ficam atrás dos componentes do design system, e uma mudança nelas mexe em poucos arquivos.
- A fase 2 tem sete etapas, da 15 até a 22. Como as telas atuais são Angular moderno, e não AngularJS (1.x), o `ng update` e as migrações automáticas valem para cada etapa (inspeção de 28/10). A duração de cada etapa continua [ESTIMAR COM A EQUIPE].
- A 15 está fora de suporte desde maio de 2024. *Impacto: até a fase 2 terminar, falhas de segurança do Angular não são corrigidas nas telas atuais.*
