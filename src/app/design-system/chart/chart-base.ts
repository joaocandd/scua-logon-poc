import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  axisMargin,
  ChartDatum,
  ChartFormat,
  ChartMargins,
  formatNumber,
  niceScale,
  visibleLabels,
  visibleValues,
} from './chart-scale';

let nextId = 0;

/** Largura antes de medir a tela (e nos testes, sem ResizeObserver). */
const DEFAULT_WIDTH = 640;

/** Uma posição do eixo horizontal, já em px. */
export interface ChartSlot {
  index: number;
  datum: ChartDatum;
  /** Centro da posição. */
  x: number;
  /** Topo do valor (y do ponto ou do topo da barra). */
  y: number;
  /** Início e largura da faixa da posição: a área de toque e de foco. */
  bandX: number;
  bandWidth: number;
  /** Nome para o leitor de tela e texto do tooltip: "terça, 18/11: 3 h". */
  name: string;
  valueText: string;
  showLabel: boolean;
  showValue: boolean;
}

/**
 * O que o BarChart e o LineChart têm em comum: escala, posições, foco por teclado e tooltip.
 *
 * Teclado: o gráfico é uma parada só do Tab. Dentro dele, as setas (e Home e End) passam de um
 * ponto ao outro, e o tooltip mostra o valor do ponto com foco. Esc fecha o tooltip. Cada ponto
 * tem nome ("18/11: 3 h"), então o leitor de tela também lê ponto a ponto. A tabela ("Ver como
 * tabela") traz os mesmos números.
 */
@Directive()
export abstract class ChartBase {
  /** Título do gráfico, que também dá nome à tabela. */
  readonly heading = input.required<string>();
  /** Uma frase sobre o que o gráfico mostra, abaixo do título. */
  readonly description = input<string>();
  readonly data = input.required<readonly ChartDatum[]>();
  /** Formato dos valores ("3 h", "45 min"). Vale para o eixo, o tooltip e a tabela. */
  readonly format = input<ChartFormat>(formatNumber);
  /** Cabeçalho da coluna dos rótulos na tabela. */
  readonly labelHeader = input('Dia');
  /** Cabeçalho da coluna dos valores na tabela. */
  readonly valueHeader = input('Valor');
  /** Altura da área do gráfico, em px. */
  readonly height = input(220);
  /** Nível do título, para seguir a hierarquia da página. */
  readonly headingLevel = input<2 | 3>(3);
  /** Texto no lugar do gráfico quando não há dados. */
  readonly emptyText = input('Nenhum dado no período.');

  protected readonly id = `grafico-${++nextId}`;
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  /** Área do desenho, medida para o SVG ocupar a largura disponível. */
  private readonly plot = viewChild<ElementRef<HTMLElement>>('plot');

  /** Largura medida da área do gráfico. */
  protected readonly width = signal(DEFAULT_WIDTH);
  /** Ponto que recebe o Tab (tabindex roving). */
  protected readonly cursor = signal(0);
  /** Ponto com tooltip aberto (pelo mouse ou pelo foco). */
  protected readonly active = signal<number | null>(null);
  /** O foco está num dos pontos: mostra o anel em volta dele. */
  protected readonly focused = signal(false);

  protected readonly empty = computed(() => this.data().length === 0);

  protected readonly scale = computed(() =>
    niceScale(Math.max(0, ...this.data().map((d) => d.value))),
  );
  protected readonly tickLabels = computed(() => this.scale().ticks.map((t) => this.format()(t)));

  protected readonly margins = computed<ChartMargins>(() => ({
    top: 24,
    right: 8,
    bottom: 28,
    left: axisMargin(this.tickLabels()),
  }));
  protected readonly plotWidth = computed(() =>
    Math.max(1, this.width() - this.margins().left - this.margins().right),
  );
  protected readonly plotHeight = computed(() =>
    Math.max(1, this.height() - this.margins().top - this.margins().bottom),
  );
  /** Posição da linha de base (valor zero). */
  protected readonly baseline = computed(() => this.margins().top + this.plotHeight());

  protected readonly ticks = computed(() =>
    this.scale().ticks.map((value, i) => ({
      value,
      y: this.yOf(value),
      label: this.tickLabels()[i],
    })),
  );

  protected readonly slots = computed<ChartSlot[]>(() => {
    const data = this.data();
    const bandWidth = this.plotWidth() / Math.max(1, data.length);
    const labels = visibleLabels(data.length, bandWidth);
    const values = visibleValues(
      data.map((d) => d.value),
      bandWidth,
    );
    const format = this.format();
    return data.map((datum, index) => {
      const bandX = this.margins().left + index * bandWidth;
      const valueText = format(datum.value);
      return {
        index,
        datum,
        x: bandX + bandWidth / 2,
        y: this.yOf(datum.value),
        bandX,
        bandWidth,
        name: `${datum.longLabel ?? datum.label}: ${valueText}`,
        valueText,
        showLabel: labels[index],
        showValue: values[index],
      };
    });
  });

  protected readonly activeSlot = computed(() => {
    const index = this.active();
    return index === null ? null : (this.slots()[index] ?? null);
  });

  /** Tooltip dentro da largura do gráfico. */
  protected readonly tooltipLeft = computed(() => {
    const slot = this.activeSlot();
    if (!slot) return 0;
    const half = 64;
    return Math.min(Math.max(slot.x, half), Math.max(half, this.width() - half));
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // A área existe mesmo antes de entrar na tela (sem dados, ou com a tabela aberta): o
      // ResizeObserver mede quando ela aparecer.
      const plot = this.plot()?.nativeElement;
      if (!plot || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        if (width > 0) this.width.set(width);
      });
      observer.observe(plot);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected yOf(value: number): number {
    return this.margins().top + this.plotHeight() * (1 - value / this.scale().max);
  }

  protected onFocus(index: number): void {
    this.cursor.set(index);
    this.active.set(index);
    this.focused.set(true);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.active.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const last = this.data().length - 1;
    const moves: Record<string, number> = {
      ArrowRight: Math.min(last, this.cursor() + 1),
      ArrowDown: Math.min(last, this.cursor() + 1),
      ArrowLeft: Math.max(0, this.cursor() - 1),
      ArrowUp: Math.max(0, this.cursor() - 1),
      Home: 0,
      End: last,
    };
    if (event.key === 'Escape') {
      this.active.set(null);
      return;
    }
    if (!(event.key in moves)) return;
    event.preventDefault();
    this.focusSlot(moves[event.key]);
  }

  /** O mouse sobre a faixa abre o tooltip; sair do gráfico fecha (menos com o foco num ponto). */
  protected onPointerEnter(index: number): void {
    this.active.set(index);
  }

  protected onPointerLeave(): void {
    this.active.set(this.focused() ? this.cursor() : null);
  }

  private focusSlot(index: number): void {
    this.cursor.set(index);
    this.host.querySelector<SVGElement>(`[data-index="${index}"]`)?.focus();
  }
}
