// Pessoas › Grupos (/pessoas/grupos): um cartão por grupo. Função pura.

import { Employee, Group, WorkSchedule } from '../../../shared/models';

/** Um grupo no cartão. */
export interface GroupCard {
  id: string;
  name: string;
  /** Gestor da área: o primeiro aprovador do grupo. */
  manager: Pick<Employee, 'id' | 'name'> | null;
  /** Os outros aprovadores, como a diretora. */
  approvers: Pick<Employee, 'id' | 'name'>[];
  employeeCount: number;
  /** Regras de jornada que valem para o grupo (a ativa antes da que está em observação). */
  schedules: { id: string; name: string; observation: boolean }[];
}

/** Cartões em ordem alfabética do nome do grupo. */
export function groupCards(
  groups: readonly Group[],
  employees: readonly Employee[],
  schedules: readonly WorkSchedule[],
): GroupCard[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const person = (id: string) => {
    const employee = byId.get(id);
    return employee ? { id: employee.id, name: employee.name } : null;
  };
  return [...groups]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((group) => {
      const [managerId, ...others] = group.approverIds;
      return {
        id: group.id,
        name: group.name,
        manager: managerId ? person(managerId) : null,
        approvers: others.map(person).filter((p) => p !== null),
        employeeCount: employees.filter((e) => e.groupId === group.id).length,
        schedules: schedules
          .filter((s) => s.assignment.groupIds.includes(group.id))
          .sort((a, b) => Number(!!a.observationMode) - Number(!!b.observationMode))
          .map((s) => ({ id: s.id, name: s.name, observation: !!s.observationMode })),
      };
    });
}
