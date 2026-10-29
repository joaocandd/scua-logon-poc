import { Component, computed, input } from '@angular/core';
import { formatClock, formatRange, MINUTES_PER_DAY, toMinutes } from '../../shared/time';

export type TimelineSegmentKind = 'unlocked' | 'locked';

export interface TimelineSegment {
  /** Início, "HH:mm". */
  start: string;
  /** Fim, "HH:mm". "24:00" é o fim do dia. Fim antes do início atravessa a meia-noite. */
  end: string;
  kind: TimelineSegmentKind;
  /** Nome do trecho, como "Jornada", "Almoço" ou "Hora extra aprovada". */
  label?: string;
}

/** Trecho do dia em minutos, já sem sobreposição. */
export interface DaySegment {
  start: number;
  end: number;
  kind: TimelineSegmentKind;
  label?: string;
}

/**
 * Transforma os segmentos recebidos em trechos que cobrem o dia todo, de 0h a 24h:
 * - um segmento que atravessa a meia-noite (22:00–06:00) vira dois: 22h–24h e 0h–6h;
 * - na sobreposição, vale o que vem depois na lista (o almoço por cima da jornada);
 * - o que nenhum segmento cobre fica bloqueado, como a estação fora da jornada.
 */
export function resolveDay(segments: readonly TimelineSegment[]): DaySegment[] {
  const pieces = segments.flatMap(({ start, end, kind, label }) => {
    const from = toMinutes(start);
    const to = toMinutes(end);
    if (to > from) return [{ start: from, end: to, kind, label }];
    return [
      { start: from, end: MINUTES_PER_DAY, kind, label },
      { start: 0, end: to, kind, label },
    ].filter((piece) => piece.end > piece.start);
  });

  const cuts = [...new Set([0, MINUTES_PER_DAY, ...pieces.flatMap((p) => [p.start, p.end])])];
  cuts.sort((a, b) => a - b);

  const day: DaySegment[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [start, end] = [cuts[i], cuts[i + 1]];
    const top = pieces.filter((p) => p.start <= start && p.end >= end).at(-1);
    const kind = top?.kind ?? 'locked';
    const label = top?.label;
    const previous = day.at(-1);
    if (previous && previous.kind === kind && previous.label === label) {
      previous.end = end;
    } else {
      day.push({ start, end, kind, label });
    }
  }
  return day;
}

const KIND_LABEL: Record<TimelineSegmentKind, string> = {
  unlocked: 'Liberada',
  locked: 'Bloqueada',
};

/** "Liberada das 8h às 12h (Jornada)". */
export function describeSegment({ start, end, kind, label }: DaySegment): string {
  return `${KIND_LABEL[kind]} ${formatRange(start, end)}${label ? ` (${label})` : ''}`;
}

/**
 * Barra de um dia (0h a 24h): laranja onde a estação está liberada e hachura onde está
 * bloqueada, com marcador opcional de "agora" e legenda. A barra é só visual; o leitor de tela
 * recebe a lista dos horários em texto.
 */
@Component({
  selector: 'app-workday-timeline',
  templateUrl: './workday-timeline.html',
  styleUrl: './workday-timeline.scss',
  host: { role: 'group', '[attr.aria-label]': 'label()' },
})
export class WorkdayTimeline {
  readonly segments = input.required<readonly TimelineSegment[]>();
  /** Hora atual, "HH:mm", já no fuso America/Sao_Paulo. Sem valor, não há marcador. */
  readonly now = input<string>();
  /** Nome do grupo para o leitor de tela, como "Jornada de terça, 12/11". */
  readonly label = input('Linha do tempo do dia');

  protected readonly ticks = [0, 6, 12, 18, 24];
  protected readonly day = computed(() => resolveDay(this.segments()));
  /** Trechos laranja. `joined`: encosta em outro trecho liberado (ex.: jornada e hora extra). */
  protected readonly unlocked = computed(() =>
    this.day().flatMap((segment, i, day) =>
      segment.kind === 'unlocked' ? [{ ...segment, joined: day[i - 1]?.kind === 'unlocked' }] : [],
    ),
  );
  protected readonly description = computed(() => this.day().map(describeSegment));

  protected readonly nowMarker = computed(() => {
    const now = this.now();
    if (!now) return null;
    const minutes = toMinutes(now);
    const percent = this.percent(minutes);
    const current =
      this.day().find((s) => s.start <= minutes && minutes < s.end) ?? this.day().at(-1)!;
    return {
      percent,
      clock: formatClock(minutes),
      // Perto das pontas, o rótulo encosta na borda em vez de centralizar e sair da barra.
      edge: percent < 8 ? 'start' : percent > 92 ? 'end' : null,
      description: `Agora, ${formatClock(minutes)}: ${KIND_LABEL[current.kind].toLowerCase()}${current.label ? ` (${current.label})` : ''}.`,
    };
  });

  protected percent(minutes: number): number {
    return (minutes / MINUTES_PER_DAY) * 100;
  }
}
