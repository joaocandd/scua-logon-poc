import { Component, input, output } from '@angular/core';
import { BarChart, Button, ChartDatum, ChartFormat, LineChart } from '../../../design-system';

/** Número de destaque do bloco, como "Total no período: 42h30". */
export interface ReportStat {
  label: string;
  value: string;
}

/**
 * Um bloco de /relatorios: título, números de destaque, o gráfico por dia (barras ou linha) e o
 * gráfico por grupo (barras deitadas), com "Exportar CSV". Só apresentação: a página calcula as
 * séries e baixa o arquivo.
 */
@Component({
  selector: 'app-report-block',
  imports: [BarChart, Button, LineChart],
  templateUrl: './report-block.html',
  styleUrl: './report-block.scss',
})
export class ReportBlock {
  /** Id do título (h2), para o aria-labelledby da seção. */
  readonly blockId = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly stats = input.required<readonly ReportStat[]>();
  readonly byDay = input.required<readonly ChartDatum[]>();
  readonly dayChart = input<'bar' | 'line'>('bar');
  readonly dayHeading = input.required<string>();
  /** Nulo quando um grupo está escolhido: o gráfico por grupo teria uma barra só. */
  readonly byGroup = input<readonly ChartDatum[] | null>(null);
  readonly groupHeading = input.required<string>();
  readonly format = input.required<ChartFormat>();
  /** Cabeçalho da coluna de valores nas tabelas dos gráficos. */
  readonly valueHeader = input.required<string>();

  readonly exportCsv = output();
}
