// Perfil do colaborador (/pessoas/:id): a jornada de hoje, as horas extras dos últimos 30 dias, os
// pedidos recentes e os últimos eventos da auditoria. Funções puras.

import { ChartDatum, TimelineSegment } from '../../../design-system';
import { addDays, formatDate, toLocal } from '../../../shared/date';
import {
  ActivityEvent,
  DailyEmployeeOvertime,
  ExtensionRequest,
  ExtensionRequestStatus,
  Holiday,
  ScheduleException,
  WorkSchedule,
} from '../../../shared/models';
import {
  afterStart,
  isShift,
  MAX_OVERTIME_MINUTES,
  plannedShift,
} from '../../../shared/schedule-engine';
import { capitalize } from '../../../shared/text';
import {
  formatClock,
  formatDuration,
  formatRange,
  MINUTES_PER_DAY,
  toTime,
} from '../../../shared/time';

/** Quantos dias o gráfico de horas extras mostra, contando hoje. */
export const OVERTIME_DAYS = 30;
/** Quantos pedidos e eventos o perfil mostra. */
export const RECENT_LIMIT = 5;

/** "2019-03-04" → "04/03/2019". */
export function formatFullDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export interface TodayTimeline {
  /** Nome do grupo para o leitor de tela: "Jornada de Ana Ribeiro hoje, qui, 12/11". */
  label: string;
  segments: TimelineSegment[];
  /** "Jornada Comercial, das 8h às 17h." ou "Sem jornada hoje: feriado (Finados)." */
  summary: string;
}

/**
 * Jornada de hoje na WorkdayTimeline: a jornada, os intervalos e a hora extra de hoje (aprovada,
 * até o limite de 2 h, ou pedida e aguardando). Sem regra, nula: a estação não é controlada.
 */
export function todayTimeline(
  name: string,
  schedule: WorkSchedule | undefined,
  exceptions: readonly ScheduleException[],
  holidays: readonly Holiday[],
  requests: readonly ExtensionRequest[],
  now: number,
): TodayTimeline | null {
  if (!schedule) return null;
  const today = toLocal(now).date;
  const label = `Jornada de ${name} hoje, ${formatDate(today)}`;
  const plan = plannedShift(schedule, exceptions, holidays, today);
  if (!isShift(plan)) return { label, segments: [], summary: `Sem jornada hoje: ${plan.off}.` };

  const segments: TimelineSegment[] = [
    { start: toTime(plan.start), end: toTime(plan.end), kind: 'unlocked', label: 'Jornada' },
    ...plan.breaks.map((b): TimelineSegment => ({
      start: toTime(b.start),
      end: toTime(b.end),
      kind: 'locked',
      label: b.label,
    })),
  ];
  const limit = plan.end + MAX_OVERTIME_MINUTES;
  const endOf = (status: ExtensionRequestStatus) =>
    Math.max(
      plan.end,
      ...requests
        .filter((r) => r.date === today && r.status === status)
        .map((r) => Math.min(afterStart(plan.start, r.requestedEnd), limit)),
    );
  const approvedEnd = endOf('aprovado');
  const pendingEnd = Math.max(endOf('aguardando_gestor'), endOf('aguardando_rh'));
  if (pendingEnd > approvedEnd) {
    segments.push({
      start: toTime(approvedEnd),
      end: toTime(pendingEnd),
      kind: 'requested',
      label: 'Hora extra pedida',
    });
  }
  if (approvedEnd > plan.end) {
    segments.push({
      start: toTime(plan.end),
      end: toTime(approvedEnd),
      kind: 'unlocked',
      label: 'Hora extra aprovada',
    });
  }

  const clock = (minutes: number) => minutes % MINUTES_PER_DAY;
  const hours = formatRange(clock(plan.start), clock(plan.end));
  const extra =
    approvedEnd > plan.end
      ? `, com hora extra aprovada até ${formatClock(clock(approvedEnd))}`
      : '';
  return { label, segments, summary: `${capitalize(plan.name)}, ${hours}${extra}.` };
}

/**
 * Uma barra por dia dos últimos 30, com zero nos dias sem hora extra: "18/11" no eixo e
 * "qua, 18/11" no tooltip e na tabela. Hoje ganha "(até agora)", como nos relatórios.
 */
export function overtimeByDay(
  rows: readonly DailyEmployeeOvertime[],
  employeeId: string,
  now: number,
): ChartDatum[] {
  const today = toLocal(now).date;
  const minutes = new Map<string, number>();
  for (const row of rows) {
    if (row.employeeId !== employeeId) continue;
    minutes.set(row.date, (minutes.get(row.date) ?? 0) + row.overtimeMinutes);
  }
  return Array.from({ length: OVERTIME_DAYS }, (_, i) => {
    const date = addDays(today, i - (OVERTIME_DAYS - 1));
    const [, month, day] = date.split('-');
    return {
      label: `${day}/${month}`,
      longLabel: `${formatDate(date)}${date === today ? ' (até agora)' : ''}`,
      value: Math.round(((minutes.get(date) ?? 0) / 60) * 10) / 10,
    };
  });
}

/** Total do gráfico, em minutos. */
export function overtimeTotal(rows: readonly DailyEmployeeOvertime[], employeeId: string): number {
  return rows
    .filter((r) => r.employeeId === employeeId)
    .reduce((sum, r) => sum + r.overtimeMinutes, 0);
}

/** Pedido de extensão na lista do perfil. */
export interface RecentRequest {
  id: string;
  /** "qui, 12/11". */
  day: string;
  /** "Até 19h (+2h)". */
  until: string;
  status: ExtensionRequestStatus;
}

/** Os pedidos mais novos primeiro (pelo dia da jornada e, no mesmo dia, pela hora do pedido). */
export function recentRequests(
  requests: readonly ExtensionRequest[],
  employeeId: string,
  limit = RECENT_LIMIT,
): RecentRequest[] {
  return requests
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((r) => {
      const end = afterStart(0, r.currentEnd);
      const requested = afterStart(end, r.requestedEnd);
      return {
        id: r.id,
        day: formatDate(r.date),
        until: `Até ${formatClock(requested % MINUTES_PER_DAY)} (+${formatDuration(requested - end)})`,
        status: r.status,
      };
    });
}

/** Evento da auditoria no perfil: "qui, 12/11 às 16h15". */
export interface RecentEvent {
  id: string;
  /** ISO 8601, para o atributo datetime. */
  at: string;
  when: string;
  summary: string;
}

/**
 * Últimos eventos em que a pessoa fez algo ou foi afetada, do mais novo para o mais antigo (a
 * ordem da API). O mesmo critério do filtro "Pessoa" da auditoria.
 */
export function recentEvents(
  events: readonly ActivityEvent[],
  employeeId: string,
  limit = RECENT_LIMIT,
): RecentEvent[] {
  return events
    .filter((e) => e.actorId === employeeId || e.employeeId === employeeId)
    .slice(0, limit)
    .map((event) => {
      const local = toLocal(event.at);
      return {
        id: event.id,
        at: event.at,
        when: `${formatDate(local.date)} às ${formatClock(local.minutes)}`,
        summary: event.summary,
      };
    });
}
