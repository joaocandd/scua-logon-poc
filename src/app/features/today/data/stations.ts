// Estações do painel "Hoje": as linhas da lista e os números dos contadores. Funções puras.

import {
  Employee,
  Group,
  Workstation,
  WORKSTATION_STATES,
  WorkstationState,
} from '../../../shared/models';

/**
 * Lista que o painel abre: um estado da estação (um contador) ou as estações liberadas sem
 * aprovação (o alerta da regra em observação). Vai na URL como `?estado=`.
 */
export type StationFilter = WorkstationState | 'sem_aprovacao';

export const STATION_FILTERS: readonly StationFilter[] = [...WORKSTATION_STATES, 'sem_aprovacao'];

/** Uma estação na lista do painel. */
export interface StationRow {
  employeeId: string;
  name: string;
  groupId: string;
  groupName: string;
  /** Lista em que a estação entra. */
  filter: StationFilter;
  /** Badge da linha: o estado, ou "Em observação" na estação liberada sem aprovação. */
  status: WorkstationState | 'em_observacao';
  /** Motivo em português, do schedule-engine. */
  reason: string;
}

/** Estados em que a estação fica liberada. */
const UNLOCKED: readonly WorkstationState[] = ['em_jornada', 'he_aprovada'];

/**
 * Liberada sem aprovação: a regra da pessoa está em observação e bloquearia a estação agora (fora
 * da jornada, no intervalo ou fora do expediente), mas não bloqueia (ADR 0012).
 */
export function isUnapproved(workstation: Workstation): boolean {
  return !!workstation.observed && !UNLOCKED.includes(workstation.state);
}

/**
 * Linhas da lista, em ordem alfabética. A estação liberada sem aprovação sai do estado que a regra
 * daria e entra na lista própria: o painel mostra o estado real da estação.
 */
export function stationRows(
  workstations: readonly Workstation[],
  employeeById: ReadonlyMap<string, Employee>,
  groupById: ReadonlyMap<string, Group>,
): StationRow[] {
  return workstations
    .flatMap((workstation) => {
      const employee = employeeById.get(workstation.employeeId);
      if (!employee) return [];
      const unapproved = isUnapproved(workstation);
      const row: StationRow = {
        employeeId: employee.id,
        name: employee.name,
        groupId: employee.groupId,
        groupName: groupById.get(employee.groupId)?.name ?? '',
        filter: unapproved ? 'sem_aprovacao' : workstation.state,
        status: unapproved ? 'em_observacao' : workstation.state,
        reason: unapproved ? unapprovedReason(workstation.reason) : workstation.reason,
      };
      return [row];
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Só as estações do grupo. Nulo: todos os grupos. */
export function inGroup<T extends { groupId: string }>(rows: readonly T[], groupId: string | null) {
  return groupId ? rows.filter((row) => row.groupId === groupId) : [...rows];
}

/** Quantas estações em cada lista. */
export function countByFilter(rows: readonly StationRow[]): Record<StationFilter, number> {
  const counts = Object.fromEntries(STATION_FILTERS.map((f) => [f, 0])) as Record<
    StationFilter,
    number
  >;
  for (const row of rows) counts[row.filter]++;
  return counts;
}

/** `?estado=` da URL: uma lista conhecida, ou nulo (nenhuma lista aberta). */
export function parseFilter(value: string | null): StationFilter | null {
  return STATION_FILTERS.find((filter) => filter === value) ?? null;
}

const NONE: Record<StationFilter, string> = {
  em_jornada: 'em jornada',
  intervalo: 'em intervalo',
  he_aprovada: 'com hora extra aprovada',
  bloqueada: 'bloqueada',
  fora_expediente: 'fora do expediente',
  sem_aprovacao: 'liberada sem aprovação',
};

/** Lista aberta sem ninguém: "Nenhuma estação em intervalo agora em TI." */
export function emptyListText(filter: StationFilter, groupName: string | null): string {
  return `Nenhuma estação ${NONE[filter]} agora${groupName ? ` em ${groupName}` : ''}.`;
}

/**
 * "Bloqueada: fora da jornada Noturna (das 22h às 6h)." → "Liberada sem aprovação. Pela regra em
 * observação, estaria bloqueada: fora da jornada Noturna (das 22h às 6h)."
 */
function unapprovedReason(reason: string): string {
  const why = reason.slice(reason.indexOf(': ') + 2);
  return `Liberada sem aprovação. Pela regra em observação, estaria bloqueada: ${why}`;
}
