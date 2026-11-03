// Rascunho da regra no editor: o modelo do formulário (Signal Forms) e a conversão de ida e volta
// para o WorkSchedule que a API recebe.

import { Weekday, WorkSchedule } from '../../../shared/models';
import { toMinutes } from '../../../shared/time';
import { WEEK } from './weekdays';

/**
 * Regra no formulário. Diferenças para o WorkSchedule:
 * - `days`: uma caixa por dia, na posição do Weekday (0 é domingo), no lugar da lista de dias;
 * - `overnight`: a pessoa diz que a jornada atravessa a meia-noite. No WorkSchedule isso é só o
 *   fim antes do início; no formulário, a marcação separa a jornada noturna do erro de digitação;
 * - `approval`: quem aprova a hora extra, como texto, porque os rádios do formulário têm valor de
 *   texto. No WorkSchedule é o `requiresHrValidation`.
 */
export interface ScheduleDraft extends Omit<
  WorkSchedule,
  'id' | 'weekdays' | 'requiresHrValidation'
> {
  days: boolean[];
  overnight: boolean;
  approval: Approval;
}

/** Quem aprova a hora extra: só o gestor, ou o gestor e depois a validação do RH. */
export type Approval = 'gestor' | 'gestor-e-rh';

/** Nome do intervalo quando a pessoa deixa o campo vazio. */
export const DEFAULT_BREAK_LABEL = 'Intervalo';

/** Regra nova: seg a sex, das 8h às 17h, almoço das 12h às 13h, avisos 15 e 5 min antes. */
export function newScheduleDraft(): ScheduleDraft {
  return {
    name: '',
    days: [false, true, true, true, true, true, false],
    start: '08:00',
    end: '17:00',
    overnight: false,
    breaks: [{ label: 'Almoço', start: '12:00', end: '13:00' }],
    warningMinutes: [15, 5],
    approval: 'gestor',
    observationMode: false,
    assignment: { groupIds: [], excludedEmployeeIds: [] },
  };
}

/** Regra salva → formulário. Cópia funda: editar não altera a lista de regras. */
export function toDraft(schedule: WorkSchedule): ScheduleDraft {
  return {
    name: schedule.name,
    days: Array.from({ length: 7 }, (_, day) => schedule.weekdays.includes(day as Weekday)),
    start: schedule.start,
    end: schedule.end,
    overnight: toMinutes(schedule.end) <= toMinutes(schedule.start),
    breaks: structuredClone(schedule.breaks),
    warningMinutes: [...schedule.warningMinutes],
    approval: schedule.requiresHrValidation ? 'gestor-e-rh' : 'gestor',
    observationMode: schedule.observationMode,
    ...(schedule.observationEndsOn && { observationEndsOn: schedule.observationEndsOn }),
    assignment: structuredClone(schedule.assignment),
  };
}

/**
 * Formulário → regra para salvar. `id` vazio é regra nova. Os dias saem na ordem da semana da
 * interface (segunda primeiro) e o nome sem espaços nas pontas.
 */
export function toSchedule(draft: ScheduleDraft, id = ''): WorkSchedule {
  return {
    id,
    name: draft.name.trim(),
    weekdays: WEEK.filter((day) => draft.days[day.value]).map((day) => day.value),
    start: draft.start,
    end: draft.end,
    breaks: draft.breaks.map((b) => ({ ...b, label: b.label.trim() || DEFAULT_BREAK_LABEL })),
    warningMinutes: [...draft.warningMinutes],
    requiresHrValidation: draft.approval === 'gestor-e-rh',
    observationMode: draft.observationMode,
    ...(draft.observationEndsOn && { observationEndsOn: draft.observationEndsOn }),
    assignment: structuredClone(draft.assignment),
  };
}
