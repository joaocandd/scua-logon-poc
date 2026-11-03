# Métricas

Medições de desempenho, acessibilidade e tamanho do app. Cada seção diz quando e como foi medida, para dar para repetir e comparar.

## /entrar · 29/10/2026

Comparação de antes e depois de carregar sob demanda a casca do app e a API simulada:

- **Antes:** commit `fb0f8e0`, o merge da casca e da API simulada com a tela de login. Tudo isso entrava no pacote inicial.
- **Depois:** commit `aa81bb4` (`perf: casca e API simulada sob demanda`).

### Lighthouse mobile

| | Antes | Depois |
|---|---|---|
| **Desempenho** | **94** | **95** |
| **Acessibilidade** | **100** | **100** |
| First Contentful Paint | 2,38 s | 2,36 s |
| Largest Contentful Paint | 2,64 s | 2,47 s |
| Total Blocking Time | 23 ms | 21 ms |
| Cumulative Layout Shift | 0,001 | 0,001 |
| JavaScript transferido | 157,8 kB | 122,2 kB |
| Total transferido | 241,2 kB | 205,7 kB |

Os valores são a mediana de 3 execuções. O desempenho variou de 93 a 94 antes e de 94 a 95 depois. Depois, a página também tirou 100 em boas práticas e 82 em SEO. No SEO faltam a `meta description` e um `robots.txt`, porque o servidor local devolvia o `index.html` nesse endereço.

A página baixa 36 kB a menos de JavaScript, mas a nota sobe só 1 ponto. O tempo até aparecer o primeiro conteúdo depende da sequência de downloads (main.js, depois o código da página, depois as fontes), e não só do tamanho.

### Pacote inicial

O pacote inicial é o que o navegador baixa antes de abrir qualquer página. Valores do build de produção.

| | Antes | Depois |
|---|---|---|
| **Pacote inicial (JS e CSS)** | **468,66 kB** | **317,37 kB** |
| Transferido com gzip (estimativa do Angular CLI) | 122,71 kB | 84,06 kB |
| JavaScript que o /entrar baixa (pacote inicial e código da página) | 518,8 kB | 387,7 kB |

O que havia no JavaScript inicial, por origem:

| Origem | Antes | Depois |
|---|---|---|
| Angular, router, HTTP e rxjs | 295,9 kB | 293,4 kB |
| CDK (Overlay, Dialog, A11y, Portal) | 55,4 kB | — |
| Angular Aria (menu do usuário) | 27,8 kB | — |
| API simulada, fixtures e motor de regras | 20,9 kB | — |
| Casca do app (`core/layout`) | 19,6 kB | — |
| Ícones | 12,9 kB | — |
| Outros componentes do design system | 11,5 kB | — |
| Resto do app (rotas, configuração, interceptor) | 3,3 kB | 2,7 kB |
| **Total de JavaScript inicial** | **447,4 kB** | **296,1 kB** |

O que saiu do pacote inicial agora chega quando é usado:

- A casca, o CDK, o Aria e os ícones vêm ao abrir uma página do app.
- A API simulada vem na primeira chamada a `/api/`.
- A tela de entrada usa só o Button, o Field e o Icon do design system, e não baixa nada do CDK.

A divisão por origem é uma estimativa. O esbuild informa quanto cada módulo ocupa antes da otimização final do Angular; os valores foram ajustados na proporção do tamanho real de cada arquivo.

### Como foi medido

- **Quando e onde:** 29/10/2026, no computador de desenvolvimento (Windows 11).
- **Versões:** Angular 22.2.3, Angular CLI 22.2.5, Node 24.19.0, Lighthouse 13.5.0 e Chrome 156 sem interface (headless).
- **Build:** `npm run build` (configuração de produção). Os tamanhos vêm da tabela "Initial chunk files" que o `ng build` mostra.
- **Divisão por origem:** `npx ng build --stats-json`, lendo o `dist/scua-logon-poc/browser-stats.json` (metafile do esbuild). Contam o `main.js` e os arquivos que ele importa direto. Para o /entrar, também o código da página e o que ele importa direto.
- **Servidor:** a pasta `dist/scua-logon-poc/browser` servida localmente com gzip e com o `index.html` em qualquer rota (fallback de SPA), como numa hospedagem estática.
- **Lighthouse:** configuração padrão de celular, com tela de 412 × 823 px, rede simulada (150 ms de latência, 1,6 Mbps) e CPU 4 vezes mais lenta. Três execuções por versão; a tabela mostra a mediana.

### Como repetir

1. `npm run build`
2. Sirva `dist/scua-logon-poc/browser` na porta 4400, com gzip e fallback para o `index.html`.
3. Rode três vezes e compare:

   ```
   npx --yes lighthouse@13.5.0 http://localhost:4400/entrar --form-factor=mobile --chrome-flags="--headless=new" --view
   ```

Para medir o "antes", faça o mesmo a partir do commit `fb0f8e0`.

## Auditoria: cinco páginas · 03/11/2026

Lighthouse mobile em cinco páginas, antes e depois das correções de desempenho mais baratas da auditoria de acessibilidade, textos e desempenho.

- **Antes:** commit `19cc148` (merge do PR #7, regras de jornada).
- **Depois:** o mesmo commit com as correções da auditoria (branch `feat/auditoria`).

O link do e-mail (`/aprovacao/valido-ped-04`) é a comparação principal: é a página que o gestor abre no celular, fora do app.

### O que mudou

1. **Fonte variável** (ADR 0013). Um arquivo de 38 kB serve os quatro pesos, no lugar de quatro arquivos de 19 kB. As páginas baixam 37 kB a menos de fonte e fazem até 3 downloads a menos.
2. **Diálogo de recusa sob demanda.** O diálogo e o Signal Forms que ele usa (`@angular/forms`, 16,6 kB com gzip) só são baixados no primeiro "Recusar". Antes, a caixa de aprovações e o link do e-mail baixavam tudo isso ao abrir, mesmo para quem só aprova.
3. **Favicon em SVG** com a barra laranja do cabeçalho (132 bytes), no lugar do `favicon.ico` padrão do Angular (15 kB).

### Lighthouse mobile: notas

| Página | Desempenho antes | Desempenho depois |
|---|---|---|
| /entrar | 93 | **97** |
| /hoje | 92 | **94** |
| /aprovacoes | 87 | **93** |
| /regras/regra-comercial | 89 | **90** |
| **/aprovacao/valido-ped-04** (link do e-mail) | **90** | **94** |

Acessibilidade 100 e boas práticas 100 em todas as páginas, antes e depois. SEO 82 em todas: faltam a `meta description` e um `robots.txt` (o servidor local devolve o `index.html` nesse endereço). Isso foi resolvido depois, com o app fora dos buscadores (veja "Sem o Angular Material e fora dos buscadores", abaixo).

Entre as três execuções de cada página, a nota variou no máximo 2 pontos (/regras/regra-comercial antes: 88 a 90).

### Detalhe por página

Mediana de 3 execuções. kB como o Lighthouse mostra (1 kB = 1024 bytes), transferidos com gzip.

| Página | | FCP | LCP | TBT | JavaScript | Fontes | Total | Downloads |
|---|---|---|---|---|---|---|---|---|
| /entrar | antes | 2,43 s | 2,76 s | 3 ms | 122,9 kB | 74,1 kB | 219,5 kB | 14 |
| | depois | 2,00 s | 2,34 s | 9 ms | 124,1 kB | 37,3 kB | 169,0 kB | 12 |
| /hoje | antes | 2,29 s | 2,90 s | 2 ms | 150,5 kB | 55,6 kB | 228,5 kB | 22 |
| | depois | 2,22 s | 2,73 s | 11 ms | 151,7 kB | 37,3 kB | 196,6 kB | 21 |
| /aprovacoes | antes | 2,74 s | 3,38 s | 30 ms | 182,9 kB | 74,1 kB | 279,4 kB | 29 |
| | depois | 2,27 s | 2,88 s | 23 ms | 166,7 kB | 37,3 kB | 211,5 kB | 26 |
| /regras/regra-comercial | antes | 2,55 s | 3,29 s | 44 ms | 185,7 kB | 55,6 kB | 263,7 kB | 30 |
| | depois | 2,36 s | 3,17 s | 30 ms | 187,0 kB | 37,3 kB | 231,8 kB | 29 |
| /aprovacao/valido-ped-04 | antes | 2,36 s | 3,20 s | 2 ms | 163,3 kB | 74,1 kB | 259,8 kB | 25 |
| | depois | 2,18 s | 2,69 s | 7 ms | 147,0 kB | 37,3 kB | 191,8 kB | 22 |

CLS de 0 a 0,001 em todas, antes e depois.

O TBT varia de 0 a 40 ms entre execuções da mesma versão. A diferença no /entrar e no /hoje está dentro dessa variação, e todos ficam muito abaixo do limite de 200 ms.

O LCP de todas as páginas é texto: a nota de demonstração no /entrar, o parágrafo provisório do /hoje, a descrição da página no /aprovacoes, uma ajuda do editor no /regras/regra-comercial e um alerta do pedido no link do e-mail. Ele depende da cadeia de downloads (main.js, depois o código da página, depois o que ela importa) e da fonte.

### Comparação com o link atual da Scua

| | Link atual da Scua | PoC antes | PoC depois |
|---|---|---|---|
| Desempenho | [MEDIR] | 90 | 94 |
| Acessibilidade | [MEDIR] | 100 | 100 |
| FCP | [MEDIR] | 2,36 s | 2,18 s |
| LCP | [MEDIR] | 3,20 s | 2,69 s |
| Total transferido | [MEDIR] | 259,8 kB | 191,8 kB |

Falta o endereço do link de aprovação atual da Scua. Meça com o mesmo comando (abaixo) e não guarde o token do link neste repositório.

### Pacote inicial

| | Antes | Depois |
|---|---|---|
| **Pacote inicial (JS e CSS)** | **320,03 kB** | **312,43 kB** |
| Transferido com gzip (estimativa do Angular CLI) | 84,83 kB | 86,21 kB |
| Arquivos no pacote inicial | 2 | 3 |

O CSS caiu 5,6 kB: a fonte variável tem 5 `@font-face` (um por alfabeto), no lugar de 20 (5 alfabetos × 4 pesos).

O JavaScript inicial ficou com o mesmo tamanho, mas agora em dois arquivos: o Angular (core e rxjs, 169 kB) saiu do `main.js` (127 kB). Isso é efeito do diálogo de recusa sob demanda: com um `import()` dentro de uma página que já vem sob demanda, o otimizador do Angular separa o core. O `index.html` pede os dois arquivos ao mesmo tempo (`modulepreload`), então não há espera a mais. Comprimidos em separado, ficam 1,4 kB maiores na estimativa do CLI.

### Sem o Angular Material e fora dos buscadores

Depois das correções acima, o app deixou de carregar o tema do Angular Material, que nenhuma tela usava (ADR 0014), e saiu dos buscadores: `meta robots` com `noindex` e `robots.txt` com `Disallow: /`. Medido do mesmo jeito, no build final da auditoria.

| | Depois das correções | Sem o Material |
|---|---|---|
| `index.html`, com o CSS crítico dentro (antes do gzip) | 12,8 kB | 3,6 kB |
| `styles.css` (antes do gzip) | 16,15 kB | 6,03 kB |
| **Pacote inicial (JS e CSS)** | **312,43 kB** | **302,37 kB** |
| Transferido com gzip (estimativa do Angular CLI) | 86,21 kB | 84,75 kB |

| Página | Desempenho | Total transferido | SEO |
|---|---|---|---|
| /entrar | 97 → 96 | 169,0 → 165,8 kB | 82 → 63 |
| /hoje | 94 → 94 | 196,6 → 193,4 kB | 82 → 63 |
| /aprovacoes | 93 → 93 | 211,5 → 208,3 kB | 82 → 63 |
| /regras/regra-comercial | 90 → 90 | 231,8 → 228,6 kB | 82 → 63 |
| /aprovacao/valido-ped-04 | 94 → 94 | 191,8 → 188,6 kB | 82 → 63 |

Cada página baixa 3,2 kB a menos. As notas de desempenho ficaram dentro da variação entre execuções. Na primeira rodada, o TBT do /regras/regra-comercial deu de 87 a 144 ms; repetindo as duas versões em seguida, deu de 17 a 42 ms sem o Material e de 38 a 63 ms com ele. Era variação da máquina, não do app.

O SEO caiu de propósito. A única auditoria que reprova é "a página está bloqueada para indexação", que é o que o `noindex` faz. A `meta description` e o `robots.txt` agora passam.

### Como foi medido

- **Quando e onde:** 03/11/2026, no computador de desenvolvimento (Windows 11).
- **Versões:** Angular 22.2.3, Angular CLI 22.2.5, Node 24.19.0, Lighthouse 13.5.0 e Chrome 156 sem interface (headless).
- **Build:** `npx ng build --stats-json` (configuração de produção). O "antes" foi gerado a partir do commit `19cc148`, sem as mudanças da auditoria.
- **Servidor:** `node scripts/serve-dist.mjs`, que serve o build com gzip, cache longo nos arquivos com hash no nome e o `index.html` em qualquer rota.
- **Lighthouse:** configuração padrão de celular, com tela de 412 × 823 px, rede simulada (150 ms de latência, 1,6 Mbps) e CPU 4 vezes mais lenta. Três execuções por página e por versão; as tabelas mostram a mediana.

### Como repetir

1. `npm run build`
2. `node scripts/serve-dist.mjs` (serve `dist/scua-logon-poc/browser` em http://localhost:4400)
3. Em outro terminal, rode três vezes para cada página:

   ```
   npx --yes lighthouse@13.5.0 http://localhost:4400/aprovacao/valido-ped-04 --form-factor=mobile --chrome-flags="--headless=new" --view
   ```

Para medir o "antes", faça o mesmo a partir do commit `19cc148`.
