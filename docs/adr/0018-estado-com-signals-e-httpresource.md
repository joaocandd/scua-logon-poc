# ADR 0018 · Estado com signals e `httpResource`, sem biblioteca de estado

- **Status:** aceita
- **Data:** 29/10/2026 (commit `bd65b21`, primeiro `httpResource`; a regra está no `CLAUDE.md` desde `d496a2d`); registrada em 03/11/2026

## Contexto

As telas leem dados do servidor (pedidos, regras, estações, configurações) e gravam decisões (aprovar, recusar, salvar regra). Cada tela tem os estados carregando, vazio, erro, sem permissão e sucesso (`CLAUDE.md`). O Angular 22 já traz o que isso pede: signals, `computed` e o `httpResource`, que entrega o valor, o carregando e o erro como signals.

## Decisão

1. **Leitura com `httpResource`**, nos serviços de `data/` de cada feature (por exemplo, `extension-requests.ts`, `work-schedules.ts` e `workstations.ts`). O recurso dá `value()`, `isLoading()` e `error()`, e o "Tentar de novo" chama `reload()`.
2. **Escrita com `HttpClient`.** Depois de aprovar, recusar ou desfazer, o serviço troca na lista só o pedido que voltou do servidor, sem recarregar tudo.
3. **Valores derivados com `computed`**, como os pedidos que aguardam o gestor.
4. **Uma fachada por tela** junta os recursos e diz em que estado a tela está: `'loading' | 'error' | 'forbidden' | 'ready'` (`ApprovalInbox`, `TodayPanel`). A tela só conhece a fachada.
5. **As contas ficam em funções puras**, fora dos serviços: o motor de regras em `shared/` (ADR 0006) e as contas de cada área em `data/` (por exemplo, `attention.ts` e `monthly-overtime.ts` no painel Hoje).
6. **Sem biblioteca de estado.** O NgRx SignalStore entra só se uma feature crescer muito (`CLAUDE.md`).
7. **RxJS só onde o Angular entrega um Observable:** os eventos do roteador e o fechamento dos diálogos do CDK.

## Alternativas consideradas

- **NgRx Store, com ações, reducers e effects.** Dá um registro de cada mudança, mas pede muito código para o pouco estado da PoC, e mais um conceito para a equipe dominar na defesa.
- **NgRx SignalStore desde o começo.** Usa os mesmos signals, mas é mais uma dependência para um problema que ainda não existe. Fica como o próximo passo de uma área que crescer.
- **Serviços com `BehaviorSubject` e `subscribe`.** É o jeito antigo. O carregando e o erro seriam escritos à mão em cada serviço, e cada inscrição precisaria ser cancelada.

## Consequências

- Um jeito só de lidar com dados em todas as telas. Quem lê um serviço sabe onde está o carregando, o erro e o valor.
- No zoneless, um valor guardado fora de um signal não atualiza a tela. Todo estado que aparece na tela é signal.
- As regras da CLT e as contas das telas são testadas sem Angular (ADR 0020).
- Trocar a API simulada pela real não muda as telas nem as fachadas (ADR 0005).
