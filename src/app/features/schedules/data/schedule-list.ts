// Linhas da lista de regras de jornada (/regras). Função pura: recebe as regras, os
// colaboradores e os grupos e devolve o que a tabela mostra.

import { Employee, Group, ScheduleStatus, WorkSchedule } from '../../../shared/models';
import { appliesTo } from '../../../shared/schedule-engine';
import { capitalize } from '../../../shared/text';
import { formatRange, toMinutes } from '../../../shared/time';
import { formatWeekdays } from './weekdays';

export interface ScheduleRow {
  id: string;
  name: string;
  /** "Das 8h às 17h". */
  hours: string;
  /** "Seg a sex". */
  days: string;
  /** Nomes dos grupos, na ordem da regra. Vazio quando a regra não tem grupo. */
  groups: string[];
  /** Quantos colaboradores a regra controla: os dos grupos, menos os excluídos. */
  employeeCount: number;
  status: ScheduleStatus;
}

/** Uma linha por regra, em ordem alfabética. */
export function scheduleRows(
  schedules: readonly WorkSchedule[],
  employees: readonly Employee[],
  groupById: ReadonlyMap<string, Group>,
): ScheduleRow[] {
  return [...schedules]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      hours: capitalize(formatRange(toMinutes(schedule.start), toMinutes(schedule.end))),
      days: formatWeekdays(schedule.weekdays),
      groups: schedule.assignment.groupIds.flatMap((id) => groupById.get(id)?.name ?? []),
      employeeCount: employees.filter((employee) => appliesTo(schedule, employee)).length,
      status: schedule.observationMode ? 'em_observacao' : 'ativa',
    }));
}
