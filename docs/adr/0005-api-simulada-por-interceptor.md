# ADR 0005 · API simulada por interceptor HTTP

- **Status:** aceita
- **Data:** 29/10/2026

## Contexto

A prova de conceito não tem backend (fora do escopo no CLAUDE.md), mas as telas precisam se comportar como no produto: carregar com espera de rede, falhar, voltar vazias e gravar decisões (aprovar, recusar, salvar regra). Os serviços das features devem usar `httpResource` e `HttpClient`, como fariam com uma API de verdade, para que trocar a simulação pelo servidor real não mude as telas.

## Decisão

1. **Um interceptor funcional** (`core/mock-api/mock-api.interceptor.ts`) responde a toda chamada que começa com `/api/`. O resto segue para a rede.
2. **Banco em memória** (`mocks/db.ts`, serviço `MockDb`) começa com as fixtures de `mocks/fixtures/` e guarda as alterações até a página recarregar. `reset()` volta aos dados de demonstração.
3. **Rotas em português** (`mocks/handlers.ts`), como os status da API: `/api/pedidos`, `/api/regras`, `/api/colaboradores`, `/api/grupos`, `/api/feriados`, `/api/excecoes`, `/api/historico`, `/api/estacoes` e `/api/eu` (o usuário simulado, ADR 0007). Cada rota é uma função que recebe o banco e devolve status e corpo; os testes chamam as rotas sem Angular.
4. **Erros como `{ message }` em português**, prontos para a tela: "Este pedido já foi aprovado por Bianca às 9h10." Nunca código HTTP ou JSON para o usuário.
5. **Espera de 300 a 800 ms** em toda resposta, e simulação pela URL da página: `?simular=erro` (toda chamada falha), `?simular=lento` (3 a 5 s) e `?simular=vazio` (listas vazias).
6. **Datas das fixtures relativas a "agora"**: pedidos em aberto sempre caem na próxima jornada da pessoa. A demo e o CI têm pedidos para aprovar em qualquer dia e hora.

## Alternativas consideradas

- **Mock Service Worker (MSW).** Intercepta na rede, então o DevTools mostra as chamadas. Exige uma dependência e um service worker registrado no app, nos testes e no Storybook. O interceptor resolve o mesmo sem nada novo.
- **`json-server` ou um backend Node pequeno.** Mais próximo do real, mas é um processo a mais para rodar, publicar e manter, e a PoC é publicada como site estático (ADR 0001).
- **Dados fixos dentro dos serviços, sem HTTP.** Mais simples, mas as telas não passariam pelos estados de carregando e erro, e a troca pelo backend real mudaria os serviços.

## Consequências

- Trocar pelo backend real é tirar o interceptor do `app.config.ts`; serviços e telas continuam iguais, desde que a API real use as mesmas rotas e o mesmo formato de erro.
- As chamadas simuladas não aparecem na aba Rede do navegador.
- O `?simular=` vale para a URL atual. Ao navegar pelo menu, o parâmetro some e as chamadas voltam ao normal.
- O banco é do navegador de cada pessoa: aprovar num celular não aparece em outro.
