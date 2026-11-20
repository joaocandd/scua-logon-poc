import { Component, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

/** Linha da tabela equivalente ao gráfico. */
export interface ChartTableRow {
  label: string;
  value: string;
}

/**
 * Moldura dos gráficos: título, descrição, o desenho (projetado) e a tabela com os mesmos números,
 * que abre no botão "Ver como tabela". A tabela fica sempre no HTML (com `hidden` quando fechada),
 * para o `aria-controls` do botão apontar para ela.
 */
@Component({
  selector: 'app-chart-frame',
  imports: [Icon],
  templateUrl: './chart-frame.html',
  styleUrl: './chart-frame.scss',
})
export class ChartFrame {
  readonly chartId = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly headingLevel = input<2 | 3>(3);
  readonly rows = input.required<readonly ChartTableRow[]>();
  readonly labelHeader = input.required<string>();
  readonly valueHeader = input.required<string>();
  readonly emptyText = input.required<string>();

  protected readonly tableOpen = signal(false);

  protected toggleTable(): void {
    this.tableOpen.update((open) => !open);
  }
}
