// SÉRIE HISTÓRICA FICTÍCIA para os relatórios: horas extras aprovadas, minutos de estação
// bloqueada e ausências por dia e por grupo, nos últimos 30 dias. Nada disto é dado real. As horas
// extras de cada colaborador (perfil em /pessoas/:id) saem da mesma conta, dia a dia.
//
// O que vem do que já existe:
// - quem trabalha em cada dia sai do motor de regras (plannedShift): a regra do colaborador, os
//   feriados e as exceções. Fim de semana, feriado e folga não têm jornada, nem números;
// - as horas extras incluem os pedidos aprovados das fixtures (e os que a pessoa aprovar na demo),
//   com a mesma conta do painel "Hoje" (overtimeMinutes, no máximo 2 h por dia);
// - regra em observação não bloqueia (ADR 0012): quem só tem regra em observação não tem minutos
//   bloqueados nem hora extra.
//
// O que é inventado: ausências, minutos bloqueados e horas extras dos dias sem pedido nas
// fixtures. Os sorteios usam uma semente fixa por colaborador e por dia: o mesmo dia dá sempre os
// mesmos números, qualquer que seja a hora em que o app abre. A janela de 30 dias anda com "agora".

import { addDays, toInstant, toLocal } from '../shared/date';
import {
  DailyEmployeeOvertime,
  DailyGroupStats,
  Employee,
  ExtensionRequest,
  Group,
  Holiday,
  ScheduleException,
  WorkSchedule,
} from '../shared/models';
import { overtimeMinutes } from '../shared/request-context';
import { appliesTo, isShift, plannedShift } from '../shared/schedule-engine';

/** Quantos dias, contando hoje, a série cobre no mínimo (o período mais longo dos relatórios). */
export const HISTORY_DAYS = 30;

/**
 * Dias que a API devolve: desde o primeiro dia do mês anterior, para o cartão "Horas extras do mês"
 * do painel Hoje usar a mesma série dos relatórios; nunca menos de 30.
 */
export function historyDaysFor(now: Date): number {
  const today = toLocal(now).date;
  const [year, month] = today.split('-').map(Number);
  const first =
    month === 1 ? `${year - 1}-12-01` : `${year}-${String(month - 1).padStart(2, '0')}-01`;
  const days = Math.round((Date.parse(today) - Date.parse(first)) / 86_400_000) + 1;
  return Math.max(HISTORY_DAYS, days);
}

/** Semente da série. Mudar a semente muda todos os números. */
const SEED = 'scua-logon-poc';

/**
 * Jeito de cada grupo, para os gráficos não saírem iguais: chance de ausência, de hora extra e de
 * ficar diante da estação bloqueada, por colaborador e por dia.
 */
const GROUP_PROFILE: Record<string, { absence: number; overtime: number; blocked: number }> = {
  'grp-financeiro': { absence: 0.04, overtime: 0.08, blocked: 0.25 },
  'grp-comercial': { absence: 0.05, overtime: 0.12, blocked: 0.3 },
  'grp-atendimento': { absence: 0.07, overtime: 0.1, blocked: 0.45 },
  'grp-operacoes': { absence: 0.05, overtime: 0.06, blocked: 0.2 },
  'grp-ti': { absence: 0.03, overtime: 0.07, blocked: 0.2 },
  'grp-rh': { absence: 0.03, overtime: 0.05, blocked: 0.15 },
};
const DEFAULT_PROFILE = { absence: 0.04, overtime: 0.06, blocked: 0.2 };

/** Hora extra inventada: de 30 min a 2 h, de meia em meia hora (limite da CLT, art. 59). */
const OVERTIME_STEPS = [30, 60, 90, 120];

export interface HistoryInput {
  now: Date;
  employees: readonly Employee[];
  groups: readonly Group[];
  schedules: readonly WorkSchedule[];
  holidays: readonly Holiday[];
  exceptions: readonly ScheduleException[];
  requests: readonly ExtensionRequest[];
}

/**
 * Uma linha por grupo e por dia, do mais antigo para hoje. Hoje entra parcial: só as jornadas que
 * já terminaram contam bloqueios e ausências; os pedidos aprovados para hoje contam inteiros, como
 * no painel "Hoje".
 */
export function createHistory(input: HistoryInput, days = HISTORY_DAYS): DailyGroupStats[] {
  const rows: DailyGroupStats[] = [];
  for (const date of datesUntilToday(input.now, days)) {
    for (const group of input.groups) {
      const row: DailyGroupStats = {
        date,
        groupId: group.id,
        overtimeMinutes: 0,
        approvedCount: 0,
        blockedMinutes: 0,
        absentCount: 0,
        scheduledCount: 0,
      };
      for (const employee of input.employees.filter((e) => e.groupId === group.id)) {
        const day = employeeDay(employee, date, input);
        if (!day) continue;
        row.overtimeMinutes += day.overtimeMinutes;
        row.approvedCount += day.approvedCount;
        row.blockedMinutes += day.blockedMinutes;
        if (day.scheduled) row.scheduledCount++;
        if (day.absent) row.absentCount++;
      }
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Horas extras de cada colaborador por dia, do mais antigo para hoje: as mesmas que entram na
 * série por grupo (a soma de um grupo num dia é a do createHistory). Só dias com hora extra.
 */
export function createEmployeeOvertime(
  input: HistoryInput,
  days = HISTORY_DAYS,
): DailyEmployeeOvertime[] {
  const rows: DailyEmployeeOvertime[] = [];
  for (const date of datesUntilToday(input.now, days)) {
    for (const employee of input.employees) {
      const overtimeMinutes = employeeDay(employee, date, input)?.overtimeMinutes ?? 0;
      if (overtimeMinutes > 0) rows.push({ date, employeeId: employee.id, overtimeMinutes });
    }
  }
  return rows;
}

/** Os `days` dias que terminam hoje, do mais antigo para hoje. */
function datesUntilToday(now: Date, days: number): string[] {
  const from = addDays(toLocal(now).date, -(days - 1));
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

/** Números de um colaborador em um dia. */
interface EmployeeDay {
  overtimeMinutes: number;
  approvedCount: number;
  blockedMinutes: number;
  /** A jornada do dia já terminou: entra na base das ausências. */
  scheduled: boolean;
  absent: boolean;
}

/** Nulo quando o colaborador não tem regra ou não tem jornada no dia. */
function employeeDay(employee: Employee, date: string, input: HistoryInput): EmployeeDay | null {
  const schedule = scheduleOf(input.schedules, employee);
  if (!schedule) return null; // sem regra, a estação não é controlada
  const exceptions = input.exceptions.filter((e) => e.employeeId === employee.id);
  const plan = plannedShift(schedule, exceptions, input.holidays, date);
  if (!isShift(plan)) return null;

  // Pedidos aprovados das fixtures (e da demo) contam do jeito do painel "Hoje".
  const approved = input.requests.filter(
    (r) => r.employeeId === employee.id && r.date === date && r.status === 'aprovado',
  );
  const rules = { schedule, exceptions, holidays: input.holidays };
  const realOvertime = approved.reduce((sum, r) => sum + overtimeMinutes(r, rules), 0);
  const day: EmployeeDay = {
    overtimeMinutes: Math.min(realOvertime, 120),
    approvedCount: approved.length,
    blockedMinutes: 0,
    scheduled: false,
    absent: false,
  };

  // A jornada ainda não terminou: ausência e bloqueio do dia ficam para depois.
  const ended = Date.parse(toInstant(date, plan.end)) <= input.now.getTime();
  if (!ended) return day;

  day.scheduled = true;
  const random = seededRandom(`${SEED}|${date}|${employee.id}`);
  const profile = GROUP_PROFILE[employee.groupId] ?? DEFAULT_PROFILE;
  // Quem teve hora extra aprovada no dia veio trabalhar.
  if (approved.length === 0 && random() < profile.absence) {
    day.absent = true;
    return day;
  }
  // Regra em observação não bloqueia nem pede hora extra.
  if (schedule.observationMode) return day;

  if (random() < profile.blocked) day.blockedMinutes += 5 + Math.floor(random() * 36);
  if (approved.length === 0 && random() < profile.overtime) {
    day.overtimeMinutes += OVERTIME_STEPS[Math.floor(random() * OVERTIME_STEPS.length)];
    day.approvedCount++;
  }
  return day;
}

/** A regra ativa vem antes da que está em observação, como na API (MockDb.scheduleFor). */
function scheduleOf(schedules: readonly WorkSchedule[], employee: Employee) {
  const rules = schedules.filter((s) => appliesTo(s, employee));
  return rules.find((s) => !s.observationMode) ?? rules[0];
}

/**
 * Números entre 0 e 1 sempre iguais para o mesmo texto: hash FNV-1a do texto como semente do
 * gerador mulberry32. Determinístico em qualquer máquina.
 */
export function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
