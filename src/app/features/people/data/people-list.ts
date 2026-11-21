// Pessoas (/pessoas): as linhas da lista de colaboradores, a busca, os filtros e a ordem. Funções
// puras. O estado da estação vem de /api/estacoes (motor de regras), como na lista de estações.

import { formatNumber } from '../../../design-system';
import {
  DailyEmployeeOvertime,
  Employee,
  Group,
  WorkSchedule,
  WorkstationDetail,
} from '../../../shared/models';
import { appliesTo } from '../../../shared/schedule-engine';
import { normalize } from '../../../shared/text';
import { StationFilter } from '../../today/data/stations';
import { WorkstationRow, workstationRows } from '../../workstations/data/workstation-list';

/** Um colaborador na lista. */
export interface PersonRow {
  id: string;
  name: string;
  /** Iniciais para o círculo: "Ana Ribeiro" → "AR". */
  initials: string;
  registration: string;
  jobTitle: string;
  groupId: string;
  groupName: string;
  /** Regra de jornada que vale para a pessoa. Nula: a estação não é controlada. */
  scheduleId: string | null;
  scheduleName: string;
  /** Estação agora, do motor de regras. Nula sem regra de jornada. */
  station: Pick<WorkstationRow, 'filter' | 'status' | 'reason' | 'hostname'> | null;
  /** Horas extras aprovadas nos últimos 30 dias, em minutos. */
  overtimeMinutes: number;
}

export interface PeopleSources {
  employees: readonly Employee[];
  groupById: ReadonlyMap<string, Group>;
  schedules: readonly WorkSchedule[];
  workstations: readonly WorkstationDetail[];
  overtime: readonly DailyEmployeeOvertime[];
}

/** Linhas em ordem alfabética do nome. */
export function personRows(sources: PeopleSources): PersonRow[] {
  const employeeById = new Map(sources.employees.map((e) => [e.id, e]));
  const stations = new Map(
    workstationRows(sources.workstations, employeeById, sources.groupById, sources.schedules).map(
      (row) => [row.employeeId, row],
    ),
  );
  const overtime = new Map<string, number>();
  for (const row of sources.overtime) {
    overtime.set(row.employeeId, (overtime.get(row.employeeId) ?? 0) + row.overtimeMinutes);
  }
  return sources.employees
    .map((employee): PersonRow => {
      const station = stations.get(employee.id);
      const schedule = station
        ? sources.schedules.find((s) => s.id === station.scheduleId)
        : scheduleOf(sources.schedules, employee);
      return {
        id: employee.id,
        name: employee.name,
        initials: initialsOf(employee.name),
        registration: employee.registration ?? '',
        jobTitle: employee.jobTitle,
        groupId: employee.groupId,
        groupName: sources.groupById.get(employee.groupId)?.name ?? '',
        scheduleId: schedule?.id ?? null,
        scheduleName: schedule?.name ?? '',
        station: station
          ? {
              filter: station.filter,
              status: station.status,
              reason: station.reason,
              hostname: station.hostname,
            }
          : null,
        overtimeMinutes: overtime.get(employee.id) ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** A regra ativa vem antes da que está em observação, como na API. */
function scheduleOf(schedules: readonly WorkSchedule[], employee: Employee) {
  const rules = schedules.filter((s) => appliesTo(s, employee));
  return rules.find((s) => !s.observationMode) ?? rules[0];
}

/** "Ana Ribeiro" → "AR"; "João Pedro Antunes" → "JA"; "Ana" → "A". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words.at(-1)!.charAt(0) : '';
  return (first + last).toUpperCase();
}

/** Ordem por nome. Vai na URL como `?ordem=desc`; sem nada, de A a Z. */
export type NameOrder = 'asc' | 'desc';

export function parseOrder(value: string | null): NameOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

export interface PeopleFilters {
  /** Nome ou matrícula, sem acento e sem maiúscula. */
  search: string;
  groupId: string | null;
  scheduleId: string | null;
  state: StationFilter | null;
  order: NameOrder;
}

export function filterPeople(
  rows: readonly PersonRow[],
  { search, groupId, scheduleId, state, order }: PeopleFilters,
): PersonRow[] {
  const term = normalize(search);
  const filtered = rows.filter(
    (row) =>
      (!groupId || row.groupId === groupId) &&
      (!scheduleId || row.scheduleId === scheduleId) &&
      (!state || row.station?.filter === state) &&
      (!term || normalize(row.name).includes(term) || row.registration.includes(term)),
  );
  return order === 'desc' ? filtered.reverse() : filtered;
}

/** "1 colaborador", "40 colaboradores". */
export function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'colaborador' : 'colaboradores'}`;
}

/** Minutos em horas, como nos relatórios: 0 → "0 h"; 150 → "2,5 h". */
export function hoursLabel(minutes: number): string {
  return `${formatNumber(Math.round((minutes / 60) * 10) / 10)} h`;
}
