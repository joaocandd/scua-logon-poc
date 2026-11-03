# ADR 0015 · Montserrat variável no lugar de quatro pesos fixos

- **Status:** aceita
- **Data:** 03/11/2026
- **Número:** escrita como 0013 no `feat/auditoria` (commit `19daf81`). Virou 0015 ao juntar com o `main`, que já tinha a ADR 0013 do painel Hoje.

## Contexto

O app usa a Montserrat em quatro pesos: 400 (corpo), 500 (rótulos), 600 (botões) e 700 (títulos). Com o `@fontsource/montserrat`, cada peso é um arquivo woff2 de uns 19 kB só com o alfabeto latino. Na auditoria de desempenho (docs/metricas.md, 03/11/2026), o `/entrar`, o `/aprovacoes` e o link do e-mail baixavam os quatro: 74 kB de fonte, quase metade do JavaScript da página. Só o peso 400 é descoberto cedo; os outros três só aparecem depois de o JavaScript desenhar a tela.

## Decisão

Usar a versão variável da mesma fonte, `@fontsource-variable/montserrat`. Um arquivo de 38 kB (alfabeto latino) cobre os pesos de 100 a 900. A família passa a se chamar `Montserrat Variable` no `--font-sans` (`src/styles/tokens.css`). Continua woff2, servido pelo próprio app, sem Google Fonts.

## Alternativas consideradas

- **Manter os quatro pesos e pré-carregar com `<link rel="preload">`.** O Angular põe um hash no nome dos arquivos de fonte, então o `index.html` não sabe o endereço sem um passo extra no build. E os 74 kB continuariam.
- **Usar três pesos** (trocar o 500 pelo 400 ou pelo 600). Economiza 19 kB, mas muda o desenho dos rótulos.
- **Fonte do sistema.** Zero download, mas perde a identidade da marca, que usa a Montserrat.

## Consequências

- As páginas baixam 37 kB a menos de fonte e fazem 3 downloads a menos. Uma página que usa só um peso baixa 19 kB a mais que antes; hoje nenhuma tela do app usa um peso só.
- O desenho é o mesmo: a versão variável vem dos mesmos arquivos da fonte. Os pesos 400, 500, 600 e 700 continuam valendo no CSS.
- Mudou a dependência no `package.json` e a linha da fonte no CLAUDE.md.
