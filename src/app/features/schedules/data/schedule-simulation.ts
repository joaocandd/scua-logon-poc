// Simulador "e se?" do editor de regras: como estaria a estação de um colaborador num dia e numa
// hora, com a regra do jeito que está no editor. Quem decide é o schedule-engine; aqui só se
// monta a entrada e a frase. Função pura.

import { formatDate, toInstant } from '../../../shared/date';
import {
  Employee,
  ExtensionRequest,
  Holiday,
  ScheduleException,
  WorkSchedule,
  WorkstationState,
} from '../../../shared/models';
import { evaluateWorkstation } from '../../../shared/schedule-engine';
import { formatClock, toMinutes, toTime } from '../../../shared/time';
import { ScheduleDraft, toSchedule } from './schedule-draft';
import { HoursCheck } from './schedule-validation';

/** Nome da jornada no motivo quando a regra ainda não tem nome: "fora da jornada desta regra". */
const UNNAMED = 'desta regra';

export interface SimulationContext {
  /** A regra do editor, só com os intervalos certos. Nula enquanto o horário não está certo. */
  schedule: WorkSchedule | null;
  /** Quem a regra controla: só essas pessoas aparecem no simulador. */
  employees: readonly Employee[];
  exceptions: readonly ScheduleException[];
  holidays: readonly Holiday[];
  extensions: readonly ExtensionRequest[];
}

export interface SimulationQuery {
  employeeId: string;
  /** "AAAA-MM-DD". */
  date: string;
  /** "HH:mm". */
  time: string;
}

export interface SimulationResult {
  state: WorkstationState;
  /** "Às 18h10 de qui, 12/11, a estação de João estaria bloqueada: fora da jornada Comercial (das 8h às 17h)." */
  sentence: string;
}

/**
 * A regra do editor para o motor: os intervalos com problema ficam de fora, como na linha do
 * tempo. Nula enquanto a jornada não tem início e fim certos.
 */
export function simulationSchedule(draft: ScheduleDraft, check: HoursCheck): WorkSchedule | null {
  if (!check.shift) return null;
  const schedule = toSchedule(draft);
  return {
    ...schedule,
    name: schedule.name || UNNAMED,
    breaks: check.breaks.map((b) => ({
      label: b.label,
      start: toTime(b.start),
      end: toTime(b.end),
    })),
  };
}

/** Estado da estação e a frase. Nulo sem regra, sem a pessoa ou com data ou hora incompleta. */
export function simulate(
  context: SimulationContext,
  query: SimulationQuery,
): SimulationResult | null {
  const employee = context.employees.find((e) => e.id === query.employeeId);
  const minutes = minutesOf(query.time);
  if (
    !context.schedule ||
    !employee ||
    !/^\d{4}-\d{2}-\d{2}$/.test(query.date) ||
    minutes === null
  ) {
    return null;
  }

  const { state, reason } = evaluateWorkstation({
    schedule: context.schedule,
    exceptions: context.exceptions.filter((e) => e.employeeId === employee.id),
    holidays: context.holidays,
    extensions: context.extensions.filter((r) => r.employeeId === employee.id),
    at: toInstant(query.date, minutes),
  });
  const unlocked = state === 'em_jornada' || state === 'he_aprovada';
  // O motivo vem como "Bloqueada: fora da jornada...": a frase usa só o que vem depois.
  const why = reason.slice(reason.indexOf(': ') + 2);
  const at = `${minutes < 120 ? 'À' : 'Às'} ${formatClock(minutes)} de ${formatDate(query.date)}`;
  const firstName = employee.name.split(' ')[0];
  return {
    state,
    sentence: `${at}, a estação de ${firstName} estaria ${unlocked ? 'liberada' : 'bloqueada'}: ${why}`,
  };
}

function minutesOf(time: string): number | null {
  try {
    return toMinutes(time);
  } catch {
    return null;
  }
}
