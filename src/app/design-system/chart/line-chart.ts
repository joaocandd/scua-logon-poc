import { Component, computed } from '@angular/core';
import { ChartBase } from './chart-base';
import { ChartFrame } from './chart-frame';

/** Abaixo desta largura por ponto, só os pontos com valor escrito (e o ativo) ganham marcador. */
const MIN_SLOT_FOR_MARKERS = 14;

/**
 * Gráfico de linha em SVG, só com os tokens, para uma série ao longo do tempo. Mesmo eixo, tooltip,
 * teclado e "Ver como tabela" do BarChart. Linha de 2 px, área clarinha embaixo e marcadores de
 * 8 px com anel da cor da superfície.
 *
 * ```html
 * <app-line-chart heading="Minutos bloqueados por dia" [data]="dias" [format]="emMinutos" />
 * ```
 */
@Component({
  selector: 'app-line-chart',
  imports: [ChartFrame],
  templateUrl: './line-chart.html',
  styleUrl: './chart.scss',
})
export class LineChart extends ChartBase {
  protected readonly linePath = computed(() =>
    this.slots()
      .map((slot, i) => `${i === 0 ? 'M' : 'L'}${slot.x},${slot.y}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const slots = this.slots();
    if (slots.length === 0) return '';
    const first = slots[0];
    const last = slots[slots.length - 1];
    return `${this.linePath()} L${last.x},${this.baseline()} L${first.x},${this.baseline()} Z`;
  });

  protected readonly showAllMarkers = computed(
    () => (this.slots()[0]?.bandWidth ?? 0) >= MIN_SLOT_FOR_MARKERS,
  );

  protected readonly rows = computed(() =>
    this.slots().map((slot) => ({
      label: slot.datum.longLabel ?? slot.datum.label,
      value: slot.valueText,
    })),
  );

  /** O primeiro e o último valor escritos não passam da borda do gráfico. */
  protected anchorOf(index: number): 'start' | 'middle' | 'end' {
    if (index === 0) return 'start';
    return index === this.data().length - 1 ? 'end' : 'middle';
  }

  protected readonly tabStop = computed(() => Math.min(this.cursor(), this.data().length - 1));
}
