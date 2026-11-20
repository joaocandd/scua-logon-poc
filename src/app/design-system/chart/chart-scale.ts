// Escala e geometria dos gráficos (BarChart e LineChart). Funções puras, sem Angular: os dois
// componentes só desenham o que sai daqui.

/** Um ponto ou barra do gráfico. */
export interface ChartDatum {
  /** Rótulo do eixo horizontal, como "18/11" ou "Aguardando gestor". */
  label: string;
  value: number;
  /** Rótulo por extenso, para o tooltip, a tabela e o leitor de tela ("terça, 18/11"). */
  longLabel?: string;
}

/** Formata um valor do gráfico: "3 h", "45 min", "12". */
export type ChartFormat = (value: number) => string;

/** Número em pt-BR, sem casas decimais desnecessárias: 1.234 e 2,5. */
export const formatNumber: ChartFormat = (value) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export interface NiceScale {
  /** Topo do eixo, sempre um valor "redondo" maior ou igual ao maior valor. */
  max: number;
  /** Marcas do eixo, de 0 até `max`. */
  ticks: number[];
}

/**
 * Eixo a partir do zero com marcas redondas (1, 2, 2,5 ou 5 × 10ⁿ): 0, 5, 10, 15. Com tudo zero,
 * o eixo vai de 0 a 1, para a linha de base não ficar sem escala.
 */
export function niceScale(maxValue: number, targetTicks = 5): NiceScale {
  if (!(maxValue > 0)) return { max: 1, ticks: [0, 1] };
  const rough = maxValue / targetTicks;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const max = Math.ceil(maxValue / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= max + 1e-9; i++) ticks.push(round(i * step));
  return { max: round(max), ticks };
}

/**
 * Quais rótulos do eixo horizontal aparecem: todos se couberem, senão um a cada N, sempre com o
 * último. `slotWidth` é a largura de cada posição em px; um rótulo precisa de `labelWidth` px.
 */
export function visibleLabels(count: number, slotWidth: number, labelWidth = 44): boolean[] {
  const every = Math.max(1, Math.ceil(labelWidth / Math.max(slotWidth, 1)));
  return Array.from({ length: count }, (_, i) => (count - 1 - i) % every === 0);
}

/**
 * Quais valores aparecem escritos no gráfico. Se cabem, todos. Senão, só o maior e o último: um
 * número em cada ponto de 30 dias vira ruído. O resto fica no tooltip e na tabela.
 */
export function visibleValues(
  values: readonly number[],
  slotWidth: number,
  minWidth = 32,
): boolean[] {
  if (slotWidth >= minWidth) return values.map(() => true);
  const max = Math.max(...values);
  const maxIndex = values.indexOf(max);
  return values.map((_, i) => i === values.length - 1 || (i === maxIndex && max > 0));
}

/** Margens da área de desenho, em px. A da esquerda cabe os rótulos do eixo vertical. */
export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Margem esquerda para o maior rótulo do eixo vertical (texto de 12 px, uns 7 px por letra). */
export function axisMargin(tickLabels: readonly string[]): number {
  const longest = Math.max(1, ...tickLabels.map((label) => label.length));
  return Math.ceil(longest * 7 + 8);
}

/**
 * Barra com o topo arredondado (4 px) e a base reta, apoiada na linha de base. Altura zero não
 * desenha nada.
 */
export function barPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  const bottom = y + height;
  return [
    `M${x},${bottom}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${bottom}`,
    'Z',
  ].join(' ');
}

/** Barra deitada: começa reta no eixo e termina arredondada (4 px) à direita. */
export function hbarPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, height / 2, width);
  const end = x + width;
  return [
    `M${x},${y}`,
    `H${end - r}`,
    `Q${end},${y} ${end},${y + r}`,
    `V${y + height - r}`,
    `Q${end},${y + height} ${end - r},${y + height}`,
    `H${x}`,
    'Z',
  ].join(' ');
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
