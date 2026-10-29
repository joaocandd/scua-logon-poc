# ADR 0001 · App de página única, sem renderização no servidor

- **Status:** aceita
- **Data:** 28/10/2026

## Contexto

O `ng new` do Angular 22 pergunta se o app deve ter renderização no servidor (SSR) e pré-renderização (SSG). A prova de conceito não tem backend: a API é simulada por um interceptor HTTP no navegador. Quase todas as telas ficam atrás de login e mostram dados que mudam a cada minuto (pedidos, estado das estações). Nenhuma página precisa aparecer em buscadores.

## Decisão

Criar o projeto como app de página única (SPA), sem SSR e sem SSG. É o padrão atual do `ng new`. O app é servido como arquivos estáticos, com as rotas em URLs normais (sem `#`).

## Alternativas consideradas

- **SSR com hidratação.** Melhora o primeiro carregamento e o SEO. Exige um servidor Node em produção, cuidado com código que só roda no navegador (`window`, `localStorage`) e testes em dois ambientes. Não traz ganho para telas logadas com dados simulados.
- **Pré-renderização (SSG) só da página pública de aprovação por e-mail.** Pode fazer sentido no produto real. Na PoC, essa página depende do token do link e de dados simulados no navegador, então a pré-renderização não ajuda.

## Consequências

- Deploy simples em qualquer hospedagem estática. A hospedagem precisa devolver o `index.html` para qualquer rota (fallback de SPA); isso entra no passo de publicação.
- O primeiro carregamento depende do JavaScript. Rotas sob demanda e o orçamento de tamanho do build mantêm o pacote inicial pequeno.
- Se o produto real precisar de SSR (por exemplo, para a página pública de aprovação), dá para adicionar depois com `ng add @angular/ssr`, sem reescrever as telas.
