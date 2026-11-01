// Contexto para decidir um pedido de extensão: o que a caixa de aprovações (fluxo A) mostra em
// cada pedido. Funções puras, com as mesmas regras do schedule-engine: no máximo 2 h extras por
// dia (CLT art. 59) e 11 h de descanso entre jornadas (CLT art. 66).

import { addDays } from '../../../shared/date';
import { ExtensionRequest, Holiday, ScheduleException, WorkSchedule } from '../../../shared/models';
import {
  afterStart,
  isShift,
  MAX_OVERTIME_MINUTES,
  MIN_REST_MINUTES,
  plannedShift,
} from '../../../shared/schedule-engine';
import { formatClock, formatDuration, MINUTES_PER_DAY, toMinutes } from '../../../shared/time';

export type RequestAlertKind = 'limite_diario' | 'interjornada';

/** Alerta para quem decide: o que muda se aprovar. */
export interface RequestAlert {
  kind: RequestAlertKind;
  /** Frase curta, como "Passa de 2 h extras no dia". */
  title: string;
  /** O que acontece se aprovar, como "Se aprovar, a estação libera só até 19h." */
  detail: string;
}

export interface RequestContext {
  /** Horas extras pedidas, em minutos: do fim da jornada até o novo fim. */
  extraMinutes: number;
  /**
   * Até quando a estação fica liberada se o pedido for aprovado: o novo fim, limitado a 2 h
   * extras. Em minutos desde a meia-noite do dia do pedido (passa de 1440 depois da meia-noite).
   */
  unlockedUntil: number;
  /**
   * Horas extras do colaborador aprovadas nos últimos 30 dias até a data do pedido, sem contar
   * este, em minutos. Mostra se a pessoa tem feito hora extra com frequência, sem zerar na virada
   * do mês.
   */
  recentOvertimeMinutes: number;
  alerts: RequestAlert[];
  /** Depois do gestor, o pedido ainda vai para a validação do RH. */
  needsHrValidation: boolean;
}

export interface RequestContextInput {
  request: ExtensionRequest;
  /** Regra de jornada do colaborador. */
  schedule: WorkSchedule;
  /** Exceções do colaborador. */
  exceptions: readonly ScheduleException[];
  holidays: readonly Holiday[];
  /** Pedidos do colaborador. Pode incluir o próprio pedido: ele não conta nas horas recentes. */
  history: readonly ExtensionRequest[];
}

export function requestContext(input: RequestContextInput): RequestContext {
  const { request, schedule } = input;
  const { end, requestedEnd } = spanOf(input, request);
  const extraMinutes = requestedEnd - end;
  const unlockedUntil = Math.min(requestedEnd, end + MAX_OVERTIME_MINUTES);

  const alerts: RequestAlert[] = [];
  if (extraMinutes > MAX_OVERTIME_MINUTES) {
    alerts.push({
      kind: 'limite_diario',
      title: 'Passa de 2 h extras no dia',
      detail: `Pede ${formatDuration(extraMinutes)}. Se aprovar, a estação libera só até ${clock(unlockedUntil)}.`,
    });
  }
  const rest = restConflict(input, unlockedUntil);
  if (rest) {
    alerts.push({
      kind: 'interjornada',
      title: 'Quebra o descanso de 11 h entre jornadas',
      detail: `No dia seguinte, a estação só libera às ${clock(rest.unlocksAt)}, e não às ${clock(rest.scheduledStart)}.`,
    });
  }

  return {
    extraMinutes,
    unlockedUntil,
    recentOvertimeMinutes: recentOvertime(input),
    alerts,
    needsHrValidation: schedule.requiresHrValidation,
  };
}

/**
 * Fim da jornada e novo fim pedido, em minutos desde a meia-noite do dia do pedido. A conta parte
 * do início da jornada daquele dia: na Noturna (22h), um fim às 7h30 é do dia seguinte.
 */
function spanOf(
  input: RequestContextInput,
  request: ExtensionRequest,
): { end: number; requestedEnd: number } {
  const day = plannedShift(input.schedule, input.exceptions, input.holidays, request.date);
  const start = isShift(day) ? day.start : toMinutes(input.schedule.start);
  return {
    end: afterStart(start, request.currentEnd),
    requestedEnd: afterStart(start, request.requestedEnd),
  };
}

/**
 * Se aprovar, o descanso de 11 h passa do início da jornada do dia seguinte? Devolve a que horas a
 * estação libera e a que horas a jornada começaria, em minutos desde a meia-noite do dia do pedido.
 */
function restConflict(
  input: RequestContextInput,
  unlockedUntil: number,
): { unlocksAt: number; scheduledStart: number } | null {
  const { schedule, exceptions, holidays, request } = input;
  const next = plannedShift(schedule, exceptions, holidays, addDays(request.date, 1));
  if (!isShift(next)) return null;
  const scheduledStart = MINUTES_PER_DAY + next.start;
  const unlocksAt = unlockedUntil + MIN_REST_MINUTES;
  return unlocksAt > scheduledStart ? { unlocksAt, scheduledStart } : null;
}

/** Quantos dias, contando o do pedido, entram nas horas extras recentes. */
export const RECENT_OVERTIME_DAYS = 30;

/**
 * Soma das horas extras aprovadas nos últimos 30 dias até a data do pedido. Cada dia conta no
 * máximo 2 h, como na estação.
 */
function recentOvertime(input: RequestContextInput): number {
  const { date } = input.request;
  const from = addDays(date, -(RECENT_OVERTIME_DAYS - 1));
  return input.history
    .filter((r) => r.id !== input.request.id && r.status === 'aprovado')
    .filter((r) => r.date >= from && r.date <= date)
    .reduce((total, r) => {
      const { end, requestedEnd } = spanOf(input, r);
      return total + Math.min(requestedEnd - end, MAX_OVERTIME_MINUTES);
    }, 0);
}

/** Minutos de qualquer dia no relógio: 1800 (6h do dia seguinte) → "6h". */
function clock(minutes: number): string {
  return formatClock(minutes % MINUTES_PER_DAY);
}
