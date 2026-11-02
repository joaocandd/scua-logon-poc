// Linha do tempo do dia de um pedido de extensão: jornada, intervalos, hora extra pedida e quando
// a estação vai bloquear. Função pura. O detalhe da caixa de aprovações calcula na tela; a API
// calcula para a página do link do e-mail, que recebe só os trechos e as frases.

import { formatDate } from './date';
import { ExtensionRequest } from './models';
import { afterStart, MAX_OVERTIME_MINUTES, PlannedShift } from './schedule-engine';
import { formatClock, MINUTES_PER_DAY, toTime } from './time';

/** Trecho da linha do tempo. É o formato do WorkdayTimeline do design system ("HH:mm"). */
export interface TimelineSpan {
  start: string;
  end: string;
  kind: 'unlocked' | 'locked' | 'requested';
  label?: string;
}

/** Linha do tempo do dia do pedido, pronta para a tela. */
export interface RequestTimeline {
  /** Nome do grupo para o leitor de tela: "Jornada de Lucas Bittencourt, ter, 03/11". */
  label: string;
  segments: TimelineSpan[];
  /** Quando a estação vai bloquear, em frases: "Se aprovar, a estação bloqueia às 19h...". */
  notes: string[];
}

/**
 * Segmentos da WorkdayTimeline para o dia do pedido. A hora extra aparece como "pedida" enquanto
 * aguarda decisão e como liberada depois de aprovada, sempre limitada a 2 h; o que passa do
 * limite fica bloqueado, com o rótulo "Acima do limite de 2 h".
 */
export function requestTimeline(
  request: ExtensionRequest,
  employeeName: string,
  shift: PlannedShift | null,
): RequestTimeline {
  const label = `Jornada de ${employeeName}, ${formatDate(request.date)}`;
  if (!shift) {
    return { label, segments: [], notes: ['Sem jornada prevista neste dia.'] };
  }

  const end = shift.end;
  const requestedEnd = afterStart(shift.start, request.requestedEnd);
  const unlockedUntil = Math.min(requestedEnd, end + MAX_OVERTIME_MINUTES);
  const capped = requestedEnd > unlockedUntil;

  const segments: TimelineSpan[] = [
    { start: toTime(shift.start), end: toTime(end), kind: 'unlocked', label: 'Jornada' },
    ...shift.breaks.map((b): TimelineSpan => ({
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

function clock(minutes: number): string {
  return formatClock(minutes % MINUTES_PER_DAY);
}
