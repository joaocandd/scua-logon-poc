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
