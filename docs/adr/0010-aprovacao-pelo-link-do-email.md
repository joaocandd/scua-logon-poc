# ADR 0010 · Aprovação pelo link do e-mail: token nas rotas do fluxo A e resposta mínima

- **Status:** aceita
- **Data:** 02/11/2026

## Contexto

O gestor recebe um e-mail com um link (`/aprovacao/:token`) e decide sem entrar no app. A página precisa do mesmo contexto do fluxo A: alertas de 2 h extras e de interjornada, horas extras recentes, se ainda vai para o RH e a linha do tempo do dia. Ela também precisa aprovar, recusar com motivo e desfazer, e dizer de um jeito humano quando o link é inválido, expirou ou já foi usado.

O link pode ser encaminhado. Quem tem o link vê o que a página mostra, então ela não pode expor mais dados do colaborador do que o necessário para decidir (LGPD).

## Decisão

1. **Uma rota só para abrir o link:** `GET /api/aprovacao/:token`.
   - **404:** link inválido ("Este link não é válido. Confira se ele veio completo do e-mail.").
   - **410:** o pedido venceu sem decisão ("Este link expirou. O pedido de Ana Ribeiro venceu às 18h30.").
   - **409:** o pedido já foi decidido, com a mesma frase da caixa de aprovações ("Este pedido já foi aprovado por Bianca às 9h10."; para quem recebeu o link, "por você").
   - **200:** o pedido, para decidir.
2. **A resposta traz só o necessário para decidir** (`shared/models/approval-link.ts`): o pedido, o nome e o grupo do colaborador, quem recebeu o link e o contexto já calculado na API (alertas, horas dos últimos 30 dias, se vai para o RH e os trechos e frases da linha do tempo). Não vão e-mail, cargo, exceções, feriados nem outros pedidos da pessoa.
3. **O contexto é calculado pelas mesmas funções puras da tela.** O `request-context` e a linha do tempo do pedido foram para `shared/` (`shared/request-context.ts` e `shared/request-timeline.ts`), como o `schedule-engine`. A caixa de aprovações calcula na tela; a API calcula para o link.
4. **Aprovar, recusar e desfazer usam as rotas do fluxo A**, com o token no corpo (`{ step: 'gestor', token }`). Com o token, a decisão é de quem recebeu o link. Um token de outro pedido recebe 403. Não há regra nova: o "já decidido" (409) e o limite para desfazer (`shared/undo-decision.ts`) são os mesmos.
5. **Quem usou o link e volta a ele vê a própria decisão, com "Desfazer"**, enquanto a API permitir (a mesma regra do fluxo A). Depois disso, ou se outra pessoa decidiu, o link vira "já decidido".
6. **"Ver outros pedidos pendentes" leva a `/entrar?voltar=/aprovacoes`.** Depois de entrar, o login devolve a pessoa para `voltar`, mas só se for um caminho interno do app (`safeReturnUrl`, em `core/auth/return-url.ts`). Começa com uma única `/`, sem `\`, espaço ou caractere de controle, e nunca é o próprio `/entrar`. Qualquer outra coisa leva para `/hoje`.
7. **A página fica fora da casca**, como o `/entrar`, com cabeçalho e `<main>` próprios. É celular primeiro, porque o e-mail costuma ser aberto no celular.

## Alternativas consideradas

- **Rotas próprias para decidir pelo link** (`POST /api/aprovacao/:token/aprovar`). Separaria a autorização do link, mas duplicaria a decisão, o "já decidido" e o desfazer.
- **Mandar os dados crus e calcular o contexto na tela**, como a caixa de aprovações faz. Exporia exceções (folgas e motivos), feriados e o histórico de pedidos da pessoa para quem recebesse o link encaminhado.
- **Tratar todo link usado como "já usado"**, sem "Desfazer" ao voltar. É mais simples, mas a regra ficaria diferente da caixa de aprovações.
- **Aceitar qualquer URL em `voltar`.** É um redirecionamento aberto: um link falso do "Scua Logon" levaria a pessoa, depois de entrar, para um site de fora.

## Consequências

- Os tokens de exemplo ficam em `src/app/mocks/fixtures/approval-tokens.ts` e estão listados no README. No produto real, o token seria aleatório, de uso limitado e com validade. A API conferiria também se quem recebeu o link ainda é aprovador do grupo.
- Depois de decidir, a página troca o pedido na hora e busca o link de novo para atualizar a linha do tempo. Durante a espera da API (300 a 800 ms), as frases de bloqueio mostram o estado anterior.
- A página pública não carrega a caixa de aprovações: o `summaryOf` e o `managerDecision` viraram funções puras fora dela, e o `toCardView` aceita só o nome e o grupo do colaborador.
