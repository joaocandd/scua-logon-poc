// Estações (/estacoes): as linhas da lista, a busca e os filtros. Funções puras.

import { addDays, formatDate, toLocal } from '../../../shared/date';
import {
  Employee,
  Group,
  WorkSchedule,
  WorkstationDetail,
  WorkstationState,
} from '../../../shared/models';
import { normalize } from '../../../shared/text';
import { formatClock } from '../../../shared/time';
import { isUnapproved, StationFilter } from '../../today/data/stations';

/** Uma estação na lista. */
export interface WorkstationRow {
  hostname: string;
  employeeId: string;
  employeeName: string;
  groupId: string;
  groupName: string;
  /** Filtro de estado em que a estação entra (o mesmo do painel "Hoje"). */
  filter: StationFilter;
  /** Badge: o estado, ou "Em observação" na estação liberada sem aprovação. */
  status: WorkstationState | 'em_observacao';
  /** Motivo em português, do motor de regras. */
  reason: string;
  scheduleId: string;
  scheduleName: string;
  lastActivityAt: string | null;
}

/** Linhas em ordem alfabética do nome da máquina. Estação sem colaborador nas fixtures fica de fora. */
export function workstationRows(
  workstations: readonly WorkstationDetail[],
  employeeById: ReadonlyMap<string, Employee>,
  groupById: ReadonlyMap<string, Group>,
  schedules: readonly WorkSchedule[],
): WorkstationRow[] {
  const scheduleName = new Map(schedules.map((s) => [s.id, s.name]));
  return workstations
    .flatMap((station) => {
      const employee = employeeById.get(station.employeeId);
      if (!employee) return [];
      const unapproved = isUnapproved(station);
      const row: WorkstationRow = {
        hostname: station.hostname,
        employeeId: employee.id,
        employeeName: employee.name,
        groupId: employee.groupId,
        groupName: groupById.get(employee.groupId)?.name ?? '',
        filter: unapproved ? 'sem_aprovacao' : station.state,
        status: unapproved ? 'em_observacao' : station.state,
        reason: unapproved
          ? 'Liberada sem aprovação: a regra está em observação e ainda não bloqueia.'
          : station.reason,
        scheduleId: station.scheduleId,
        scheduleName: scheduleName.get(station.scheduleId) ?? '',
        lastActivityAt: station.lastActivityAt ?? null,
      };
      return [row];
    })
    .sort((a, b) => a.hostname.localeCompare(b.hostname, 'pt-BR'));
}

export interface WorkstationFilters {
  /** Texto da busca: nome do colaborador ou da máquina, sem acento e sem maiúscula. */
  search: string;
  state: StationFilter | null;
  groupId: string | null;
}

export function filterWorkstations(
  rows: readonly WorkstationRow[],
  { search, state, groupId }: WorkstationFilters,
): WorkstationRow[] {
  const term = normalize(search);
  return rows.filter(
    (row) =>
      (!state || row.filter === state) &&
      (!groupId || row.groupId === groupId) &&
      (!term ||
        normalize(row.employeeName).includes(term) ||
        normalize(row.hostname).includes(term)),
  );
}

/** "Agora mesmo", "há 5 min", "hoje às 17h", "ontem às 22h", "seg, 16/11 às 17h". */
export function lastActivityLabel(instant: string | null, now: number): string {
  if (!instant) return 'Sem atividade nos últimos 7 dias';
  const minutes = Math.floor((now - Date.parse(instant)) / 60_000);
  if (minutes < 1) return 'Agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const local = toLocal(instant);
  const today = toLocal(now).date;
  const clock = formatClock(local.minutes);
  if (local.date === today) return `hoje às ${clock}`;
  if (local.date === addDays(today, -1)) return `ontem às ${clock}`;
  return `${formatDate(local.date)} às ${clock}`;
}

/** "1 estação", "12 estações". */
export function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'estação' : 'estações'}`;
}
