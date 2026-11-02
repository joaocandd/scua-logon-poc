// Esquema do formulário do editor de regras (Signal Forms): liga as validações puras de
// schedule-validation.ts aos campos do rascunho.

import { schema, validate, ValidationError } from '@angular/forms/signals';
import { ScheduleDraft } from './schedule-draft';
import { daysError, nameError } from './schedule-validation';

/**
 * Erro de campo (obrigatório, nome repetido, nenhum dia). Aparece no campo só depois do primeiro
 * "Salvar regra" (ADR 0008).
 */
export const FIELD_ERROR = 'campo';

export interface ScheduleFormContext {
  /** Nomes das outras regras, para não repetir. */
  otherNames: () => readonly string[];
}

export function scheduleSchema(context: ScheduleFormContext) {
  return schema<ScheduleDraft>((path) => {
    validate(path.name, ({ value }) => fieldError(nameError(value(), context.otherNames())));
    validate(path.days, ({ value }) => fieldError(daysError(value())));
  });
}

function fieldError(message: string | null): ValidationError | null {
  return message ? { kind: FIELD_ERROR, message } : null;
}
