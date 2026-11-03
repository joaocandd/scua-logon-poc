// A quem a regra se aplica: os grupos, quem fica de fora, a prévia "Esta regra vai valer para 37
// colaboradores de 3 grupos" e o conflito com outra regra ativa. Funções puras; quem vale para
// cada regra sai do appliesTo do schedule-engine.

import { Employee, Group, WorkSchedule } from '../../../shared/models';
import { appliesTo } from '../../../shared/schedule-engine';
import { RuleProblem } from './schedule-validation';

/** Grupo na lista da seção, com as pessoas e a outra regra ativa que já vale para ele. */
export interface GroupOption {
  group: Group;
  /** Em ordem alfabética. */
  employees: Employee[];
  /** Nome da outra regra ativa que já tem o grupo, como "Comercial". */
  otherRule: string | null;
}

export interface AssignmentPreview {
  /** Quem a regra controla: os dos grupos, menos os excluídos. Em ordem alfabética. */
  covered: Employee[];
  /** Quem está num grupo da regra, mas foi excluído. */
  excluded: Employee[];
  /** "Esta regra vai valer para 37 colaboradores de 3 grupos." */
  headline: string;
}

/** Os grupos em ordem alfabética, com as pessoas de cada um. */
export function groupOptions(
  groups: readonly Group[],
  employees: readonly Employee[],
  others: readonly WorkSchedule[],
): GroupOption[] {
  return [...groups].sort(byName).map((group) => ({
    group,
    employees: employees.filter((e) => e.groupId === group.id).sort(byName),
    otherRule:
      others.find((s) => !s.observationMode && s.assignment.groupIds.includes(group.id))?.name ??
      null,
  }));
}

export function assignmentPreview(
  schedule: WorkSchedule,
  employees: readonly Employee[],
): AssignmentPreview {
  const { groupIds, excludedEmployeeIds } = schedule.assignment;
  const covered = employees.filter((e) => appliesTo(schedule, e)).sort(byName);
  const excluded = employees
    .filter((e) => groupIds.includes(e.groupId) && excludedEmployeeIds.includes(e.id))
    .sort(byName);

  let headline: string;
  if (groupIds.length === 0) {
    headline = 'Esta regra ainda não vale para ninguém. Escolha ao menos um grupo.';
  } else if (covered.length === 0) {
    headline =
      'Esta regra ainda não vale para ninguém: todos os colaboradores estão de fora. Marque ao menos um na lista.';
  } else {
    headline = `Esta regra vai valer para ${count(covered.length, 'colaborador', 'colaboradores')} de ${count(groupIds.length, 'grupo', 'grupos')}.`;
  }
  return { covered, excluded, headline };
}

/**
 * Quem a regra controla e já está em outra regra ativa, dito por regra: "Ana Ribeiro e Paulo
 * Siqueira já estão na regra Comercial." Cada colaborador segue uma regra só. A regra em
 * observação não bloqueia ninguém e não entra na conta.
 */
export function assignmentConflicts(
  schedule: WorkSchedule,
  employees: readonly Employee[],
  others: readonly WorkSchedule[],
): RuleProblem[] {
  const covered = employees.filter((e) => appliesTo(schedule, e)).sort(byName);
  return others
    .filter((other) => !other.observationMode)
    .flatMap((other) => {
      const both = covered.filter((e) => appliesTo(other, e));
      if (both.length === 0) return [];
      const verb = both.length === 1 ? 'já está' : 'já estão';
      return [
        {
          message: `${listNames(both)} ${verb} na regra ${other.name}. Cada colaborador segue uma regra só: tire o grupo de uma das regras ou deixe essas pessoas de fora desta.`,
          target: { field: 'assignment' } as const,
        },
      ];
    });
}

/** "Ana", "Ana e Paulo", "Ana, Paulo e Diego", "Ana, Paulo, Diego e mais 6 colaboradores". */
export function listNames(people: readonly Employee[]): string {
  const names = people.map((p) => p.name);
  if (names.length <= 3) {
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
  }
  const rest = names.length - 3;
  return `${names.slice(0, 3).join(', ')} e mais ${count(rest, 'colaborador', 'colaboradores')}`;
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'pt-BR');
}
