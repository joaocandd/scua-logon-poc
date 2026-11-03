# Proposta de arquitetura do front-end do Scua Logon · rascunho

Rascunho da equipe para a Scua. Ele parte do que a prova de conceito (PoC) construiu e mediu. Os marcadores entre colchetes indicam o que falta:

- **[CONFIRMAR]:** depende de uma decisão da equipe ou de uma informação da Scua.
- **[MEDIR]:** depende de uma medição que ainda não foi feita.
- **[ESTIMAR COM A EQUIPE]:** são as durações.

## Resumo

- **Modernizar por etapas, sem reescrever tudo de uma vez.** As telas atuais continuam funcionando enquanto as novas entram, uma área por vez, cada uma com uma chave para ligar e desligar. *Impacto: o produto não fica parado esperando uma versão nova; cada etapa é entregue, medida e, se precisar, desfeita.*
- **Base técnica atual e enxuta:** Angular 22 (a versão estável de hoje), signals para o estado, um design system com os tokens da marca e poucas dependências. *Impacto: menos bibliotecas para aprender, pagar e atualizar.*
- **Acessibilidade como critério de pronto:** ABNT NBR 17225:2025 (equivalente à WCAG 2.2 AA), conferida por testes automáticos em cada mudança. *Impacto: uma tela que reprova não chega ao cliente.*
- **A PoC prova a base.** No link de aprovação por e-mail, ela tira 94 de desempenho e 100 de acessibilidade no Lighthouse mobile. O Scua atual tira [MEDIR] e [MEDIR] (comparação completa em [`metricas.md`](metricas.md)).

## 1. Ponto de partida

O que a equipe sabe e o que precisa confirmar com a Scua antes de estimar:

| Tema | Situação |
|---|---|
| Versão do Angular das telas atuais | [CONFIRMAR] |
| Versão do Angular Material | As telas atuais usam o Material (premissa da fase 1). Versão: [CONFIRMAR] |
| Outras bibliotecas de interface | [CONFIRMAR] |
| Testes automáticos que já existem | [CONFIRMAR] |
| Desempenho e acessibilidade do login e do link do e-mail | [MEDIR] (`metricas.md`, "Comparação com o Scua atual") |
| Contrato da API e forma de autenticação | [CONFIRMAR] |
| Navegadores e aparelhos que os clientes usam | [CONFIRMAR] |

## 2. Arquitetura proposta

É a arquitetura da PoC, que roda hoje com 502 testes unitários e 187 de ponta a ponta (03/11/2026).

### 2.1 Estrutura de pastas

```
src/app/
  core/            casca do app, autenticação, interceptores, erro global
  design-system/   componentes base, cada um com story e teste
  features/
    approvals/     uma pasta por área de negócio
      pages/       as rotas da área
      ui/          só apresentação: recebe dados e emite eventos, sem serviços
      data/        serviços, signals e as contas da área
    schedules/
    today/
    ...
  shared/          modelos, datas e horas, regras de negócio em funções puras
```

- Cada área se carrega sob demanda: quem abre o login não baixa o editor de regras.
- As URLs são em português e sem `#` (`/aprovacoes`, `/regras/:id`).
- As regras de negócio que valem para todo o produto ficam em `shared/` como funções puras: o motor que diz se a estação está liberada (`schedule-engine`), o limite de 2 h extras, a interjornada de 11 h e o intervalo mínimo.

*Impacto: quem chega acha o código pela área de negócio, e uma área pode ser refeita sem mexer nas outras. É o que torna a fase 3 possível.*

### 2.2 Estado

- **Leitura do servidor com `httpResource`.** O carregando, o erro e o valor já vêm como signals, com `reload()` para "Tentar de novo".
- **Escrita com `HttpClient`.** Depois de aprovar ou recusar, o serviço troca só o pedido que mudou na lista, sem recarregar tudo.
- **Valores derivados com `computed`.** Por exemplo, os pedidos que aguardam o gestor, do que vence antes para o que vence depois.
- **Uma fachada por tela.** Ela junta os recursos e diz em que estado a tela está: carregando, erro, sem permissão ou pronta. A tela só conhece a fachada (exemplo: `ApprovalInbox`).
- **Sem biblioteca de estado por enquanto.** O NgRx SignalStore entra só se uma área crescer muito.
- **Zoneless**, que é o padrão do Angular 22: a tela se atualiza quando um signal muda, sem o zone.js.

```ts
// Simplificado de features/approvals/data/extension-requests.ts
readonly list = httpResource<ExtensionRequest[]>(() => '/api/pedidos', { defaultValue: [] });
readonly pending = computed(() => this.list.value().filter((r) => r.status === 'aguardando_gestor'));
```

*Impacto: um jeito só de lidar com dados em todas as telas, sem `subscribe` espalhado. E a regra da CLT é testada num lugar só, sem Angular.*

### 2.3 Design system e tokens

- **Os tokens são a única fonte de cor, medida e fonte** (`src/styles/tokens.css`). Os primitivos são as cores da marca (#EB6B06, #C2560A, #8F3D06, areia, tinta). Os semânticos dizem o uso (`--color-primary`, `--color-link`, `--status-approved`). Os componentes usam só os semânticos, e o tema escuro troca só eles.
- **As regras de contraste viram teste.** O #C2560A é a cor do botão com texto branco (4,54:1, no limite), mas reprova como texto sobre a areia (4,12:1). Link de texto usa o #8F3D06. O laranja #EB6B06 fica para áreas grandes, ícones e gráficos. O `npm run contrast` confere os pares nos dois temas, e o CI falha se um reprovar.
- **Os componentes base usam HTML nativo, o CDK e o Angular Aria:** Button, Field, StatusBadge, EmptyState, ErrorState, ConfirmDialog, aviso, PageHeader, Skeleton, Icon e WorkdayTimeline. O comportamento difícil de acessibilidade (foco preso no diálogo, anúncio para o leitor de tela, menus e combobox) vem das bibliotecas do Angular, não é escrito à mão (ADRs 0004 e 0007).
- **Storybook** com o addon de acessibilidade, nos dois temas, documenta cada componente.
- **Ícones em SVG, só os usados**, e a Montserrat servida pelo próprio app: um arquivo para todos os pesos, sem Google Fonts (ADR 0015).
- **O app novo não usa o Angular Material** (ADR 0014). Para as telas atuais, que usam, o tema do Material a partir dos mesmos tokens está pronto em [`tema-material.md`](tema-material.md). É a base da fase 1.

*Impacto: mudar uma cor da marca é mudar um arquivo, e um contraste reprovado quebra o build em vez de chegar ao cliente.*

### 2.4 API e dados

- As telas falam com `/api/...` em rotas em português. Os erros chegam como `{ message }`, também em português e prontos para a tela, nunca como código HTTP.
- Na PoC, um interceptor responde a essas rotas a partir de dados fictícios (ADR 0005). Ele documenta o que as telas esperam do servidor. Trocar pela API real é tirar o interceptor.
- Se a API atual da Scua tiver outro formato, a tradução fica nos serviços de `data/` de cada área, sem mexer nas telas. [CONFIRMAR o contrato com o time de backend]

*Impacto: front-end e back-end podem andar em paralelo, cada um com o seu ritmo.*

### 2.5 Acessibilidade e testes

- **Unitários (Vitest):** as regras de negócio, os serviços e os componentes. Na PoC, 502 testes em 54 arquivos.
- **Ponta a ponta (Playwright) com axe:** os fluxos completos, em desktop (1280 px), celular (390 px) e tema escuro, com o axe em todas as rotas e nos estados de erro, vazio, lento e sem permissão. Na PoC, 187 testes, que viram 606 execuções nas quatro configurações.
- **Teclado e reflow:** um teste percorre as telas só com Tab, e outro confere 320 px e zoom de 200% sem rolagem para o lado.
- **Lint** com as regras de acessibilidade de template do angular-eslint.
- **Teste manual com leitor de tela**, em cada área, antes de ligar a chave. O axe não pega tudo, por exemplo uma ordem de leitura confusa ou um texto que não faz sentido. [CONFIRMAR quem faz e com qual leitor de tela]

*Impacto: cada etapa da migração tem uma resposta automática para a pergunta "continua tudo funcionando?".*

## 3. Plano de migração em fases

**Por que não reescrever.** Uma reescrita congela o produto até a versão nova ficar pronta, só mostra resultado no fim e troca tudo de uma vez no dia da virada. Por etapas, cada fase entrega algo que o cliente vê, ou algo que reduz risco, e pode ser desfeita.

| Fase | Entrega | Duração |
|---|---|---|
| 0 · Rede de testes | Os fluxos críticos das telas atuais testados no CI | [ESTIMAR COM A EQUIPE] |
| 1 · Tokens nas telas atuais | A marca nova em todas as telas, sem trocar componentes | [ESTIMAR COM A EQUIPE] |
| 2 · Atualização de versão, uma de cada vez | As telas atuais no Angular 22 | [ESTIMAR COM A EQUIPE] (uma etapa por versão principal) |
| 3 · Telas redesenhadas, área por área | Cada área nova atrás de uma chave de liga e desliga | [ESTIMAR COM A EQUIPE] por área |
| 4 · Remoção das dependências antigas | Telas, chaves e bibliotecas sem uso removidas | [ESTIMAR COM A EQUIPE] |

### Fase 0 · Rede de testes

- Testes de ponta a ponta (Playwright) nos fluxos críticos das telas atuais: entrar, aprovar, recusar com motivo e configurar uma regra. [CONFIRMAR a lista com a Scua]
- Os testes acham os elementos pelo papel e pelo rótulo ("botão Aprovar"), como os da PoC, e não por classe CSS. Assim eles continuam valendo quando o visual muda nas fases 1 e 3.
- O axe roda nas telas atuais como linha de base: as violações de hoje ficam registradas sem travar o CI, e só uma violação nova trava.
- O Lighthouse das telas atuais entra no `metricas.md`, também como linha de base.
- **Pronto quando:** os fluxos críticos rodam em cada pull request e passam na versão atual.
- *Impacto: o cliente não vê nada mudar. É esta fase que torna as próximas baratas de testar e seguras de publicar.*

### Fase 1 · Tokens nas telas atuais

- O `tokens.css` entra como estilo global das telas atuais.
- O tema do Material passa a apontar para os tokens, com o mapeamento de [`tema-material.md`](tema-material.md): `primary` → `--color-primary`, `surface` → `--color-surface`, `outline` → `--color-border-strong`, `error` → `--status-rejected`, e assim por diante. Os componentes continuam os mesmos.
- Dois ajustes do documento são obrigatórios:
  - **O primário exato.** O tema gerado pelo Material usaria #9E4300, e não o laranja da marca.
  - **O hover e o foco que não clareiam o botão.** No padrão do Material, o texto branco sobre #C2560A cai de 4,54:1 para 3,87:1 e reprova.
- O `npm run contrast` ganha os pares do Material listados no documento.
- **Atenção à versão.** O SCSS do `tema-material.md` usa a API de tema do Material 3 (`mat.theme` e `mat.theme-overrides`), das versões recentes. Se as telas atuais estiverem numa versão sem essa API, a tabela de mapeamento continua valendo, mas é aplicada com a API de tema da versão instalada, ou a fase 1 espera parte da fase 2. [CONFIRMAR a versão do Material]
- Tema escuro nas telas atuais: [CONFIRMAR se entra na fase 1 ou depois].
- **Pronto quando:** todas as telas estão com a marca nova, o contraste passa no CI e a rede da fase 0 continua verde.
- *Impacto: o cliente vê a marca nova em todo o produto cedo, sem nenhum componente trocado. É uma mudança visível com pouco risco.*

### Fase 2 · Atualização de versão, uma de cada vez

- Do Angular [CONFIRMAR a versão atual] até o 22, **uma versão principal por vez**, como recomenda o guia oficial de atualização do Angular. Para cada uma: `ng update @angular/core@N @angular/cli@N`, depois `@angular/material@N` e `@angular/cdk@N`. O `ng update` roda as migrações automáticas daquela versão.
- Cada passo é um pull request com a rede da fase 0 verde e uma publicação. Só depois vem o próximo.
- As bibliotecas de terceiros acompanham cada passo. As que não tiverem versão compatível, ou que mudaram de licença (o PrimeNG passou a ter licença comercial na v22), entram na lista da fase 4.
- No fim, as migrações para o jeito atual de escrever Angular, também uma de cada vez: `ng generate @angular/core:standalone`, `@angular/core:control-flow` (`@if` e `@for`), `@angular/core:route-lazy-loading` e `@angular/core:signal-inputs`. O zoneless vem por último, porque muda quando a tela se atualiza e pede o teste de cada área.
- **Pronto quando:** as telas atuais rodam no Angular 22, sem mudança visível para o cliente.
- *Impacto: tira o produto de versões fora do suporte. O Angular dá suporte a cada versão principal por 18 meses (6 de suporte ativo e 12 de LTS). Depois disso, falhas de segurança não são mais corrigidas.*

### Fase 3 · Telas redesenhadas, área por área, com chave de liga e desliga

- **Ordem proposta:**
  1. aprovação pelo link do e-mail, que é isolada (não depende do menu nem das outras telas);
  2. caixa de aprovações (fluxo A);
  3. regras de jornada (fluxo B);
  4. painel Hoje;
  5. pessoas, relatórios e configurações.

  [CONFIRMAR a ordem com a Scua]
- **A chave.** Cada área tem uma chave (por exemplo, `telas-novas.aprovacoes`), lida da configuração quando o app abre. [CONFIRMAR onde ela fica: por cliente, por grupo ou por usuário] O roteador escolhe a tela: duas rotas no mesmo endereço, e a nova só vale quando a chave está ligada. A antiga continua ali como reserva.

  ```ts
  // Esboço. A rota nova só vale com a chave ligada; senão, o roteador segue para a antiga.
  {
    path: 'aprovacoes',
    canMatch: [featureFlag('telas-novas.aprovacoes')],
    loadComponent: () => import('./features/approvals/pages/approvals-page').then((m) => m.ApprovalsPage),
  },
  {
    path: 'aprovacoes',
    loadComponent: () => import('./legacy/approvals/approvals-page').then((m) => m.LegacyApprovalsPage),
  },
  ```

- **Voltar atrás é desligar a chave,** sem publicar de novo.
- **Ligar aos poucos:** primeiro para [CONFIRMAR: a própria Scua ou clientes piloto], depois para todos.
- **Cada área nova segue o padrão da PoC:**
  - os estados de carregando, vazio, erro, sem permissão e sucesso;
  - o axe e o teste de teclado;
  - o Lighthouse antes e depois;
  - uma medida de negócio. [CONFIRMAR qual, por exemplo o tempo para aprovar um pedido]
- As telas antigas e as novas leem a mesma API.
- **Pronto quando:** a chave da área fica ligada para todos por [ESTIMAR COM A EQUIPE] sem precisar ser desligada.
- *Impacto: o risco fica numa área por vez e se desfaz sem publicar de novo. O cliente piloto vê o ganho antes dos outros.*

### Fase 4 · Remoção das dependências antigas

- Quando uma área fica estável com a chave ligada para todos, saem a tela antiga, a rota antiga e a chave.
- Quando nenhuma tela usa mais uma biblioteca, ela sai do `package.json`. A PoC fez isso com o Material (ADR 0014): o `index.html`, com o CSS crítico dentro, caiu de 12,8 kB para 3,6 kB.
- Lista de dependências a remover: [CONFIRMAR com a Scua].
- O tamanho do pacote é medido antes e depois (`metricas.md`).
- **Pronto quando:** não sobra tela antiga nem chave, e o `package.json` tem só o que é usado.
- *Impacto: menos código para manter e atualizar, e menos para o celular baixar.*

## 4. Riscos e mitigação

| Risco | O que pode acontecer | Mitigação |
|---|---|---|
| Versão atual muito antiga | Muitas etapas na fase 2. Se as telas forem AngularJS (1.x), não há `ng update`, e este plano muda | Confirmar a versão antes de estimar. Uma versão por vez, sempre com a rede de testes. Se for AngularJS, avaliar a convivência por rota. [CONFIRMAR] |
| Material sem a API de tema do Material 3 | A fase 1 não aplica o SCSS do `tema-material.md` como está | Aplicar o mesmo mapeamento com a API da versão instalada, ou adiantar parte da fase 2 |
| Testes frágeis | Testes que dependem de classes CSS quebram nas fases 1 e 3 sem que haja um defeito de verdade | Achar os elementos pelo papel e pelo rótulo, como nos testes da PoC |
| Duas versões convivendo | Manutenção dobrada e diferenças entre a tela antiga e a nova | Prazo para cada chave. A tela antiga sai na fase 4 |
| Contrato da API diferente do da PoC | As telas novas não encaixam na API real | Traduzir nos serviços de `data/`, sem mexer nas telas. Validar o contrato na fase 0. [CONFIRMAR com o backend] |
| APIs novas do Angular mudarem | O Signal Forms é recente (ADR 0008), e o Storybook com Vite está em preview (ADR 0003) | Os dois ficam atrás dos componentes do design system. A ADR 0003 descreve a volta para o builder estável |
| Biblioteca de terceiros parada ou com licença nova | Trava a fase 2 | Levantar as bibliotecas na fase 0 e trocar por CDK, Angular Aria ou componente próprio |
| Acessibilidade só automática | O axe não pega a ordem de leitura confusa nem o texto sem sentido | Teste manual com leitor de tela em cada área, antes de ligar a chave |
| Equipe da Scua sem prática com signals e com o design system | O ritmo cai no começo | Storybook, ADRs e pull requests pequenos. [CONFIRMAR o plano de passagem de conhecimento] |
| Tela nova mais pesada no celular | O gestor espera mais para aprovar | Orçamento de tamanho no build (o da PoC avisa acima de 500 kB e falha acima de 1 MB no pacote inicial) e Lighthouse antes e depois em cada área |
| Dados do colaborador em página pública | O link do e-mail encaminhado mostra mais do que deveria (LGPD) | Resposta mínima: só o necessário para decidir (ADR 0010) |

## 5. O que precisamos da Scua

1. A versão do Angular e do Material das telas atuais, e a lista das outras bibliotecas.
2. Os testes automáticos que já existem e os fluxos que a Scua considera críticos.
3. O contrato da API e como o front-end autentica hoje (ADR 0016).
4. Onde ficariam as chaves de liga e desliga: por cliente, por grupo ou por usuário.
5. A ordem das áreas na fase 3 e os clientes piloto.
6. Os navegadores e aparelhos que os clientes usam.
7. Quem libera o acesso às áreas. A PoC diz "peça acesso ao administrador do Scua Logon", porque não sabemos se é o RH.
8. As medições do Scua atual para o `metricas.md`.

## Referências

- [Índice das ADRs](adr/README.md)
- [Tema do Material a partir dos tokens](tema-material.md)
- [Métricas](metricas.md)
- [README](../README.md): como rodar a PoC e simular os estados
