// Gráficos pequenos do painel "Hoje": pedidos de hoje por status e horas extras dos últimos 7 dias.
// Funções puras.

import { ChartDatum, STATUS_INFO } from '../../../design-system';
import { toLocal } from '../../../shared/date';
import {
  DailyGroupStats,
  Employee,
  EXTENSION_REQUEST_STATUSES,
  ExtensionRequest,
} from '../../../shared/models';
import { byDay, inGroup, inPeriod } from '../../reports/data/report-series';

/**
 * Pedidos feitos hoje (pela data de criação, em São Paulo), por status, do grupo escolhido. Todos
 * os status aparecem, mesmo com zero, para o gráfico não mudar de forma ao longo do dia. O rótulo
 * de cada barra é o do StatusBadge: o status nunca fica só na cor.
 */
export function todayRequestsByStatus(
  requests: readonly ExtensionRequest[],
  employeeById: ReadonlyMap<string, Employee>,
  groupId: string | null,
  now: number,
): ChartDatum[] {
  const today = toLocal(now).date;
  const ofToday = requests.filter((r) => {
    const employee = employeeById.get(r.employeeId);
    if (!employee || (groupId && employee.groupId !== groupId)) return false;
    return toLocal(r.createdAt).date === today;
  });
  return EXTENSION_REQUEST_STATUSES.map((status) => ({
    label: STATUS_INFO[status].label,
    value: ofToday.filter((r) => r.status === status).length,
  }));
}

/** Horas extras aprovadas por dia nos últimos 7 dias, do grupo escolhido (série fictícia). */
export function weekOvertime(rows: readonly DailyGroupStats[], groupId: string | null) {
  return byDay(inGroup(inPeriod(rows, 7), groupId), 'overtimeMinutes');
}
