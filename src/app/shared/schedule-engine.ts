// Motor de regras: diz se a estação de um colaborador está liberada num instante, e por quê.
// Função pura: mesma entrada, mesmo resultado. Serve à API simulada, ao painel "Hoje" e ao
// simulador "e se?" do editor de regras.

import { addDays, toLocal, weekdayOf } from './date';
import {
  Employee,
  ExtensionRequest,
  Holiday,
  ScheduleException,
  WorkSchedule,
  WorkstationStatus,
} from './models';
import { formatClock, formatRange, MINUTES_PER_DAY, toMinutes } from './time';

/** Limite de horas extras por dia (CLT art. 59). */
export const MAX_OVERTIME_MINUTES = 2 * 60;
/** Descanso mínimo entre o fim de uma jornada e o início da seguinte (CLT art. 66). */
export const MIN_REST_MINUTES = 11 * 60;

export interface WorkstationInput {
  /** Regra de jornada do colaborador. */
  schedule: WorkSchedule;
  /** Exceções do colaborador. As de outras pessoas não podem entrar aqui. */
  exceptions: readonly ScheduleException[];
  holidays: readonly Holiday[];
  /** Pedidos de extensão do colaborador. Só os aprovados contam. */
  extensions: readonly ExtensionRequest[];
  /** Instante avaliado. A data e a hora são lidas no fuso America/Sao_Paulo. */
  at: Date | string | number;
}

/** A regra vale para o colaborador: o grupo dele está na regra e ele não foi excluído. */
export function appliesTo(schedule: WorkSchedule, employee: Employee): boolean {
  const { groupIds, excludedEmployeeIds } = schedule.assignment;
  return groupIds.includes(employee.groupId) && !excludedEmployeeIds.includes(employee.id);
}

/**
 * Estado da estação e o motivo em português. Ordem das regras:
 * 1. Exceção do dia, depois feriado, depois os dias da semana da regra.
 * 2. A jornada pertence ao dia em que começa: das 22h de segunda às 6h de terça é a de segunda.
 * 3. A hora extra aprovada libera até o novo fim, no máximo 2 h depois do fim da jornada.
 * 4. A estação só libera 11 h depois do fim (com hora extra) da jornada anterior.
 */
export function evaluateWorkstation(input: WorkstationInput): WorkstationStatus {
  const { date, minutes: now } = toLocal(input.at);
  // Anteontem e ontem entram por causa da jornada que atravessa a meia-noite e da interjornada.
  const days = [-2, -1, 0].map((n) => planDay(input, addDays(date, n), n * MINUTES_PER_DAY));
  const today = days[2];
  const shifts = days.filter(isShift);

  const current = shifts.find((s) => s.start <= now && now < s.overtimeEnd);
  if (current) {
    const previous = shifts[shifts.indexOf(current) - 1];
    const restEnd = previous ? previous.overtimeEnd + MIN_REST_MINUTES : -Infinity;
    if (now < restEnd) {
      const unlock = restEnd < current.overtimeEnd ? ` Libera às ${clockOf(restEnd)}.` : '';
      return blocked(`descanso de 11 h entre jornadas.${unlock}`);
    }
    const pause = current.breaks.find((b) => b.start <= now && now < b.end);
    if (pause) {
      return {
        state: 'intervalo',
        reason: `Bloqueada: intervalo da ${current.name} (${rangeOf(pause)}).`,
      };
    }
    if (now >= current.end) {
      return {
        state: 'he_aprovada',
        reason: `Liberada: hora extra aprovada até ${clockOf(current.overtimeEnd)}.`,
      };
    }
    return { state: 'em_jornada', reason: `Liberada: ${current.name} (${rangeOf(current)}).` };
  }

  const overLimit = shifts.find((s) => s.overtimeEnd <= now && now < s.approvedEnd);
  if (overLimit) {
    return blocked(`limite de 2 h extras por dia (até ${clockOf(overLimit.overtimeEnd)}).`);
  }
  if (!isShift(today)) {
    return { state: 'fora_expediente', reason: `Fora do expediente: ${today.off}.` };
  }
  return blocked(`fora da ${today.name} (${rangeOf(today)}).`);
}

/** Trecho em minutos contados da meia-noite do dia avaliado. Ontem fica negativo. */
interface Span {
  start: number;
  end: number;
}

/** Jornada de um dia. */
interface Shift extends Span {
  /** "jornada Comercial", ou "jornada especial" quando vem de uma exceção. */
  name: string;
  breaks: Span[];
  /** Maior fim aprovado em pedidos de extensão, mesmo além do limite. Sem pedido, é o `end`. */
  approvedEnd: number;
  /** Até quando a estação fica liberada: o fim aprovado, limitado a 2 h depois do `end`. */
  overtimeEnd: number;
}

/** Dia sem jornada, com o motivo: "feriado (Finados)". */
interface DayOff {
  off: string;
}

function isShift(plan: Shift | DayOff): plan is Shift {
  return !('off' in plan);
}

/** Jornada do dia `date`. `offset` são os minutos entre a meia-noite desse dia e a do dia avaliado. */
function planDay(input: WorkstationInput, date: string, offset: number): Shift | DayOff {
  const { schedule } = input;
  const exception = input.exceptions.find((e) => e.date === date);
  if (exception?.kind === 'folga') return { off: `folga (${exception.reason})` };

  if (!exception) {
    const holiday = input.holidays.find((h) => h.date === date);
    if (holiday) return { off: `feriado (${holiday.name})` };
    if (!schedule.weekdays.includes(weekdayOf(date))) {
      return { off: `dia sem jornada ${schedule.name}` };
    }
  }

  const hours = exception ?? schedule;
  const start = toMinutes(hours.start);
  const end = afterStart(start, hours.end);
  const approvedEnd = Math.max(
    end,
    ...input.extensions
      .filter((e) => e.status === 'aprovado' && e.date === date)
      .map((e) => afterStart(start, e.requestedEnd)),
  );
  return {
    name: exception ? 'jornada especial' : `jornada ${schedule.name}`,
    start: offset + start,
    end: offset + end,
    breaks: hours.breaks.map((b) => ({
      start: offset + afterStart(start, b.start),
      end: offset + afterStart(start, b.end),
    })),
    approvedEnd: offset + approvedEnd,
    overtimeEnd: offset + Math.min(approvedEnd, end + MAX_OVERTIME_MINUTES),
  };
}

/** Horário que não vem depois do início é do dia seguinte: na jornada das 22h, 6h vira 30h. */
function afterStart(start: number, time: string): number {
  const minutes = toMinutes(time);
  return minutes <= start ? minutes + MINUTES_PER_DAY : minutes;
}

function blocked(why: string): WorkstationStatus {
  return { state: 'bloqueada', reason: `Bloqueada: ${why}` };
}

/** Minutos de qualquer dia → minutos no relógio: 1800 (6h de amanhã) → 360; -120 → 1320. */
function onClock(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function clockOf(minutes: number): string {
  return formatClock(onClock(minutes));
}

function rangeOf({ start, end }: Span): string {
  return formatRange(onClock(start), onClock(end));
}
