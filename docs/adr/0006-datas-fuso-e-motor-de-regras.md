# ADR 0006 · Datas, fuso e motor de regras sem biblioteca de datas

- **Status:** aceita
- **Data:** 29/10/2026

## Contexto

O CLAUDE.md pede datas e horas sempre no fuso America/Sao_Paulo e jornadas que atravessam a meia-noite (Noturna, 22h–6h). O motor de regras (`shared/schedule-engine.ts`) precisa dizer, para qualquer instante, se a estação está liberada e por quê, aplicando feriados, exceções, hora extra aprovada, o limite de 2 h extras por dia (CLT art. 59) e a interjornada de 11 h (CLT art. 66). O CI roda em UTC; as pessoas da equipe, em São Paulo.

## Decisão

1. **Sem biblioteca de datas.** O `shared/date.ts` converte instante ↔ data e minuto de São Paulo com `Intl.DateTimeFormat` e fuso explícito. Contas de calendário usam só métodos UTC do `Date`, então o resultado não depende do fuso da máquina. Horários do dia continuam no `shared/time.ts` (`toMinutes`, `formatClock`, `formatRange`), que também formata os motivos.
2. **Formatos:** hora do dia como `"HH:mm"`, data como `"AAAA-MM-DD"` e instante em ISO 8601 com fuso.
3. **A jornada pertence ao dia em que começa.** Das 22h de segunda às 6h de terça é a jornada de segunda: o feriado, a exceção e o pedido de extensão dessa jornada são os de segunda. O motor olha o dia avaliado e os dois anteriores.
4. **Precedência:** exceção do colaborador (folga ou horário alternativo), depois feriado, depois os dias da semana da regra. Exceção vale até em feriado (plantão).
5. **Estados:** `em_jornada` e `he_aprovada` liberam; `intervalo` bloqueia durante a pausa; `bloqueada` é dia com jornada mas fora do horário, na interjornada ou além do limite de 2 h; `fora_expediente` é dia sem jornada (fim de semana, feriado, folga).
6. **A hora extra aprovada libera no máximo até 2 h depois do fim**, mesmo que o pedido aprovado peça mais. A estação só libera 11 h depois do fim real (com hora extra) da jornada anterior.

## Alternativas consideradas

- **date-fns e date-fns-tz, ou Luxon.** Resolvem fuso e calendário, mas são dependências a mais para um uso pequeno. O Brasil não tem horário de verão desde 2019, e o `Intl` já traz a tabela de fusos.
- **API `Temporal`.** É o futuro para esse problema, mas ainda não está em todos os navegadores nem no Node 24 sem polyfill.
- **Guardar tudo em UTC e converter só na tela.** Jornada é horário de parede ("8h às 17h"); converter cedo demais complica a regra que atravessa a meia-noite e os feriados.

## Consequências

- O motor é uma função pura e testável, com os casos do CLAUDE.md em `schedule-engine.spec.ts`. A API simulada (`/api/estacoes`), o painel "Hoje" e o simulador "e se?" usam o mesmo motor.
- O registro de início pelo colaborador ("libera quando o colaborador registra o início") não entra no motor: ele diz se a estação pode estar liberada naquele instante.
- O modo observação não muda o resultado do motor; quem chama decide se bloqueia ou só registra.
- Se um dia o produto precisar de outro fuso por filial, a troca fica concentrada no `date.ts`.
