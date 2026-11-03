# ADR 0011 · Editor de regras de jornada: rascunho, dois tipos de erro e intervalo mínimo

- **Status:** aceita
- **Data:** 02/11/2026

## Contexto

O fluxo B (`/regras` e `/regras/:id`) é a tela do RH, no desktop primeiro. O editor tem seções (nome e dias, horários, avisos, aprovação, a quem se aplica), um resumo em português, um simulador "e se?" e a confirmação de impacto ao salvar. Esta ADR cobre o que entrou primeiro: a lista, as seções 1 e 2 e o salvar. O resto do editor (aplicação, resumo, simulador, impacto ao salvar e modo observação) está na ADR 0012.

O editor tem duas tensões:

- **Quando mostrar o erro.** A ADR 0008 diz que os erros de campo só aparecem depois da primeira tentativa de envio, para quem passa pelos campos com Tab não ver "campo obrigatório" antes de digitar. Mas o editor existe para a pessoa ver a consequência do que digita: um almoço fora da jornada precisa aparecer na hora, junto da linha do tempo.
- **Jornada que atravessa a meia-noite.** No `WorkSchedule`, o fim antes do início quer dizer "termina no dia seguinte" (22h–6h). No formulário, o mesmo valor pode ser só um erro de digitação (8h–7h, quando era 17h).

## Decisão

1. **O formulário trabalha com um rascunho** (`schedule-draft.ts`), e não com o `WorkSchedule`.
   - `days`: uma caixa por dia, na posição do `Weekday`. Assim cada caixa tem o seu `[formField]`.
   - `overnight`: a caixa "Atravessa a meia-noite". Ao abrir uma regra salva, ela vem marcada quando o fim não vem depois do início.
   - O `WorkSchedule` e a API não mudam: `toDraft` e `toSchedule` fazem a ida e a volta.
2. **Dois tipos de erro, os dois impedem salvar:**
   - **De campo:** obrigatório, nome repetido (sem diferenciar acento e maiúscula), nenhum dia e horário pela metade. Seguem a ADR 0008: aparecem no próprio campo depois do primeiro "Salvar regra".
   - **De regra:** fim antes do início sem marcar a meia-noite (ou marcada sem atravessar), intervalo fora da jornada, intervalo que termina antes de começar, intervalos sobrepostos e intervalo insuficiente. Aparecem na hora, abaixo da linha do tempo, numa região viva educada. Cada problema só aparece quando os dois horários do item estão preenchidos.
   - Na tentativa de salvar, o foco vai para o primeiro campo com problema, de qualquer tipo, na ordem da tela. Na jornada longa sem nenhum intervalo, vai para "Adicionar intervalo".
3. **As validações são funções puras** (`schedule-validation.ts`), com testes unitários. O esquema do Signal Forms (`schedule-form.ts`) só as liga aos campos: `validate` para os de campo e `validateTree` para os de regra, que dizem em qual campo o problema fica. A tela e o formulário chamam a mesma função.
4. **Os horários seguem o `schedule-engine`.** A jornada pertence ao dia em que começa, e todo horário que não vem depois do início é do dia seguinte (`afterStart`). Um intervalo que começa junto com a jornada fica fora dela, como o motor o trataria.
5. **Intervalo mínimo (CLT art. 71):**
   - acima de 6 h de trabalho, um intervalo de pelo menos 1 h;
   - acima de 4 h e até 6 h, um de pelo menos 15 min (§1º);
   - o trabalho é a jornada menos os intervalos certos;
   - é um intervalo só: duas pausas de 30 min não fazem 1 h.
   Acordo ou convenção coletiva pode reduzir o intervalo de 1 h para 30 min em jornadas acima de 6 h (art. 611-A, III). Isso fica como configuração futura da regra. Hoje, quem tiver esse acordo vê o problema e não consegue salvar uma jornada com 30 min de almoço.
6. **A linha do tempo desenha só o que está certo.** O intervalo com problema não entra na barra. Sem início e fim certos, a barra dá lugar a um texto neutro. Embaixo dela, a duração: "9h de jornada, 1h de intervalo, 8h de trabalho".
7. **Sem arrastar na linha do tempo.** Os campos de hora são a única entrada. A barra continua só visual (ADR 0004), e não há gesto de arrastar que precise de alternativa (WCAG 2.5.7).
8. **A lista é uma tabela no desktop e cartões no celular, com o mesmo HTML.** Abaixo de 48em, cada linha vira um cartão só com CSS, e o leitor de tela continua lendo uma tabela (conferido no Chromium pelo e2e, que acha as linhas pelo papel `row`).

## Alternativas consideradas

- **Todos os erros só depois de salvar (ADR 0008 ao pé da letra).** É mais simples, mas a pessoa só descobriria que o almoço ficou fora da jornada ao tentar salvar, enquanto a linha do tempo já mostrava outra coisa.
- **Todos os erros na hora.** Mostraria "Dê um nome para a regra" a quem acabou de abrir "Nova regra".
- **Deduzir a meia-noite do fim antes do início, sem a caixa.** O 8h–7h digitado por engano viraria uma jornada de 23 h, sem aviso.
- **Somar os intervalos para o mínimo da CLT.** A lei fala em um intervalo de repouso e alimentação. Somar aceitaria jornadas que a fiscalização não aceitaria.
- **Arrastar as pontas da jornada na barra.** É bonito na demo, mas pede alternativa por teclado, alvos de 24 px em trechos curtos e mais código para a equipe defender.

## Consequências

- O que a tela mostra e o que impede salvar saem da mesma função, testada sem Angular.
- Problemas de regra aparecem enquanto a pessoa digita e são anunciados pelo leitor de tela. Um horário digitado aos poucos pode gerar mais de um anúncio.
- O rascunho tem campos que o `WorkSchedule` não tem. Quem mexer no modelo precisa atualizar `toDraft` e `toSchedule`, e o teste de ida e volta com as regras de demonstração acusa se faltar algo.
- O redutor de intervalo por acordo coletivo ainda não existe. Quando existir, entra como opção da regra e muda só `REST_BREAK_RULES`.
