// Linha do tempo do editor de regras: a jornada do rascunho no formato da WorkdayTimeline e a
// duração em texto. Desenha só o que checkHours deu como certo.

import type { TimelineSegment } from '../../../design-system';
import { formatDuration, toTime } from '../../../shared/time';
import { HoursCheck } from './schedule-validation';

export interface DraftTimeline {
  segments: TimelineSegment[];
  /** "9h de jornada, 1h de intervalo, 8h de trabalho". */
  duration: string;
}

/** Nula enquanto a jornada não tem início e fim certos. */
export function draftTimeline({ shift, breaks }: HoursCheck): DraftTimeline | null {
  if (!shift) return null;

  const segments: TimelineSegment[] = [
    { start: toTime(shift.start), end: toTime(shift.end), kind: 'unlocked', label: 'Jornada' },
    ...breaks.map((b): TimelineSegment => ({
      start: toTime(b.start),
      end: toTime(b.end),
      kind: 'locked',
      label: b.label,
    })),
  ];

  const total = shift.end - shift.start;
  const pauses = breaks.reduce((sum, b) => sum + b.end - b.start, 0);
  const duration =
    pauses === 0
      ? `${formatDuration(total)} de jornada, sem intervalo`
      : `${formatDuration(total)} de jornada, ${formatDuration(pauses)} de intervalo, ${formatDuration(total - pauses)} de trabalho`;
  return { segments, duration };
}
