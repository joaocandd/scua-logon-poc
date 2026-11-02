// Esquema do formulário do editor de regras (Signal Forms): liga as validações puras de
// schedule-validation.ts e schedule-assignment.ts aos campos do rascunho.

import {
  applyEach,
  type FieldTree,
  required,
  schema,
  validate,
  validateTree,
  ValidationError,
} from '@angular/forms/signals';
import { Employee, WorkSchedule } from '../../../shared/models';
import { assignmentConflicts } from './schedule-assignment';
import { ScheduleDraft, toSchedule } from './schedule-draft';
import {
  daysError,
  nameError,
  ProblemTarget,
  RuleProblem,
  ruleProblems,
} from './schedule-validation';

/**
 * Erro de campo (nome vazio ou repetido, nenhum dia). Como o "obrigatório", aparece no campo só
 * depois do primeiro "Salvar regra" (ADR 0008).
 */
export const FIELD_ERROR = 'campo';

/**
 * Problema de regra (horários, intervalos e conflito com outra regra). Aparece na hora, na própria
 * seção (ADR 0011); no formulário, só impede salvar e diz para onde vai o foco.
 */
export const RULE_ERROR = 'regra';

export interface ScheduleFormContext {
  /** As outras regras: para não repetir o nome nem pôr alguém em duas regras ativas. */
  otherSchedules: () => readonly WorkSchedule[];
  employees: () => readonly Employee[];
}

/** Todos os problemas de regra do rascunho, na ordem da tela. */
export function allRuleProblems(draft: ScheduleDraft, context: ScheduleFormContext): RuleProblem[] {
  return [
    ...ruleProblems(draft),
    ...assignmentConflicts(toSchedule(draft), context.employees(), context.otherSchedules()),
  ];
}

export function scheduleSchema(context: ScheduleFormContext) {
  return schema<ScheduleDraft>((path) => {
    validate(path.name, ({ value }) =>
      fieldError(
        nameError(
          value(),
          context.otherSchedules().map((s) => s.name),
        ),
      ),
    );
    validate(path.days, ({ value }) => fieldError(daysError(value())));

    required(path.start, { message: 'Informe o início da jornada.' });
    required(path.end, { message: 'Informe o fim da jornada.' });
    applyEach(path.breaks, (item) => {
      required(item.start, { message: 'Informe o início do intervalo.' });
      required(item.end, { message: 'Informe o fim do intervalo.' });
    });

    validateTree(path, ({ value, fieldTree }) =>
      allRuleProblems(value(), context).map((problem) => ({
        kind: RULE_ERROR,
        message: problem.message,
        fieldTree: targetOf(fieldTree, problem.target),
      })),
    );
  });
}

/**
 * Mensagem para o Field: o primeiro erro que não é problema de regra. O horário pela metade
 * (`parse`, do próprio Signal Forms) não traz mensagem.
 */
export function fieldErrorMessage(field: FieldTree<unknown>): string | null {
  const error = field()
    .errors()
    .find((e) => e.kind !== RULE_ERROR);
  if (!error) return null;
  return error.message ?? 'Complete o horário, no formato 08:00.';
}

function fieldError(message: string | null): ValidationError | null {
  return message ? { kind: FIELD_ERROR, message } : null;
}

function targetOf(
  root: FieldTree<ScheduleDraft, string | number, 'readonly'>,
  target: ProblemTarget,
) {
  switch (target.field) {
    case 'end':
      return root.end;
    case 'breaks':
      return root.breaks;
    case 'breakStart':
      return root.breaks[target.index].start;
    case 'breakEnd':
      return root.breaks[target.index].end;
    case 'assignment':
      return root.assignment;
  }
}
