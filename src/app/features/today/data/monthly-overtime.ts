// Horas extras do mês no painel "Hoje": o mês atual até hoje ao lado do mês anterior inteiro, sem
// percentual (comparar mês parcial com mês cheio engana). Funções puras.

import {
  Employee,
  ExtensionRequest,
  Holiday,
  ScheduleException,
  WorkSchedule,
} from '../../../shared/models';
import { overtimeMinutes } from '../../../shared/request-context';
import { appliesTo } from '../../../shared/schedule-engine';
import { capitalize } from '../../../shared/text';

/** Horas extras aprovadas de um mês. */
export interface MonthOvertime {
  /** "Novembro até hoje", "Outubro inteiro". */
  label: string;
  /** "novembro". */
  monthName: string;
  /** Soma das horas extras aprovadas, em minutos (cada dia conta no máximo 2 h). */
  minutes: number;
  requestCount: number;
}

export interface MonthlyOvertime {
  current: MonthOvertime;
  previous: MonthOvertime;
}

export interface MonthlyOvertimeInput {
  requests: readonly ExtensionRequest[];
  /** Colaboradores do grupo escolhido: só os pedidos deles contam. */
  employees: readonly Employee[];
  schedules: readonly WorkSchedule[];
  exceptions: readonly ScheduleException[];
  holidays: readonly Holiday[];
  /** Hoje, "AAAA-MM-DD" em São Paulo. */
  today: string;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * Horas extras aprovadas no mês de hoje e no anterior. O mês é o do dia da jornada (`date`), que é
 * quando a hora extra é feita e entra na folha. Pedido já aprovado para um dia mais à frente do mês
 * conta: é o total aprovado até hoje.
 */
export function monthlyOvertime(input: MonthlyOvertimeInput): MonthlyOvertime {
  const [year, month] = input.today.split('-').map(Number);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return {
    current: monthOf(input, year, month, 'até hoje'),
    previous: monthOf(input, previous.year, previous.month, 'inteiro'),
  };
}

/** Custo estimado em reais: horas aprovadas × custo médio da hora extra. */
export function estimatedCost(minutes: number, hourlyCost: number): number {
  return (minutes / 60) * hourlyCost;
}

function monthOf(
  input: MonthlyOvertimeInput,
  year: number,
  month: number,
  period: string,
): MonthOvertime {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const byId = new Map(input.employees.map((e) => [e.id, e]));
  let minutes = 0;
  let requestCount = 0;
  for (const request of input.requests) {
    const employee = byId.get(request.employeeId);
    if (request.status !== 'aprovado' || !employee || !request.date.startsWith(prefix)) continue;
    // Sem regra de jornada, a estação não é controlada e não há hora extra para contar.
    const schedule = scheduleOf(input.schedules, employee);
    if (!schedule) continue;
    minutes += overtimeMinutes(request, {
      schedule,
      exceptions: input.exceptions.filter((e) => e.employeeId === employee.id),
      holidays: input.holidays,
    });
    requestCount++;
  }
  const monthName = MONTHS[month - 1];
  return { label: `${capitalize(monthName)} ${period}`, monthName, minutes, requestCount };
}

/** A regra ativa vem antes da que está em observação, como na API (MockDb.scheduleFor). */
function scheduleOf(schedules: readonly WorkSchedule[], employee: Employee) {
  const rules = schedules.filter((s) => appliesTo(s, employee));
  return rules.find((s) => !s.observationMode) ?? rules[0];
}
