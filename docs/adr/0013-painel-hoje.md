# ADR 0013 · Painel "Hoje": estado real das estações, alertas com os dados que existem e custo estimado

- **Status:** aceita
- **Data:** 02/11/2026

## Contexto

O painel `/hoje` é a primeira tela de quem acompanha as estações (RH e gestores). O prompt pede:

- no topo, os pedidos aguardando e alertas como "3 pessoas trabalhando fora da jornada sem aprovação";
- contadores ao vivo e clicáveis por estado, com "Atualizado há X s";
- as horas extras do mês, com o mês anterior e o custo estimado, com o custo médio configurável em `/configuracoes`;
- filtro por grupo;
- gráfico só se ajudar.

Três coisas não existiam:

- **Quem está trabalhando.** A PoC não tem dado de login. E a estação bloqueia fora do horário: sem aprovação, só fica liberada quando a regra está em observação (ADR 0012).
- **Histórico de horas extras.** As fixtures são relativas a "agora" e têm 6 pedidos aprovados, todos na última semana.
- **O custo médio da hora extra.**

Além disso, `/pessoas` fica fora do escopo, então a lista que o contador abre não pode morar lá.

## Decisão

1. **Os contadores mostram o estado real da estação.** A estação de quem está numa regra em observação (`observed`), num estado em que a regra bloquearia, sai desse estado e entra na lista "Liberada sem aprovação". Isso vale para bloqueada, intervalo e fora do expediente. A lista abre pelo alerta. Assim, "Bloqueada" conta só o que está bloqueado de verdade.
2. **Alertas só com o que a API já tem**, do mais urgente para o menos:
   - "N estações liberadas sem aprovação", com a regra em observação e o último dia;
   - "N pedidos vencem na próxima hora";
   - "N colaboradores sem regra de jornada".
   O texto fala de estação liberada, não de pessoa trabalhando: sem dado de login, não dá para saber quem está no computador.
3. **A Noturna fica em observação nas fixtures,** começada há 2 dias. Durante o dia ela está fora da jornada, então o primeiro alerta aparece a qualquer hora da demo. Quatro testes do fluxo B supunham a Noturna ativa e passaram a usar o que querem provar (detalhe no commit).
4. **A lista abre na própria página,** com `?estado=` e `?grupo=` na URL.
   - Os contadores são links com `aria-current`. Mudar só a query não move o foco, e a região de status anuncia "Lista aberta: Em intervalo, 9 estações.".
   - "Fechar lista" devolve o foco ao contador.
   - A lista segue o padrão de `/regras`: tabela no desktop e cartões no celular, com o mesmo HTML (ADR 0011).
5. **Ao vivo como a caixa de aprovações:** estações e pedidos a cada 15 s, com a aba visível. O intervalo e o "Atualizado há X s" foram para `shared/live-updates.ts`. O "Atualizado" usa a mais antiga das duas consultas.
6. **Horas extras do mês:** "Novembro até hoje" ao lado de "Outubro inteiro", sem percentual.
   - Contam os pedidos aprovados pelo mês do dia da jornada (quando a hora extra é feita e entra na folha).
   - Cada pedido conta no máximo 2 h, com a mesma conta do contexto da caixa de aprovações (`overtimeMinutes` em `shared/request-context.ts`).
7. **Custo médio na API simulada** (`GET/PUT /api/configuracoes`), com R$ 45,00 fictício.
   - Fica em memória, como as regras salvas.
   - O painel mostra "Estimativa: horas aprovadas × custo médio de R$ 45,00 por hora. O valor real sai da folha de pagamento.", com o link para mudar.
8. **Sem gráfico.** Os contadores já resumem os estados, e o mês são dois números lado a lado. Um gráfico pediria uma tabela equivalente e não mostraria nada novo.

## Alternativas consideradas

- **Contar a estação em observação no estado que a regra daria, com uma nota.** Mantém a soma igual à da regra, mas "Bloqueada: 21" seria falso para quem olha o painel para saber o que está bloqueado.
- **Criar um dado de sessão (quem está logado) para dizer "pessoas trabalhando".** Seria dado novo sem uso em outra tela. E, com a estação bloqueada, ninguém trabalha nela: o caso real é a observação.
- **Percentual contra o mês anterior, ou contra o mesmo período dele.** O percentual de mês parcial contra mês cheio engana. O mesmo período quase sempre daria zero com as fixtures, que só cobrem a última semana.
- **Custo no `localStorage`.** Sobreviveria ao recarregar, mas é configuração da empresa, não do navegador de quem abriu.
- **Abrir a lista em `/pessoas?estado=`.** `/pessoas` está fora do escopo da PoC.

## Consequências

- O painel depende de oito recursos (estações, pedidos, pessoas, grupos, regras, feriados, exceções e configurações). Se um falhar, a tela inteira mostra o erro com "Tentar de novo".
- Os números mudam com a hora. O e2e fixa o relógio (`page.clock`) numa terça-feira às 18h20, e os testes unitários usam um instante fixo.
- Com a Noturna em observação, `/regras` mostra "Em observação", e Operações não aparece mais como "hoje na regra Noturna" no editor. O prompt 13 (dados da demo) pode rever isso.
- O custo salvo some ao recarregar a página, como as regras. O "Restaurar dados de demonstração" do prompt 13 volta aos R$ 45,00.
- Sem histórico longo, o "Outubro inteiro" pode vir vazio em outro dia do mês. A tela diz "Nenhuma hora extra aprovada em outubro." Mais histórico entra nos dados de demonstração, se a demo precisar.
