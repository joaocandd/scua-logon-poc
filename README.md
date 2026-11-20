# Scua Logon · prova de conceito

Projeto de estudantes para o desafio de modernização do front-end do Scua Logon. **Não é o código da Scua:** é um app novo, com dados fictícios, que mostra a proposta de experiência e de arquitetura da equipe.

## O que é

O Scua Logon bloqueia a estação de trabalho (Windows) fora do horário permitido. Hora extra só acontece depois que o colaborador pede uma extensão e o gestor aprova, e tudo fica registrado.

Esta prova de conceito mostra duas tarefas de ponta a ponta:

- **Fluxo A · Aprovar hora extra** (gestor, celular primeiro): caixa de pedidos com o contexto de cada um, aprovar, recusar com motivo, aprovar em lote e desfazer. O gestor também decide pelo link do e-mail, sem entrar no app.
- **Fluxo B · Configurar regra de jornada** (RH, desktop): editor com linha do tempo, resumo em português, conflitos explicados em texto, simulador "e se?" e prévia do impacto antes de salvar.

E três extras: login acessível, a página pública de aprovação por e-mail com erros humanos e o painel "Hoje".

Não há backend, autenticação real nem integrações (Teams, WhatsApp, login corporativo). Tudo é simulado no navegador.

## Links

| | |
|---|---|
| Protótipo | [LINK DO PROTÓTIPO] |
| PoC publicada | [LINK DA POC PUBLICADA]. Ainda não publicada: estamos confirmando com a Scua se pode ficar num endereço aberto. Até lá, veja [Demo no computador](#demo-no-computador) |
| Storybook (design system) | [LINK DO STORYBOOK PUBLICADO]. No computador: `npm run storybook` |

## Como rodar

Precisa do Node 24 (versão no `.nvmrc`). Na primeira vez, instale as dependências:

```bash
npm ci
```

Depois, um comando sobe o app em http://localhost:4200:

```bash
npm start
```

Para entrar, use qualquer usuário e senha. A senha `erro` simula credencial inválida. Todo login entra como Renata Albuquerque, a aprovadora da demonstração (ADR 0016).

Os dados ficam na memória do navegador: recarregar a página volta ao começo. Sem recarregar, o botão "Restaurar dados de demonstração", em `/configuracoes`, faz o mesmo.

Para os testes de ponta a ponta, instale também o navegador do Playwright, uma vez: `npx playwright install chromium`.

## Demo no computador

Para apresentar, use o build de produção, que é o que seria publicado: mais leve e sem as mensagens do modo de desenvolvimento. Não precisa de internet depois do `npm ci`.

1. Instale as dependências, se ainda não instalou: `npm ci`.
2. Rode:

   ```bash
   npm run demo
   ```

   O comando faz o build de produção (`npm run build`) e serve a pasta `dist/scua-logon-poc/browser` com o `scripts/serve-dist.mjs`, sem pacote extra.
3. Espere a linha `Servindo … em http://localhost:4400` e abra http://localhost:4400 no Chrome. Qualquer endereço do app funciona direto, como http://localhost:4400/aprovacoes?demo=ao-vivo.
4. Para mostrar o celular, use o modo celular do DevTools (Ctrl+Shift+M) com 390 px de largura. Um celular na mesma rede também abre o app em `http://<IP do computador>:4400`, se o firewall deixar.
5. Antes de cada apresentação, em **Configurações**, clique em **Restaurar dados de demonstração**. Recarregar a página também volta os dados ao começo.
6. Para encerrar, Ctrl+C no terminal.

Outra porta: `npm run build` e depois `node scripts/serve-dist.mjs dist/scua-logon-poc/browser 4500`.

O caminho de cliques e o que dizer em cada passo estão em [`docs/roteiro-demo.md`](docs/roteiro-demo.md).

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento em http://localhost:4200 |
| `npm test` | Testes unitários (Vitest), uma execução. `npm run test:watch` fica observando |
| `npm run e2e` | Ponta a ponta e acessibilidade (Playwright e axe) em desktop (1280 px), celular (390 px) e tema escuro. Sobe o servidor sozinho; relatório em `playwright-report/` |
| `npm run lint` | ESLint com regras de acessibilidade de template, tipos do `e2e/` e Prettier. `npm run format` corrige a formatação |
| `npm run build` | Build de produção em `dist/` |
| `npm run demo` | Build de produção servido em http://localhost:4400, para a apresentação (veja [Demo no computador](#demo-no-computador)) |
| `npm run contrast` | Contraste WCAG dos pares de cor do `tokens.css`, nos temas claro e escuro |
| `npm run storybook` | Storybook em http://localhost:6006. `npm run build-storybook` gera em `dist/storybook/` |
| `npm run icons` | Regenera os ícones depois de mudar a lista em `scripts/icons.mjs` |

O CI (`.github/workflows/ci.yml`) roda, em cada push e pull request: a conferência da cópia do `CLAUDE.md`, lint, contraste, testes unitários, build, build do Storybook e ponta a ponta.

## Telas

| Endereço | O que mostra |
|---|---|
| `/entrar` | Login. `/entrar/esqueci-minha-senha` explica a quem pedir uma senha nova |
| `/hoje` | Painel ao vivo: pedidos aguardando, alertas, estações por estado e horas extras do mês |
| `/aprovacoes` | Caixa de aprovações (fluxo A). `/aprovacoes/ped-02` abre o detalhe de um pedido |
| `/aprovacao/:token` | Página pública do link do e-mail, fora do app (tokens abaixo) |
| `/regras` | Regras de jornada (fluxo B). `/regras/nova` cria; `/regras/regra-comercial` edita; `/regras/regra-fechamento` já abre com um conflito entre regras |
| `/configuracoes` | Custo médio da hora extra, usado no painel Hoje, e o botão "Restaurar dados de demonstração" |
| `/pessoas`, `/relatorios` | Fora do escopo: a tela diz o que ficaria ali |

## Como simular estados

Acrescente o parâmetro ao endereço de qualquer tela, por exemplo `/aprovacoes?simular=vazio`:

| Parâmetro | O que acontece |
|---|---|
| `?simular=erro` | Toda chamada falha, como servidor fora do ar. A tela explica e oferece "Tentar de novo" |
| `?simular=lento` | Respostas de 3 a 5 s, para ver o carregando |
| `?simular=vazio` | Listas vazias |
| `?simular=sem-permissao` | A pessoa entra, mas não pode ver os dados |
| `?simular=decidido` | Ao aprovar ou recusar, outro gestor já decidiu o pedido |
| `?demo=ao-vivo` | Chega um pedido novo a cada 30 s na caixa de aprovações, até recarregar a página |

O parâmetro vale para o endereço aberto. Ao navegar pelo menu, ele sai e as chamadas voltam ao normal (ADR 0005).

## Tokens de aprovação de exemplo

A página `/aprovacao/:token` é a que o gestor abre pelo e-mail, sem o menu do app (ADR 0010). Os tokens de exemplo estão em `src/app/mocks/fixtures/approval-tokens.ts`:

| Link | O que mostra |
|---|---|
| `/aprovacao/valido-ped-02` | Pedido de Lucas Bittencourt, que passa de 2 h extras no dia |
| `/aprovacao/valido-ped-04` | Pedido de Mateus Farias, que quebra a interjornada de 11 h |
| `/aprovacao/expirado-ped-22` | "Este link expirou. O pedido de Ana Ribeiro venceu às 18h30." |
| `/aprovacao/usado-ped-13` | "Este pedido já foi aprovado por Bianca às …" (a hora depende de quando o app abre) |
| `/aprovacao/qualquer-outro` | Link inválido |

Também valem `?simular=erro` (o servidor não responde) e `?simular=decidido` (outra pessoa decide antes).

## Estrutura de pastas

```
src/
  app/
    core/            casca do app, login simulado, interceptor da API simulada, página não encontrada
    design-system/   componentes base, cada um com story e teste
    features/
      today/         painel ao vivo                 /hoje
      approvals/     caixa de aprovações (fluxo A)  /aprovacoes  e  /aprovacao/:token
      schedules/     regras de jornada (fluxo B)    /regras  e  /regras/:id
      people/        colaboradores e grupos         /pessoas
      reports/       relatórios                     /relatorios
      settings/      configurações                  /configuracoes
    shared/          modelos, datas e horas, motor de regras (schedule-engine)
    mocks/           banco em memória, fixtures e rotas da API simulada
  styles/            tokens.css: as cores, medidas e fontes da marca
e2e/                 testes de ponta a ponta e acessibilidade
docs/                ADRs, métricas, proposta de arquitetura e tema do Material
scripts/             contraste, ícones e servidor do build para medir
```

Cada feature tem `pages/` (as rotas), `ui/` (só apresentação, sem serviços) e `data/` (serviços e signals). Toda rota é carregada sob demanda.

## Métricas: antes e depois

**Scua atual e PoC**, nas duas páginas que abrem sem entrar no app. Lighthouse mobile, mediana de 3 execuções:

| | Login: Scua atual | Login: PoC | Link do e-mail: Scua atual, sem token | Link do e-mail: PoC |
|---|---|---|---|---|
| Desempenho | [MEDIR] | 97 | [MEDIR] | 94 |
| Acessibilidade | [MEDIR] | 100 | [MEDIR] | 100 |
| LCP | [MEDIR] | 2,34 s | [MEDIR] | 2,69 s |
| Total transferido | [MEDIR] | 169,0 kB | [MEDIR] | 191,8 kB |

A PoC são o `/entrar` e o `/aprovacao/valido-ped-04` depois da auditoria de 03/11/2026. Como foi medido e o que cuidar ao comparar estão em [`docs/metricas.md`](docs/metricas.md).

**Dentro da PoC**, o que as otimizações renderam:

| | Antes | Depois |
|---|---|---|
| Pacote inicial (JS e CSS) | 468,66 kB | 302,37 kB |
| Desempenho do link do e-mail | 90 | 94 |
| Desempenho da caixa de aprovações | 87 | 93 |
| Fonte baixada no login, na caixa de aprovações e no link do e-mail | 74,1 kB | 37,3 kB |

O pacote inicial caiu com a casca e a API simulada sob demanda (29/10) e, na auditoria de 03/11, com a fonte variável (ADR 0015) e sem o tema do Angular Material (ADR 0014). As notas subiram na auditoria, com a fonte variável e o diálogo de recusa sob demanda.

## Qualidade e acessibilidade

A meta é a ABNT NBR 17225:2025, equivalente à WCAG 2.2 AA. O que roda sozinho, no CI:

- axe em todas as rotas e nos estados simulados das telas principais, em desktop e celular, nos temas claro e escuro;
- percurso só com teclado: ordem do foco, anel de foco visível e diálogos que prendem e devolvem o foco;
- largura de 320 px e zoom de 200% sem rolagem para o lado;
- nenhum erro ou aviso no console do navegador, nas mesmas rotas e estados do axe;
- contraste dos pares de cor usados no produto (texto, status, botões em hover e foco), lidos do `tokens.css`, nos dois temas.

O axe não substitui o teste com leitor de tela, que continua manual.

## Documentação

- [`docs/adr/`](docs/adr/README.md): as decisões de arquitetura, com índice.
- [`docs/proposta-arquitetura.md`](docs/proposta-arquitetura.md): rascunho da proposta para a Scua, com o plano de migração.
- [`docs/metricas.md`](docs/metricas.md): medições de desempenho e tamanho, e como repetir.
- [`docs/roteiro-demo.md`](docs/roteiro-demo.md): o roteiro da apresentação, em 18 minutos.
- [`docs/tema-material.md`](docs/tema-material.md): o tema do Angular Material a partir dos tokens, para as telas atuais da Scua.
- [`docs/prompts-claude-code.md`](docs/prompts-claude-code.md): os prompts usados para construir a PoC com o Claude Code.
- [`CLAUDE.md`](CLAUDE.md): o contexto do projeto (regras de negócio, tokens, voz e acessibilidade). A cópia em `.github/copilot-instructions.md` precisa ficar igual; o CI confere.

## Dados

Todos os dados são fictícios: nomes inventados e e-mails no domínio reservado `.example`. Nada da Scua entra neste repositório: nem dados de clientes, nem credenciais, nem documentos internos, nem código.
