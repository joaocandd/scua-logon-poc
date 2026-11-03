# ADR 0012 · Editor de regras: aplicação, resumo, simulador, impacto ao salvar e modo observação

- **Status:** aceita
- **Data:** 02/11/2026

## Contexto

A ADR 0011 cobriu a lista, as seções 1 e 2 do editor e os dois tipos de erro. Faltavam:

- os avisos antes do bloqueio, com prévia;
- quem aprova a hora extra;
- a quem a regra se aplica, com o conflito com outra regra ativa;
- o resumo em português sempre visível;
- os feriados e as exceções no período;
- o simulador "e se?";
- salvar com confirmação de impacto e a opção "Observar por 7 dias antes de bloquear";
- a confirmação ao sair com alteração não salva.

O prompt pede que o simulador e a linha do tempo usem o `schedule-engine` e as funções de `shared/`, sem regra nova.

## Decisão

1. **Cada seção é um componente de `ui/` e cada conta é uma função pura em `data/`, com teste.**
   - Avisos: `schedule-warnings.ts`.
   - Aplicação: `schedule-assignment.ts`.
   - Resumo: `schedule-summary.ts`.
   - Período: `schedule-period.ts`.
   - Simulador: `schedule-simulation.ts`.
   - Impacto: `schedule-impact.ts`.
   A página do editor junta tudo com `computed`.
2. **Caixas de seleção que ligam itens de uma lista são feitas à mão.**
   - Os avisos (minutos), os grupos e as pessoas excluídas usam `[checked]` e `(change)`, porque o Signal Forms liga uma caixa a um booleano.
   - Os dias e a meia-noite continuam com `[formField]`.
   - A aprovação vira `approval: 'gestor' | 'gestor-e-rh'` no rascunho, para os rádios terem valor de texto.
3. **Uma pessoa segue uma regra ativa só.**
   - Pôr na regra alguém que já está em outra regra ativa é problema de regra: aparece na hora, dizendo quem e qual, e impede salvar.
   - Regra em observação não bloqueia ninguém e não conta para o conflito.
   - Na lista de grupos, cada grupo mostra em qual regra ativa já está.
4. **O resumo fica sempre à vista.**
   - A partir de 80em: numa coluna presa ao lado das seções.
   - Abaixo disso: depois das seções, mais uma barra presa ao rodapé com a primeira frase ("Ver resumo" abre o resto) e "Salvar regra". O `--toast-offset` e o `scroll-padding-bottom` sobem para o aviso e o foco não ficarem embaixo da barra (WCAG 2.4.11).
   - O resumo não é região viva: mudaria a cada tecla.
   - O intervalo aparece como "no intervalo Almoço", para a frase não depender do gênero do nome.
5. **Feriados e exceções dos próximos 30 dias só informam.**
   - Feriado: só o que cai em dia de jornada da regra.
   - Exceção: só a de quem está na regra.
   - Nenhum dos dois impede salvar.
6. **O simulador é o `evaluateWorkstation`.**
   - Entram a regra do editor (só com os intervalos certos), as exceções, os feriados e as horas extras aprovadas da pessoa.
   - A frase usa o motivo do motor: "Às 18h10 de qui, 12/11, a estação de João estaria bloqueada: fora da jornada Comercial (das 8h às 17h)."
   - Enter na data ou na hora não envia o formulário da regra.
7. **Salvar pede confirmação de impacto (ConfirmDialog).**
   - Mostra o que muda em relação à versão salva ("Horário: das 8h às 17h → das 8h às 18h"), quem entra e quem sai, e quem fica com a estação bloqueada agora mesmo. A última conta usa o motor, com a versão salva antes e a nova depois.
   - Sem mudança, não abre o diálogo: avisa que a regra já está salva assim.
8. **Modo observação.**
   - A opção fica junto do resumo. A API guarda o último dia (`observationEndsOn`, 7 dias contando o de hoje). Salvar de novo não muda o fim; desligar apaga.
   - No dia seguinte ao fim, a regra passa a bloquear, e o histórico registra.
   - Enquanto observa, a API simulada registra no histórico (`bloqueio_observado`) cada vez que a regra bloquearia alguém que está com a estação liberada de verdade (pela regra ativa, ou sem regra), uma vez por passagem de liberada para bloqueada, como faria o agente do Windows.
   - O editor mostra esses registros, e `/api/estacoes` marca a estação de quem está só numa regra em observação (`observed`).
9. **Sair com alteração não salva pede confirmação.**
   - A guarda `confirmLeave` (`core/unsaved-changes.ts`) chama o `canLeave` da página, que abre o ConfirmDialog ("Sair sem salvar?").
   - "Alteração" é a regra como seria salva diferente da última salva (comparação do `toSchedule`), e não o `dirty` do formulário, que não vê as caixas feitas à mão.

## Alternativas consideradas

- **Permitir a mesma pessoa em duas regras ativas, valendo a primeira.** Esconderia o erro: a regra de baixo nunca valeria para ela.
- **Liberar o conflito quando a regra nova está em observação.** Seria o jeito de observar uma regra nova para quem já tem regra. Mas, quando a observação acabasse, a pessoa ficaria em duas regras ativas. Fica para quando houver "trocar de regra" com data.
- **Registrar na observação todo instante em que a regra bloquearia.** Sem saber quem está usando o computador, viraria um registro por pessoa a cada consulta. O registro por passagem é o que um agente reportaria.
- **`beforeunload` para fechar a aba.** É um diálogo nativo do navegador (o CLAUDE.md pede o ConfirmDialog) e atrapalha os testes de ponta a ponta. Fica de fora: fechar a aba com alteração não salva perde a alteração.
- **Resumo como região viva.** O leitor de tela falaria a cada tecla.

## Consequências

- O editor carrega regras, pessoas, grupos, feriados e exceções. Os pedidos de extensão vêm só para o simulador; se falharem, ele simula sem as horas extras.
- A ADR 0011 continua valendo para os erros e os horários. Esta acrescenta a confirmação e a observação.
- O registro da observação depende de alguém chamar a API (a página aberta). No produto real, quem reporta é o agente do Windows.
- `WorkSchedule` ganhou `observationEndsOn`, e `Workstation` ganhou `observed`. O painel "Hoje" vai precisar mostrar a estação em observação como liberada, com o aviso.
