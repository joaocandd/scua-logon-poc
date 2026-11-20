// Dados FICTÍCIOS da lista de estações (/estacoes): o nome da máquina e a última atividade. No
// produto, os dois viriam do agente instalado no Windows. Aqui saem do id do colaborador, da regra
// de jornada e de sorteios com semente fixa: os mesmos a cada abertura do app.

import { addDays, toInstant, toLocal } from '../shared/date';
import {
  Employee,
  Holiday,
  ScheduleException,
  WorkSchedule,
  WorkstationState,
} from '../shared/models';
import { isShift, plannedShift } from '../shared/schedule-engine';
import { seededRandom } from './history';

/** Sigla de cada grupo no nome da máquina. */
const GROUP_PREFIX: Record<string, string> = {
  'grp-financeiro': 'FIN',
  'grp-comercial': 'COM',
  'grp-atendimento': 'ATD',
  'grp-operacoes': 'OPS',
  'grp-ti': 'TI',
  'grp-rh': 'RH',
};

/** "COM-NB-011": sigla do grupo, desktop (PC) ou notebook (NB) e o número do colaborador. */
export function hostnameOf(employee: Employee): string {
  const prefix = GROUP_PREFIX[employee.groupId] ?? 'EST';
  const kind = seededRandom(`maquina|${employee.id}`)() < 0.5 ? 'PC' : 'NB';
  const number = employee.id.replace(/\D/g, '').padStart(3, '0');
  return `${prefix}-${kind}-${number}`;
}

/** Quantos dias para trás a última atividade é procurada. */
const LOOKBACK_DAYS = 7;

/**
 * Última atividade da estação:
 * - liberada (em jornada ou hora extra aprovada): uso de 1 a 9 minutos atrás;
 * - em intervalo, bloqueada ou fora do expediente: o último início de intervalo ou fim de jornada
 *   que já passou, quando a estação bloqueou.
 * Nada nos últimos 7 dias: sem valor.
 */
export function lastActivity(
  schedule: WorkSchedule,
  exceptions: readonly ScheduleException[],
  holidays: readonly Holiday[],
  state: WorkstationState,
  employeeId: string,
  now: Date,
): string | undefined {
  if (state === 'em_jornada' || state === 'he_aprovada') {
    const today = toLocal(now).date;
    const minutesAgo = 1 + Math.floor(seededRandom(`uso|${today}|${employeeId}`)() * 9);
    return new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  }
  const today = toLocal(now).date;
  let latest: number | undefined;
  for (let back = 0; back <= LOOKBACK_DAYS; back++) {
    const date = addDays(today, -back);
    const plan = plannedShift(schedule, exceptions, holidays, date);
    if (!isShift(plan)) continue;
    const moments = [plan.end, ...plan.breaks.map((b) => b.start)]
      .map((minutes) => Date.parse(toInstant(date, minutes)))
      .filter((instant) => instant <= now.getTime());
    if (moments.length > 0) latest = Math.max(latest ?? 0, ...moments);
    if (latest !== undefined && back > 0) break;
  }
  return latest === undefined ? undefined : new Date(latest).toISOString();
}
