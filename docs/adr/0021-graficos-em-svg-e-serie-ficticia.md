# ADR 0021 · Gráficos em SVG próprio e série histórica fictícia

- **Status:** aceita
- **Data:** 20/11/2026

## Contexto

Para cobrir as telas do console atual que a PoC não tinha (Tempo de Bloqueio, Gráfico de Ausência, Logs e Estações), os relatórios e o painel Hoje precisavam de gráficos. Duas perguntas:

- **Com o quê desenhar.** Os gráficos precisam usar só os tokens (inclusive no tema escuro), ter foco por teclado, tooltip, rótulo de status em texto e uma tabela equivalente para leitor de tela. O `CLAUDE.md` pede para não adicionar dependência sem justificar.
- **Com que dados.** As fixtures têm poucos dias de pedidos e nenhum registro de bloqueio ou ausência (a ADR 0013 já tinha esbarrado nisso).

## Decisão

1. **BarChart e LineChart no design system, em SVG feito à mão** (`src/app/design-system/chart/`). Uma série por gráfico, eixo a partir do zero com marcas redondas, valores escritos quando cabem (senão o maior e o último), tooltip no mouse e no foco, setas/Home/End entre os pontos, Esc fecha o tooltip, e o botão "Ver como tabela". Barras deitadas para categorias de nome longo (status e grupos). Anel de foco com o `outline` do design system.
2. **Série diária fictícia, determinística, dos últimos 30 dias** (`src/app/mocks/history.ts`, `GET /api/relatorios/diario`). Quem trabalha em cada dia sai do motor de regras (regra, feriados e exceções); os pedidos aprovados entram com a mesma conta do painel Hoje; ausências, minutos bloqueados e as horas extras dos outros dias são sorteados com uma semente fixa por colaborador e dia. O mesmo dia dá sempre os mesmos números; a janela anda com "agora". O nome da máquina e a última atividade das Estações seguem a mesma ideia (`src/app/mocks/workstation-info.ts`).

## Alternativas consideradas

- **Biblioteca de gráficos (Chart.js, ECharts, ngx-charts).** Resolve o desenho, mas desenha em canvas ou com estilos próprios: teclado, tooltip acessível, tabela equivalente e tokens no tema escuro ficariam por nossa conta de qualquer jeito, e o pacote cresceria dezenas de kB. Para duas formas simples, o SVG próprio sai menor e a equipe entende cada linha.
- **Só tabelas, sem gráfico.** Acessível, mas o console atual tem "Gráfico de Ausência" e a comparação dia a dia fica difícil de ver numa tabela de 30 linhas.
- **Dados aleatórios a cada abertura.** Os testes e o roteiro da demo não teriam números estáveis.

## Consequências

- Nenhuma dependência nova. Os gráficos passam pelo axe, pelo teste de teclado e pelo de 320 px como qualquer tela.
- Os números dos relatórios são de demonstração e a tela diz isso. O cartão "Horas extras do mês" do painel Hoje conta só os pedidos das fixtures, então não bate com a série de 7 dias ao lado; o gráfico avisa que é a série fictícia dos relatórios.
- No produto, a série viria do agente do Windows e do banco da Scua; a tela não muda, só a origem de `/api/relatorios/diario`.
