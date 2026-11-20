# Roteiro da demo · 18 minutos

Caminho de cliques da apresentação, com o que dizer em cada passo e quem fala. A **Pessoa 3** opera o computador o tempo todo; quem fala está indicado em cada passo.

| Bloco | Tempo | Quem conduz |
|---|---|---|
| 1. Gancho | 0:00 a 1:30 | Pessoa 1 |
| 2. Antes e depois: login e link do e-mail | 1:30 a 4:00 | Pessoa 2 |
| 3. Fluxo A no celular, ao vivo | 4:00 a 8:00 | Pessoa 2 e Pessoa 3 |
| 4. Link do e-mail | 8:00 a 10:00 | Pessoa 2 |
| 5. Fluxo B: regra de jornada, simulador e modo observação | 10:00 a 14:00 | Pessoa 3 e Pessoa 1 |
| 6. Painel Hoje | 14:00 a 15:30 | Pessoa 1 |
| 7. Relatórios e Estações | 15:30 a 16:30 | Pessoa 3 |
| 8. Números e próximos passos | 16:30 a 18:00 | Pessoa 1 e Pessoa 3 |

## Antes de começar (fora do tempo)

1. No computador da demo: `npm run demo` e espere "Servindo … em http://localhost:4400" (passo a passo no [README](../README.md#demo-no-computador)). Não precisa de internet.
2. Chrome em janela anônima, zoom em 100%, notificações do sistema desligadas.
3. Abra estas abas, nesta ordem, **todas com o relógio de demonstração** (`?relogio=2026-11-24T17:40`, uma terça às 17h40). Cada aba tem os próprios dados e o próprio relógio: recarregar uma aba volta os dados dela ao começo, e o relógio continua de onde estava.
   1. `http://localhost:4400/entrar?relogio=2026-11-24T17:40`
   2. `http://localhost:4400/aprovacao/valido-ped-02?relogio=2026-11-24T17:40` e, na mesma aba, deixe pronto para digitar `/aprovacao/expirado-ped-22` (sem o parâmetro: a aba já guardou o relógio)
   3. `http://localhost:4400/regras?relogio=2026-11-24T17:40`
   4. `http://localhost:4400/hoje?relogio=2026-11-24T17:40`
   5. `http://localhost:4400/relatorios?relogio=2026-11-24T17:40`
   Cada aba mostra no topo a faixa "Relógio de demonstração: terça, 24/11, 17h40 · Desligar". Sem ela, o app usa a hora real, e no sábado da demo quase tudo aparece "Fora do expediente".
4. Na aba do Fluxo A, deixe o DevTools em modo celular (Ctrl+Shift+M), largura 390 px. **Não abra ainda** o `/aprovacoes?demo=ao-vivo`: o primeiro pedido novo chega 30 s depois que a página abre, e a ideia é ele chegar durante a fala.
5. Com o relógio de demonstração, o app abre sempre na terça às 17h40, e o tempo anda dali: o Comercial já saiu, a Flexível e a Tarde estão na jornada, e a Noturna, em observação, deixa as estações de Operações liberadas sem aprovação. Todos os cenários deste roteiro foram conferidos nesse horário (`e2e/demo-clock.spec.ts`). Os horários finos ("expira em…") dependem de quanto tempo a aba está aberta: não decore números da tela.

## 1. Gancho · 0:00 a 1:30

1. **Tela:** a aba `/entrar`, ainda sem clicar.
   **Pessoa 1:** "Às 18h a estação bloqueia. O colaborador precisa de mais meia hora, o gestor está no corredor com o celular. Hoje, essa decisão leva [MEDIR: tempo ou número de passos no Scua atual]. Vamos mostrar como fica em dois toques, com tudo registrado."
2. **Pessoa 1:** "A proposta não é reescrever o Scua Logon. É trocar o front-end por partes, sem parar o produto. O que vocês vão ver é uma prova de conceito com dados fictícios, que roda inteira no navegador."

## 2. Antes e depois: login e link do e-mail · 1:30 a 4:00

1. **Clique:** no `/entrar`, digite qualquer usuário. Na senha, digite `erro` e clique em **Entrar**.
   **Pessoa 2:** "Erro em português, acima do formulário, e o foco volta para a senha. Quem usa leitor de tela ouve a mesma frase."
2. **Clique:** **Mostrar senha**, depois troque a senha por qualquer outra e clique em **Entrar**.
   **Pessoa 2:** "Botão de mostrar senha, rótulos visíveis e alvos de 44 px: dá para entrar só com o teclado ou com o polegar."
3. **Fala, sem clique:** com o painel Hoje aberto depois do login.
   **Pessoa 2:** "No Lighthouse de celular, o login da prova de conceito tira 97 de desempenho e 100 de acessibilidade, com 169 kB transferidos. O login atual tira [MEDIR] e [MEDIR]."
4. **Pessoa 2:** "Na tela atual, inspecionada em 28/10, o navegador carrega ao mesmo tempo o Angular Material, o Bootstrap 4, o jQuery, o Font Awesome 5 e o Material Icons. Aqui é um design system só, com a marca da Scua, e uma fonte variável de 38 kB para todos os pesos."

## 3. Fluxo A no celular, ao vivo · 4:00 a 8:00

Para caber em 4 minutos, o Desfazer aparece só uma vez, no lote (passo 8).

1. **Clique:** na aba do Fluxo A, em modo celular, abra `http://localhost:4400/aprovacoes?demo=ao-vivo` (a aba já guardou o relógio de demonstração).
   **Pessoa 2:** "Esta é a caixa do gestor no celular. Cada pedido já traz o contexto para decidir: até que horas, quanto passa e o que acontece se aprovar."
2. **Tela:** o cartão de **Lucas Bittencourt**.
   **Pessoa 2:** "O Lucas pede 2h30. O cartão avisa que passa do limite de 2 h extras da CLT, que a estação libera só até 19h e que depois vai para o RH. O gestor não precisa fazer conta."
3. **Tela:** o cartão de **Mateus Farias**.
   **Pessoa 2:** "O Mateus sairia às 23h30 e quebraria as 11 h de descanso entre jornadas. O sistema diz em português: no dia seguinte, a estação só libera às 10h30."
4. **Clique:** **Aprovar** no cartão de **Jéssica Moura**.
   **Pessoa 3:** "Um toque aprova. O cartão mostra o resultado na hora e o foco vai para Desfazer."
5. **Tela:** o cartão novo que chega (marcado **Novo**), uns 30 s depois de abrir a página.
   **Pessoa 3:** "Enquanto falávamos, chegou um pedido novo. A lista se atualiza sozinha e o leitor de tela anuncia com discrição, sem roubar o foco."
6. **Clique:** **Recusar** no cartão de **Lucas Bittencourt**; digite um motivo curto e clique em **Recusar pedido**.
   **Pessoa 2:** "Recusar pede o motivo, porque o colaborador precisa saber o porquê. O motivo fica no histórico."
7. **Clique:** marque as caixas de dois pedidos (por exemplo **Mateus Farias** e **Vinícius Amaral**) e toque em **Aprovar selecionados**.
   **Pessoa 2:** "Aprovar em lote mostra quais pedidos e repete os alertas antes de confirmar. Lote não esconde o risco."
8. **Clique:** **Aprovar 2 pedidos**; depois, **Desfazer** no aviso do rodapé.
   **Pessoa 3:** "Errou? Toda decisão desfaz ali mesmo, sem diálogo de 'tem certeza?' antes de cada aprovação. Aqui, o lote inteiro."

## 4. Link do e-mail · 8:00 a 10:00

1. **Clique:** aba `/aprovacao/valido-ped-02`. Se quiser, também em modo celular.
   **Pessoa 2:** "O gestor nem sempre abre o app. Pelo link do e-mail, sem login e sem menu, ele vê o mesmo contexto: o Lucas passa de 2 h, a linha do tempo mostra até onde a estação libera."
2. **Clique:** **Aprovar**.
   **Pessoa 2:** "Aprovado. A frase diz o que acontece agora: vai para a validação do RH. E dá para desfazer daqui também."
3. **Clique:** troque o endereço para `/aprovacao/expirado-ped-22` e tecle Enter.
   **Pessoa 2:** "Link vencido não mostra código de erro. Diz o que aconteceu, de quem era o pedido, a que horas venceu e o que fazer."
4. **Pessoa 2:** "Esta página tira 94 de desempenho e 100 de acessibilidade no Lighthouse de celular. A página atual do link tira [MEDIR] e [MEDIR]."

## 5. Fluxo B: regra de jornada, simulador e modo observação · 10:00 a 14:00

Fecha o modo celular: o RH trabalha no desktop. Para caber em 4 minutos, o salvar com conflito (antigo passo 3) sai: o conflito já aparece na tela ao abrir a regra.

1. **Clique:** aba `/regras`.
   **Pessoa 3:** "Agora o RH. Cada regra mostra horário, dias, grupos, quantas pessoas e o status, sem abrir nada."
2. **Clique:** **Fechamento do mês**.
   **Pessoa 3:** "O RH começou uma regra para o Financeiro, que já está na Comercial. O conflito aparece na hora, com nomes: Aline, Diego, Gustavo e mais 3 já estão na Comercial."
3. **Clique:** volte para **Regras de jornada** e abra **Comercial**. Altere o **Fim da jornada** para `18:00`.
   **Pessoa 3:** "A linha do tempo e o resumo em português mudam enquanto digito. Laranja é liberado; a hachura é bloqueado, o mesmo padrão do site da Scua."
4. **Clique:** no **Simulador "e se?"**, escolha **João Pedro Antunes**, a data `10/03/2027` (uma quarta-feira sem feriado nem exceção) e a hora `18:10`.
   **Pessoa 1:** "E se o João estiver trabalhando às 18h10? O simulador responde antes de salvar: com a regra nova, a estação estaria liberada. É a pergunta que o RH faz ao suporte hoje."
5. **Clique:** **Salvar regra**.
   **Pessoa 1:** "Antes de salvar, o diálogo diz o impacto: quantas pessoas, o que muda e quem seria afetado agora mesmo."
6. **Clique:** **Continuar editando**. Marque **Observar por 7 dias antes de bloquear** e clique em **Salvar regra** de novo.
   **Pessoa 1:** "E se o RH não tiver certeza? O modo observação deixa a regra valer sem bloquear ninguém por 7 dias. O Scua Logon só registra quem seria bloqueado."
7. **Clique:** **Continuar editando**, clique em **Regras de jornada**, depois em **Sair sem salvar**, e abra **Noturna**.
   **Pessoa 1:** "A Noturna já está em observação. Em **Quem seria bloqueado**, está a lista de quem a regra teria bloqueado e quando. Com isso, o RH liga a regra com segurança, e não no susto."

## 6. Painel Hoje · 14:00 a 15:30

1. **Clique:** aba `/hoje`.
   **Pessoa 1:** "Para o administrador, o dia em uma tela: pedidos aguardando, o próximo que vence, e os alertas."
2. **Tela:** o alerta de estações liberadas sem aprovação.
   **Pessoa 1:** "Este alerta vem da Noturna em observação: estas estações estariam bloqueadas agora. Vira informação para decidir, não surpresa."
3. **Clique:** **Ver estações**; depois **Fechar lista**.
   **Pessoa 1:** "Cada número abre a lista de pessoas e o motivo, em português."
4. **Tela:** os dois gráficos abaixo dos contadores e as horas extras do mês.
   **Pessoa 1:** "Pedidos de hoje por status e horas extras da semana, cada um com o link para o relatório. Embaixo, o mês contra o mês passado, com o custo estimado: é estimativa, o real sai da folha."

## 7. Relatórios e Estações · 15:30 a 16:30

1. **Clique:** aba `/relatorios`.
   **Pessoa 3:** "Tempo de Bloqueio, Gráfico de Ausência e os relatórios de hora extra do sistema atual viram uma tela só, com período e grupo na URL e CSV em cada bloco. Os números são fictícios."
2. **Clique:** escolha o período **Últimos 7 dias**; depois, com o teclado, Tab até um gráfico e setas para os lados.
   **Pessoa 3:** "Cada gráfico anda pelo teclado, mostra o valor no foco e abre como tabela para quem usa leitor de tela."
3. **Clique:** **Estações** no menu; em **Estado**, escolha **Liberada sem aprovação**.
   **Pessoa 3:** "Cada estação com o estado de agora, pelo mesmo motor de regras, e a última atividade. A auditoria fica em Relatórios › Auditoria, e os registros não podem ser editados."

## 8. Números e próximos passos · 16:30 a 18:00

1. **Pessoa 3:** "Na prova de conceito, o pacote inicial caiu de 468 kB para 302 kB. O link do e-mail subiu de 90 para 94 de desempenho, e a caixa de aprovações de 87 para 93."
2. **Pessoa 3:** "Acessibilidade: o axe roda em todas as telas, no celular e no desktop, nos temas claro e escuro, a cada mudança de código. Há também testes só com teclado, em 320 px e com zoom de 200%."
3. **Pessoa 1:** "A migração tem cinco fases: rede de testes, tokens da marca nas telas atuais, atualização do Angular 15 versão a versão, telas novas área por área com chave de liga e desliga, e remoção do que sobrar. Os prazos estimamos com a equipe da Scua: [ESTIMAR COM A EQUIPE]."
4. **Pessoa 1:** "Para fechar: o gestor decide em dois toques, o RH testa a regra antes de bloquear alguém, e a Scua troca o front-end sem parar o produto. Obrigado."

## Se algo der errado

- **Os dados ficaram bagunçados:** em **Configurações**, clique em **Restaurar dados de demonstração** e confirme. Ou recarregue a aba: os dados voltam ao começo.
- **O pedido novo não chegou no Fluxo A:** confira se o endereço tem `?demo=ao-vivo`. Recarregar a página reinicia a contagem de 30 s.
- **Um cartão já foi decidido em outra aba:** cada aba tem os próprios dados, então isso não acontece entre abas. Se acontecer na mesma aba, use **Desfazer** ou restaure os dados.
- **O servidor caiu:** no terminal, `npm run demo` de novo. Não precisa de internet.
- **A faixa do relógio sumiu ou a tela mostra "Fora do expediente":** a aba está sem o relógio de demonstração. Abra o mesmo endereço com `?relogio=2026-11-24T17:40` no fim.
