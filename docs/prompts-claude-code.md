# Prompts para o Claude Code · Desafio Scua Logon

Sequência de prompts para construir a prova de conceito com o Claude Code, na ordem do roteiro da equipe. Cada prompt diz quem conduz, em que semana e do que depende. O contexto do projeto (produto, regras, stack, tokens, acessibilidade) fica no `CLAUDE.md`, que o Claude Code lê sozinho em toda conversa. Por isso os prompts são curtos no contexto e detalhados no que esperam.

## Antes do primeiro prompt

1. Confirmem com a organização do desafio que podem usar IA no código. Nada da Scua entra no repositório: nem briefing, nem prints do console, nem credenciais. Só dados fictícios.
2. Criem o repositório **privado** no GitHub, clonem e coloquem o `CLAUDE.md` na raiz e este arquivo em `docs/`. Façam o primeiro commit.
3. Abram o Claude Code na pasta do repositório (terminal ou extensão do VS Code).
4. Primeira mensagem, para conferir que o contexto foi lido:

```
Leia o CLAUDE.md e me diga, em até 6 linhas, o que é o projeto, quais são os dois fluxos da PoC e quais tecnologias não devemos usar. Não crie nenhum arquivo ainda.
```

## Como usar bem

- **Uma conversa nova para cada prompt grande.** O contexto fica limpo e o Claude Code relê o `CLAUDE.md`.
- **Plano antes de código.** Os prompts grandes pedem um plano; leiam, ajustem e só então aprovem.
- **Revisem cada diff.** Não aceitem arquivos que ninguém da equipe entende.
- **Commit no fim de cada prompt,** com tudo verde: lint, testes e build.
- **Quem conduz o prompt explica o código na revisão de sexta.** Usem o prompt "Explicar para a defesa", no fim deste arquivo.
- Se algo sair do padrão do `CLAUDE.md`, corrijam o `CLAUDE.md` também, para não repetir o erro.

## Ordem dos prompts

| # | Prompt | Conduz | Semana | Depende de |
|---|---|---|---|---|
| 1 | Projeto base | Pessoa 3 | S3 | — |
| 2 | Tokens, tema e Storybook | Pessoa 2 + 3 | S4 | 1 |
| 3 | Componentes base | Pessoa 2 | S4 | 2 |
| 4 | Modelo de dados, API simulada e regra de jornada | Pessoa 3 (dados da Pessoa 1) | S4 | 1 |
| 5 | Casca do app | Pessoa 3 | S4 | 3, 4 |
| 6 | Tela de login | Pessoa 2 | S4–S5 | 3 |
| 7 | Fluxo A: aprovações | Pessoa 3 + 2 | S5 | 4, 5 |
| 8 | Aprovação pelo link do e-mail | Pessoa 3 | S5 | 7 |
| 9 | Painel "Hoje" (opcional) | Pessoa 3 | S5–S6 | 5 |
| 10 | Fluxo B: regras de jornada | Pessoa 3 + 2 | S6 | 4, 5 |
| 11 | Auditoria de acessibilidade, textos e desempenho | Pessoa 2 + 3 | S6 | 7, 10 |
| 12 | README, ADRs e proposta de arquitetura | Pessoa 1 + 3 | S6 | 10 |
| 13 | Publicação e preparação da demo | Pessoa 3 | S7 | tudo |

---

## 1 · Projeto base
**Conduz:** Pessoa 3 · **Semana:** S3

```
Leia o CLAUDE.md. Quero criar o projeto base da prova de conceito.

1. Verifique a versão estável mais recente do Angular CLI e a versão de Node que ela exige (tabela de compatibilidade em angular.dev). Se o Node desta máquina não for compatível, pare e me diga como resolver.
2. Crie o projeto Angular nesta pasta (não numa subpasta), nome scua-logon-poc, com SCSS, roteamento e os padrões atuais do ng new.
3. Configure:
   - angular-eslint com as regras de acessibilidade de template ativadas, e Prettier;
   - Vitest para testes unitários (se ainda não for o padrão);
   - Playwright com @axe-core/playwright e um teste que abre a página inicial e falha se houver violação de acessibilidade;
   - Angular Material instalado, sem tema ainda (o tema vem no próximo passo);
   - scripts no package.json: start, test, e2e, lint, build.
4. Crie a estrutura de pastas do CLAUDE.md, com rotas sob demanda vazias para /hoje, /aprovacoes, /regras, /pessoas, /relatorios e /configuracoes, redirecionamento de / para /hoje e uma página 404. URLs sem #. lang="pt-BR" no index.html e título da aba por rota no formato "Aprovações · Scua Logon".
5. Crie um workflow do GitHub Actions que rode lint, testes, build e e2e em cada push e pull request.
6. Copie o CLAUDE.md para .github/copilot-instructions.md, para quem da equipe usa o Copilot.
7. Atualize a seção "Comandos" do CLAUDE.md com os comandos reais.

Mostre o plano antes de executar. No fim, rode lint, testes, build e e2e, corrija o que falhar e faça um commit "chore: projeto base".
```

**Confira:** `npm start` abre o app; os quatro comandos passam; o CI ficou verde no GitHub.

---

## 2 · Tokens, tema e Storybook
**Conduz:** Pessoa 2 com Pessoa 3 · **Semana:** S4 · **Depende de:** 1

```
Implemente os tokens de design e o tema, seguindo a seção "Tokens de design" do CLAUDE.md.

1. Crie src/styles/tokens.css com os tokens primitivos e semânticos, incluindo o tema escuro em @media (prefers-color-scheme: dark) com :root:not([data-theme="light"]) e em :root[data-theme="dark"].
2. Instale @fontsource/montserrat (pesos 400, 500, 600 e 700) e use em --font-sans. Remova a Roboto se o Angular Material a tiver adicionado.
3. Configure o tema do Angular Material 3 com #C2560A como cor primária. Use o schematic de cor de tema do Angular Material, se existir na versão instalada. Depois ajuste o Material para usar nossas variáveis: raio de 8 px em botões e campos, 16 px em cards, tipografia Montserrat, foco com anel de 2 px.
4. Estilos globais: foco visível em todo elemento interativo, prefers-reduced-motion respeitado, corpo de 16 px com entrelinha 1,5, fundo e texto vindos dos tokens.
5. Crie scripts/check-contrast.mjs, que calcula o contraste WCAG dos pares de cor usados (texto e fundo, botão primário, status, links) nos temas claro e escuro e falha se algum par de texto ficar abaixo de 4,5:1. Adicione ao CI.
6. Configure o Storybook para Angular com o addon de acessibilidade e uma página "Fundamentos" com cores, tipografia, espaçamentos e raios.

No resumo final, explique qualquer ajuste de cor que você precisou fazer para passar no contraste.
```

**Confira:** o app troca de tema com o sistema operacional; o Storybook abre a página de fundamentos; o script de contraste roda no CI.

---

## 3 · Componentes base
**Conduz:** Pessoa 2 · **Semana:** S4 · **Depende de:** 2

```
Crie os componentes base em src/app/design-system/, standalone, cada um com story no Storybook (todas as variantes e estados) e testes unitários. Pode usar Angular Material ou CDK por baixo, mas a API pública é nossa. Nenhuma cor ou medida fixa nos componentes: só tokens.

- Button: variantes primary, secondary, ghost e danger; tamanhos md e sm; estado loading (desabilita, mostra spinner e usa aria-busy); ícone opcional. Sempre <button>, ou <a> quando for navegação.
- Field para texto, hora, data e seleção: rótulo visível, texto de ajuda, erro ligado por aria-describedby, obrigatório.
- StatusBadge: recebe um status de pedido ou de estação (lista no CLAUDE.md) e mostra ícone + rótulo em português com as cores de status. "bloqueada" usa a hachura diagonal.
- EmptyState: ícone, título, texto e ação opcional.
- ErrorState: mensagem humana e botão "Tentar de novo"; nunca mostra detalhe técnico.
- ConfirmDialog: serviço que abre um diálogo acessível; foco preso, Esc fecha, foco volta ao botão que abriu.
- Aviso (toast): com ação "Desfazer" opcional e anúncio para leitor de tela.
- PageHeader: título h1, descrição e área de ações.
- WorkdayTimeline: barra de um dia (0h a 24h) com segmentos "liberado" (laranja) e "bloqueado" (hachura), marcador opcional de "agora" e legenda. Recebe os segmentos por input e tem uma descrição acessível dos horários em texto.

No fim, rode lint, testes e o build do Storybook.
```

**Confira:** cada componente aparece no Storybook sem alerta do addon de acessibilidade; dá para usar todos só com teclado.

---

## 4 · Modelo de dados, API simulada e regra de jornada
**Conduz:** Pessoa 3, com os dados fictícios da Pessoa 1 · **Semana:** S4 · **Depende de:** 1

```
Crie o modelo de domínio, a API simulada e o motor de regras. Mostre o plano antes de implementar.

1. Em src/app/shared/models/, tipos para Employee, Group, WorkSchedule (dias da semana, início, fim, intervalos, avisos antes do bloqueio em minutos, validação do RH ligada ou não, modo observação), ScheduleAssignment (grupos e colaboradores excluídos), ScheduleException (colaborador, data, horário alternativo ou folga, motivo), Holiday, ExtensionRequest (colaborador, data, fim atual, fim pedido, motivo, status, criado em, expira em, decisões), ActivityEvent e WorkstationState. Use o glossário do CLAUDE.md.
2. Fixtures em src/app/mocks/ com dados fictícios e realistas em português: 40 colaboradores com nomes brasileiros inventados; 6 grupos (Financeiro, Comercial, Atendimento, Operações, TI, RH); 4 regras (Comercial 8h–17h, Flexível 10h–19h, Tarde 14h–22h, Noturna 22h–6h atravessando a meia-noite); feriados nacionais de 2026; 25 pedidos de extensão cobrindo todos os status, com motivos variados como "Fechamento do mês", "Atendimento a cliente" e "Implantação agendada". Se já existir src/app/mocks/fixtures feitas pela equipe, use essas.
3. Um interceptor HTTP que responde /api/... a partir das fixtures, com latência de 300 a 800 ms, alterações em memória (aprovar, recusar, salvar regra) e simulação ligada por parâmetro de URL: ?simular=erro, ?simular=lento e ?simular=vazio.
4. Serviços de dados em data/ de cada feature, expondo signals e usando httpResource ou resource.
5. Uma função pura em src/app/shared/schedule-engine.ts: recebe regra, exceções, feriados, pedidos aprovados e um instante (fuso America/Sao_Paulo) e devolve o estado da estação e o motivo em português, por exemplo "Bloqueada: fora da jornada Comercial (8h–17h)". Testes unitários para: antes do início, durante, intervalo, depois do fim, extensão aprovada, feriado, exceção, jornada que atravessa a meia-noite, interjornada de 11 h e limite de 2 h extras por dia.
```

**Confira:** os testes do `schedule-engine` cobrem todos os casos da lista; abrir uma rota com `?simular=erro` devolve erro.

---

## 5 · Casca do app
**Conduz:** Pessoa 3 · **Semana:** S4 · **Depende de:** 3 e 4

```
Construa a casca do app em src/app/core/layout/, usando os componentes do design system.

- Desktop (a partir de 1024 px): menu lateral com Hoje, Aprovações (com contador de pendentes vindo da API simulada), Pessoas, Regras de jornada, Relatórios e Configurações; cabeçalho com "Scua Logon", busca e menu do usuário simulado.
- Celular: cabeçalho compacto e navegação inferior com Hoje, Aprovações e Mais (que abre as outras áreas).
- Link "Pular para o conteúdo", landmarks header, nav e main, um h1 por página.
- Busca como paleta de comandos: abre com Ctrl+K ou Cmd+K e por um botão; encontra colaboradores, grupos, regras e páginas; funciona com setas, Enter e Esc; segue o padrão ARIA de combobox com listbox.
- Alternância de tema claro, escuro ou do sistema no menu do usuário, guardada no localStorage.

Testes e2e com axe em 1280 px e 390 px, e um teste que percorre todo o menu só com teclado.
```

**Confira:** abram o app no celular (ou em 390 px no navegador) e naveguem sem mouse no desktop.

---

## 6 · Tela de login
**Conduz:** Pessoa 2 · **Semana:** S4–S5 · **Depende de:** 3

```
Crie a tela /entrar na identidade nova da Scua. A autenticação é simulada: qualquer usuário e senha preenchidos entram; a senha "erro" simula credencial inválida.

- Desktop: painel da marca à esquerda, sem imagem pesada (use a cor e o padrão de linha do tempo com hachura), formulário à direita. Celular: só o formulário.
- <form> com <button type="submit">Entrar</button>; Enter envia.
- Rótulos visíveis, autocomplete="username" e "current-password", botão de mostrar ou ocultar senha com aria-pressed.
- Link "Esqueci minha senha" (página simples) e botão secundário "Entrar com conta corporativa" (simulado).
- Erro de credencial em texto acima do formulário, com role="alert", e foco no primeiro campo com problema.
- Estado de carregando no botão.
- Título da aba "Entrar · Scua Logon" e um h1 (pode ser visualmente oculto).

Rode o Lighthouse (mobile) nesta rota e coloque as notas de desempenho e acessibilidade no resumo. Testes e2e: entrar só com teclado, erro de credencial e axe sem violações.
```

**Confira:** comparem lado a lado com o login atual; esse antes e depois vai para a defesa.

---

## 7 · Fluxo A: aprovações
**Conduz:** Pessoa 3, telas com a Pessoa 2 · **Semana:** S5 · **Depende de:** 4 e 5

```
Implemente o fluxo A em /aprovacoes: o gestor aprova ou recusa pedidos de extensão. Celular primeiro, depois desktop. Use o design system. Mostre o plano antes e faça um commit por etapa.

Lista
- Pendentes primeiro, ordenados pelo que expira antes. Filtros: Aguardando, Decididos hoje, Todos; e por grupo.
- Cada pedido mostra nome e grupo, data, "até 19h30 (+1h30)", motivo, tempo até expirar e o contexto para decidir:
  • horas extras do colaborador no mês;
  • alerta se passa de 2 h extras no dia;
  • alerta se quebra as 11 h de interjornada, dizendo a que horas a estação libera no dia seguinte;
  • se ainda vai para validação do RH.
- Aprovar com um toque. Recusar abre diálogo com motivo obrigatório. Depois da ação, aviso com "Desfazer" por 10 segundos.
- Seleção múltipla com "Aprovar selecionados" e confirmação dizendo quantos e quais.
- Em modo demo, um pedido novo chega a cada 30 segundos; mostre "Atualizado há X s" e anuncie novos pedidos de forma discreta para leitor de tela.

Detalhe do pedido (página no celular, painel lateral no desktop)
- WorkdayTimeline do dia com jornada, intervalo, horário pedido e quando a estação vai bloquear.
- Histórico do pedido.

Estados obrigatórios: carregando (esqueleto), vazio ("Nenhum pedido aguardando. Pedidos de extensão aparecem aqui assim que alguém solicitar."), erro com "Tentar de novo", sem permissão e pedido já decidido por outra pessoa ("Aprovado por Marina às 18h03").

Testes: unitários das regras de alerta; e2e de aprovar, recusar com motivo, desfazer, aprovar em lote e dos estados com ?simular=vazio e ?simular=erro, com axe, em 390 px e 1280 px.
```

**Confira:** cronometrem quanto tempo leva para aprovar um pedido no celular. Esse número vai para o teste "depois" e para a defesa.

---

## 8 · Aprovação pelo link do e-mail
**Conduz:** Pessoa 3 · **Semana:** S5 · **Depende de:** 7

```
Crie a página pública /aprovacao/:token, que o gestor abre pelo link do e-mail, sem o menu do app.

- Token válido: resumo do pedido com o mesmo contexto do fluxo A e os botões Aprovar e Recusar (motivo obrigatório). Depois da decisão, confirmação clara e o link "Ver outros pedidos pendentes".
- Token inválido, expirado ou já usado: mensagem humana para cada caso, por exemplo "Este link expirou. O pedido de Ana Ribeiro venceu às 18h30." ou "Este pedido já foi aprovado por Carlos às 17h52.", sempre com o link para os pendentes. Nunca mostrar detalhe técnico.
- Tokens de exemplo nas fixtures para cada caso, listados no README.

Testes e2e de cada estado, com axe.
```

---

## 9 · Painel "Hoje" (opcional)
**Conduz:** Pessoa 3 · **Semana:** S5–S6 · **Depende de:** 5

```
Implemente o painel /hoje.

- No topo: pedidos aguardando, com atalho para Aprovações, e alertas como "3 pessoas trabalhando fora da jornada sem aprovação".
- Contadores ao vivo e clicáveis: Em jornada, Em intervalo, Hora extra aprovada, Bloqueada e Fora do expediente. Cada número abre a lista filtrada de colaboradores. Mostre "Atualizado há X s".
- Horas extras do mês: total aprovado, comparação com o mês anterior e custo estimado em reais, com o custo médio da hora configurável em /configuracoes e a indicação clara de que é estimativa.
- Filtro por grupo.
- Gráfico só se ajudar; se usar, ofereça uma tabela equivalente acessível.

Estados de carregando, vazio e erro. Teste e2e com axe.
```

---

## 10 · Fluxo B: regras de jornada
**Conduz:** Pessoa 3, telas com a Pessoa 2 · **Semana:** S6 · **Depende de:** 4 e 5

```
Implemente o fluxo B: o RH cria e edita regras de jornada. Desktop primeiro, funcionando no celular. Rotas /regras (lista) e /regras/:id (editor). Mostre o plano antes e faça um commit por seção do editor.

Lista: nome, horário, grupos, número de colaboradores e status (ativa ou em observação).

Editor, em seções:
1. Nome e dias da semana.
2. Horários: início, fim e intervalos (pode haver vários), em campos de hora digitáveis, com a WorkdayTimeline atualizando ao vivo. Se fizer arrastar na linha do tempo, os campos continuam sendo a alternativa.
3. Avisos antes do bloqueio (padrão de 15 e 5 minutos), com prévia do aviso que o colaborador vê.
4. Aprovação: só gestor, ou gestor e validação do RH.
5. A quem se aplica: grupos e colaboradores excluídos, com a prévia "Esta regra vai valer para 37 colaboradores de 3 grupos" e a lista expansível.
6. Resumo em português sempre visível, por exemplo "Seg a sex, das 8h às 17h. Estação bloqueada no almoço (12h–13h). Avisos 15 e 5 min antes. Hora extra precisa do gestor e do RH."

Validações e conflitos, explicados em texto: fim antes do início sem atravessar a meia-noite; intervalo fora da jornada; jornada acima de 6 h sem 1 h de intervalo; colaboradores que já estão em outra regra ativa (diga quem e qual); feriados e exceções no período.

Simulador "e se?": escolher colaborador, data e hora e ver o estado da estação e o motivo, usando o schedule-engine. Exemplo: "Às 18h10 de 12/11, a estação de João estaria bloqueada: fim da jornada Comercial às 17h."

Modo observação: ao salvar, opção "Observar por 7 dias antes de bloquear", que registra quem seria bloqueado sem bloquear.

Salvar com confirmação de impacto. Sair com alteração não salva pede confirmação.

Testes: unitários das validações e do resumo; e2e criando uma regra, provocando um conflito, usando o simulador e salvando, com axe.
```

**Confira:** peçam para alguém de fora da equipe criar uma regra sem ajuda. Onde a pessoa travar é o que precisa melhorar.

---

## 11 · Auditoria de acessibilidade, textos e desempenho
**Conduz:** Pessoa 2 com Pessoa 3 · **Semana:** S6 · **Depende de:** 7 e 10

```
Faça uma auditoria do app inteiro. Corrija os itens 1, 2, 3 e 5; no item 4, só proponha.

1. axe em todas as rotas, nos temas claro e escuro, em 390 px e 1280 px. Liste as violações e corrija.
2. Teste que percorre todas as telas só com teclado: ordem de foco, foco visível, diálogos prendem e devolvem o foco, nada fica inalcançável.
3. Zoom de 200% e largura de 320 px: nada cortado e sem rolagem horizontal da página.
4. Revise todos os textos da interface contra a seção "Voz e textos" do CLAUDE.md e me mostre uma tabela de antes e depois. Não aplique ainda.
5. Lighthouse mobile em /entrar, /hoje e /aprovacoes. Registre as notas em docs/metricas.md e corrija os problemas de desempenho mais baratos (tamanho dos pacotes, fontes, carregamento sob demanda).

No fim, resuma o que foi corrigido e o que ficou pendente.
```

---

## 12 · README, ADRs e proposta de arquitetura
**Conduz:** Pessoa 1 com Pessoa 3 · **Semana:** S6 · **Depende de:** 10

```
Escreva a documentação em português, para a banca e para quem herdar o código. Não invente números: onde faltar dado, deixe um marcador entre colchetes.

1. README.md: o que é, como rodar com um comando, scripts, estrutura de pastas, como simular estados (?simular=...), tokens de aprovação de exemplo, links (protótipo, PoC publicada, Storybook) e métricas de antes e depois a partir de docs/metricas.md.
2. docs/adr/: ADRs curtas (contexto, decisão, alternativas, consequências) para: versão do Angular e migração incremental em vez de reescrita; Angular Material 3 com tokens em vez de PrimeNG ou Tailwind; signals e httpResource como estado; API simulada por interceptor; meta de acessibilidade NBR 17225 / WCAG 2.2 AA; testes com Vitest, Playwright e axe. Baseie-se no código que existe e marque com [CONFIRMAR] o que precisar de decisão da equipe.
3. docs/proposta-arquitetura.md: rascunho da proposta para a Scua, com estrutura de pastas, estratégia de estado, design system e tokens, e um plano de migração em fases: rede de testes; tokens nas telas atuais; atualização de versão uma de cada vez; telas redesenhadas área por área com chave de liga e desliga; remoção de dependências antigas. Inclua riscos e mitigação. Deixe as durações como [ESTIMAR COM A EQUIPE].
```

**Confira:** a Pessoa 1 reescreve a proposta com as palavras da equipe. A banca é de negócio, então cada decisão técnica precisa de uma frase de impacto: custo, risco ou prazo.

---

## 13 · Publicação e preparação da demo
**Conduz:** Pessoa 3 · **Semana:** S7 · **Depende de:** tudo

```
Prepare a demo do Demo Day.

1. Publique a PoC como site estático no serviço mais simples para este repositório (Vercel, Netlify ou GitHub Pages), com todas as rotas caindo no index.html. Escreva o passo a passo no README.
2. Modo demo: botão "Restaurar dados de demonstração" em /configuracoes e dados que garantem os cenários da apresentação: pedido que passa de 2 h, pedido que quebra a interjornada, link de e-mail expirado e regra com conflito.
3. Zero erros e avisos no console em todas as rotas.
4. Escreva docs/roteiro-demo.md com o caminho exato de cliques da demo (fluxo A no celular, fluxo B no desktop, simulador), com uma frase do que dizer em cada passo.
```

---

## Prompts para usar a qualquer momento

**Revisão antes do commit**
```
Revise as mudanças desde o último commit como um revisor experiente em Angular e acessibilidade: bugs, acessibilidade, desvios do CLAUDE.md, estados de tela faltando e testes faltando. Liste por gravidade antes de mudar qualquer coisa.
```

**Explicar para a defesa**
```
Explique em português, para quem vai defender o projeto na banca, como funciona [arquivo ou feature]: o que faz, por que foi feito assim, que alternativas existiam e por que não as escolhemos. No fim, liste 3 perguntas que a banca pode fazer, com respostas curtas.
```

**Corrigir um erro**
```
Este comando falha com o erro abaixo. Descubra a causa antes de mudar código, me explique a causa e só então corrija. Depois rode o comando de novo.

[cole o erro aqui]
```

**Implementar uma tela do Figma** (só se a equipe conectar o Figma ao Claude Code)
```
Implemente o frame [link do Figma] usando os componentes de src/app/design-system/ e os tokens do CLAUDE.md. Se o Figma usar cor, medida ou componente que não existe no design system, pare e me pergunte se criamos um token ou componente novo, em vez de colocar valor fixo.
```

**Atualizar o contexto**
```
Durante esta tarefa decidimos [decisão]. Atualize o CLAUDE.md para refletir isso, em no máximo 3 linhas, na seção certa.
```
