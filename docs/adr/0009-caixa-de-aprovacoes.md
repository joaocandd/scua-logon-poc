# ADR 0009 · Caixa de aprovações: desfazer no servidor, consulta periódica e detalhe na mesma rota

- **Status:** aceita
- **Data:** 01/11/2026

## Contexto

O fluxo A (`/aprovacoes`) é a tela do gestor, muitas vezes no celular. O CLAUDE.md e o prompt 7 pedem:

- aprovar com um toque e recusar com motivo;
- "Desfazer" por 10 s depois da ação;
- aprovar em lote, confirmando quantos e quais;
- pedidos novos chegando a cada 30 s no modo demo, com "Atualizado há X s" e anúncio discreto para leitor de tela;
- o detalhe do pedido como página no celular e painel lateral no desktop;
- os estados de carregando, vazio, erro, sem permissão e "Aprovado por Marina às 18h03".

Também há o contexto para decidir: alerta de mais de 2 h extras no dia e de interjornada de 11 h, que precisam usar a mesma regra do motor (ADR 0006).

## Decisão

1. **A decisão é gravada na hora, e desfazer é uma chamada à API** (`POST /api/pedidos/:id/desfazer`), que volta o pedido para `aguardando_gestor` e registra no histórico.
   - Não dá para desfazer depois que o RH decidiu nem depois que o pedido venceu. A regra está em `shared/undo-decision.ts`, e a API e a tela usam a mesma.
   - O "Desfazer" aparece em toda decisão da usuária atual que a API ainda permite desfazer, inclusive as de visitas anteriores. Quando não dá mais, o cartão diz por quê.
2. **O cartão decidido continua na tela** enquanto a pessoa está na página, mesmo que não combine mais com o filtro. Ele mostra o resultado ("Aprovado às 18h03") e o "Desfazer", e o foco vai para esse botão. O aviso (toast) também tem "Desfazer". Quem usa teclado não precisa atravessar a página até o aviso.
3. **A tela diz qual etapa está decidindo** (`{ step: 'gestor' }`). Se outra pessoa já passou dessa etapa, a API responde 409 com "Este pedido já foi aprovado por Marina às 18h03.", e o cartão mostra quem decidiu.
4. **O contexto é calculado na tela, com funções puras** (`shared/request-context.ts`; a API também usa, ver ADR 0010), a partir dos pedidos, das regras, das exceções e dos feriados. As funções usam a `plannedShift` e os limites do `schedule-engine`. As horas extras recentes são as dos últimos 30 dias até a data do pedido, e não as do mês, para não zerar na virada.
5. **A tela consulta a API de novo a cada 15 s** enquanto está aberta e a aba visível.
   - A consulta não tira a lista da tela: se falhar, a lista continua e o texto avisa.
   - Pedido novo ganha a marca "Novo" e é anunciado numa região `role="status"`. O "Atualizado há X s" fica fora dela, para não virar anúncio a cada segundo.
6. **O modo demo é da API simulada.** `?demo=ao-vivo` liga a chegada de um pedido a cada 30 s, e o modo fica ligado até a página recarregar. Fica desligado por padrão, para não interferir nos testes, e a equipe decide quando começa na apresentação.
7. **Duas simulações novas na URL** (ADR 0005): `?simular=sem-permissao`, em que os dados respondem 403 mas `/api/eu` e o login continuam, e `?simular=decidido`, em que o gestor da área decide antes e a tela recebe o 409.
8. **O detalhe é uma rota filha** (`/aprovacoes/:id`).
   - A troca entre página (celular) e painel (desktop, a partir de 64em) é só de CSS, como na casca (ADR 0007).
   - As ações e o estado de cada cartão ficam no `ApprovalActions`, fornecido pela página, e não pela raiz. A lista e o detalhe mostram o mesmo estado, e ele some quando a pessoa sai da página.
9. **Foco:** ao abrir o detalhe, vai para o nome do pedido; ao fechar, volta ao "Ver detalhes" do cartão. A casca só põe o foco no `<main>` quando a página nova não pôs o foco dentro dele. Um `scroll-padding` com a altura do cabeçalho e da barra inferior impede que o elemento focado fique escondido (WCAG 2.4.11).

## Alternativas consideradas

- **Segurar o envio por 10 s e só então gravar** (como no Gmail). Dispensa o endpoint de desfazer, mas outro gestor não vê a decisão nesses 10 s, o histórico fica incompleto e a decisão se perde se a pessoa fechar a aba.
- **Calcular o contexto no servidor** e mandar junto com o pedido. É o que um backend real provavelmente faria. Aqui, o mesmo código serviria só à API simulada, e os testes de alerta ficariam longe da tela. As funções puras podem ir para o servidor depois sem mudar o resultado.
- **WebSocket ou Server-Sent Events** para os pedidos novos. Seria a escolha em produção, mas a PoC não tem backend, e a consulta periódica se comporta igual na tela.
- **Detalhe como rota irmã, com `BreakpointObserver`** para escolher entre página e painel. Deixa o layout dependente de JavaScript, e a lista teria que ser recriada ao voltar, perdendo a seleção e a rolagem.

## Consequências

- Nenhuma dependência nova.
- O `ConfirmDialog` ganhou `items`, uma lista do que a ação afeta. O `Toast` ganhou `--toast-offset` para subir acima de uma barra fixa no rodapé, e entrou numa região com nome ("Aviso") porque fica fora do `<main>`.
- Os e2e do modo ao vivo usam o relógio falso do Playwright (`page.clock`) para pular 30 s.
- "Expira em..." e "Atualizado há..." usam o relógio do aparelho. Se ele estiver com a hora errada, esses textos também ficam.
- Trocar a consulta periódica por push no produto real muda só o `ExtensionRequests.poll()` e o temporizador da página.
