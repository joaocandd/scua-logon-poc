// Linha do tempo do dia no detalhe do pedido: jornada, intervalos, hora extra pedida e quando a
// estação vai bloquear. Funções puras.

import { TimelineSegment } from '../../../design-system';
import { formatDate, toLocal } from '../../../shared/date';
import { ActivityEvent } from '../../../shared/models';
import { afterStart, MAX_OVERTIME_MINUTES } from '../../../shared/schedule-engine';
import { formatClock, MINUTES_PER_DAY, toTime } from '../../../shared/time';
import { InboxItem } from './approval-inbox';

export interface DetailTimeline {
  /** Nome do grupo para o leitor de tela: "Jornada de Lucas Bittencourt, ter, 03/11". */
  label: string;
  segments: TimelineSegment[];
  /** Quando a estação vai bloquear, em frases: "Se aprovar, a estação bloqueia às 19h...". */
  notes: string[];
}

/**
 * Segmentos da WorkdayTimeline para o dia do pedido. A hora extra aparece como "pedida" enquanto
 * aguarda decisão e como liberada depois de aprovada, sempre limitada a 2 h; o que passa do
 * limite fica bloqueado, com o rótulo "Acima do limite de 2 h".
 */
export function detailTimeline(item: InboxItem): DetailTimeline {
  const { request, employee, shift } = item;
  const label = `Jornada de ${employee.name}, ${formatDate(request.date)}`;
  if (!shift) {
    return { label, segments: [], notes: ['Sem jornada prevista neste dia.'] };
  }

  const end = shift.end;
  const requestedEnd = afterStart(shift.start, request.requestedEnd);
  const unlockedUntil = Math.min(requestedEnd, end + MAX_OVERTIME_MINUTES);
  const capped = requestedEnd > unlockedUntil;

  const segments: TimelineSegment[] = [
    { start: toTime(shift.start), end: toTime(end), kind: 'unlocked', label: 'Jornada' },
    ...shift.breaks.map((b): TimelineSegment => ({
      start: toTime(b.start),
      end: toTime(b.end),
      kind: 'locked',
      label: b.label,
    })),
  ];
  const pending = request.status === 'aguardando_gestor' || request.status === 'aguardando_rh';
  const approved = request.status === 'aprovado';
  if (pending || approved) {
    segments.push({
      start: toTime(end),
      end: toTime(unlockedUntil),
      kind: approved ? 'unlocked' : 'requested',
      label: approved ? 'Hora extra aprovada' : 'Hora extra pedida',
    });
    if (capped) {
      segments.push({
        start: toTime(unlockedUntil),
        end: toTime(requestedEnd),
        kind: 'locked',
        label: 'Acima do limite de 2 h',
      });
    }
  }

  const blocksAt = `às ${clock(unlockedUntil)}${capped ? ', no limite de 2 h extras' : ''}`;
  const atEnd = `às ${clock(end)}, no fim da jornada`;
  const notes: Record<typeof request.status, string[]> = {
    aguardando_gestor: [
      `Se aprovar, a estação bloqueia ${blocksAt}.`,
      `Se recusar, bloqueia ${atEnd}.`,
    ],
    aguardando_rh: [
      `Se o RH validar, a estação bloqueia ${blocksAt}.`,
      `Sem a validação, bloqueia ${atEnd}.`,
    ],
    aprovado: [`A estação bloqueia ${blocksAt}.`],
    recusado: [`A estação bloqueia ${atEnd}.`],
    expirado: [`A estação bloqueia ${atEnd}.`],
    cancelado: [`A estação bloqueia ${atEnd}.`],
  };
  return { label, segments, notes: notes[request.status] };
}

/** Hora atual para o marcador "agora", se o pedido é de hoje. */
export function nowMarker(date: string, now: number): string | undefined {
  const local = toLocal(now);
  return local.date === date ? toTime(local.minutes) : undefined;
}

/** Item do histórico pronto para a tela: "sex, 30/10 às 16h15". */
export interface HistoryEntry {
  id: string;
  /** ISO 8601, para o atributo datetime. */
  at: string;
  when: string;
  summary: string;
}

/**
 * Histórico do pedido do mais antigo para o mais novo, a ordem em que ele aconteceu. A API manda
 * do mais novo para o mais antigo (no mesmo instante, o último registrado antes): basta inverter.
 */
export function historyEntries(events: readonly ActivityEvent[]): HistoryEntry[] {
  return [...events].reverse().map((event) => {
    const local = toLocal(event.at);
    return {
      id: event.id,
      at: event.at,
      when: `${formatDate(local.date)} às ${formatClock(local.minutes)}`,
      summary: event.summary,
    };
  });
}

function clock(minutes: number): string {
  return formatClock(minutes % MINUTES_PER_DAY);
}
