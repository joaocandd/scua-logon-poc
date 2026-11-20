import { Component, computed, input } from '@angular/core';
import { ChartBase } from './chart-base';
import { ChartFrame } from './chart-frame';
import { barPath, hbarPath } from './chart-scale';

/** Largura máxima da barra, em px: o resto da faixa fica de respiro. */
const MAX_BAR_WIDTH = 24;
/** Barras deitadas: altura de cada linha e espessura da barra. */
const ROW_HEIGHT = 36;
const ROW_BAR = 20;
/** Largura aproximada de uma letra de 12 px, para reservar espaço aos rótulos. */
const CHAR_WIDTH = 7;

/**
 * Gráfico de barras em SVG, só com os tokens. Uma série: o título diz o que é medido, sem legenda.
 * Eixo a partir do zero com marcas redondas, valor escrito na ponta das barras (todas, quando
 * cabem; senão o maior e o último), tooltip no mouse e no foco, e "Ver como tabela".
 *
 * - `vertical` (padrão): colunas, para dias.
 * - `horizontal`: barras deitadas com o rótulo à esquerda, para categorias de nome longo (status,
 *   grupos). Os rótulos ficam sempre legíveis, mesmo em 320 px.
 *
 * ```html
 * <app-bar-chart heading="Horas extras por dia" [data]="dias" [format]="emHoras" />
 * ```
 */
@Component({
  selector: 'app-bar-chart',
  imports: [ChartFrame],
  templateUrl: './bar-chart.html',
  styleUrl: './chart.scss',
})
export class BarChart extends ChartBase {
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  protected readonly bars = computed(() =>
    this.slots().map((slot) => {
      const width = Math.max(2, Math.min(MAX_BAR_WIDTH, slot.bandWidth - 2));
      return {
        ...slot,
        path: barPath(slot.x - width / 2, slot.y, width, this.baseline() - slot.y),
      };
    }),
  );

  /** Barras deitadas: a geometria muda; os nomes e os valores são os mesmos. */
  protected readonly horizontal = computed(() => {
    const data = this.data();
    const format = this.format();
    const longestLabel = Math.max(1, ...data.map((d) => d.label.length));
    const longestValue = Math.max(1, ...data.map((d) => format(d.value).length));
    const left = Math.min(Math.round(this.width() * 0.45), longestLabel * CHAR_WIDTH + 12);
    const right = longestValue * CHAR_WIDTH + 12;
    const top = 4;
    const plotWidth = Math.max(1, this.width() - left - right);
    const plotHeight = data.length * ROW_HEIGHT;
    const max = this.scale().max;
    const xOf = (value: number) => left + (plotWidth * value) / max;
    const rows = this.slots().map((slot) => {
      const rowY = top + slot.index * ROW_HEIGHT;
      const end = xOf(slot.datum.value);
      return {
        ...slot,
        rowY,
        end,
        mid: rowY + ROW_HEIGHT / 2,
        path: hbarPath(left, rowY + (ROW_HEIGHT - ROW_BAR) / 2, end - left, ROW_BAR),
      };
    });
    const ticks = this.scale().ticks.map((value, i) => ({
      value,
      x: xOf(value),
      label: this.tickLabels()[i],
    }));
    return { left, top, plotHeight, height: top + plotHeight + 24, rows, ticks };
  });

  protected readonly rowHeight = ROW_HEIGHT;

  protected readonly svgHeight = computed(() =>
    this.orientation() === 'horizontal' ? this.horizontal().height : this.height(),
  );

  /** Onde o tooltip aparece: acima da barra (em pé) ou na ponta dela (deitada). */
  protected readonly tooltip = computed(() => {
    const index = this.active();
    if (index === null) return null;
    if (this.orientation() === 'horizontal') {
      const row = this.horizontal().rows[index];
      if (!row) return null;
      const left = Math.min(Math.max(row.end, 64), Math.max(64, this.width() - 64));
      return { slot: row, left, top: row.rowY };
    }
    const slot = this.slots()[index];
    return slot ? { slot, left: this.tooltipLeft(), top: slot.y - 24 } : null;
  });

  protected readonly rows = computed(() =>
    this.slots().map((slot) => ({
      label: slot.datum.longLabel ?? slot.datum.label,
      value: slot.valueText,
    })),
  );

  protected readonly tabStop = computed(() => Math.min(this.cursor(), this.data().length - 1));
}
