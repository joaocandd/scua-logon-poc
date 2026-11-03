// Resumo da regra em português, sempre visível no editor: "Seg a sex, das 8h às 17h. Estação
// bloqueada no intervalo Almoço (12h–13h). Avisos 15 e 5 min antes. Hora extra precisa do gestor
// e do RH. Vale para 37 colaboradores de 3 grupos." Função pura: usa só o que já foi conferido.

import { formatDate } from '../../../shared/date';
import { OBSERVATION_DAYS } from '../../../shared/models';
import { formatRange, formatSpan, MINUTES_PER_DAY } from '../../../shared/time';
import { AssignmentPreview } from './schedule-assignment';
import { ScheduleDraft, toSchedule } from './schedule-draft';
import { HoursCheck } from './schedule-validation';
import { formatWarnings } from './schedule-warnings';
import { formatWeekdays } from './weekdays';

/** As frases do resumo, na ordem das seções do editor. */
export function scheduleSummary(
  draft: ScheduleDraft,
  check: HoursCheck,
  assignment: AssignmentPreview,
): string[] {
  return [
    hoursSentence(draft, check),
    ...(check.shift ? [breaksSentence(check)] : []),
    warningsSentence(draft.warningMinutes),
    draft.approval === 'gestor-e-rh'
      ? 'Hora extra precisa do gestor e do RH.'
      : 'Hora extra precisa só do gestor.',
    assignmentSentence(draft, assignment),
    ...(draft.observationMode ? [observationSentence(draft)] : []),
  ];
}

function observationSentence({ observationEndsOn }: ScheduleDraft): string {
  return observationEndsOn
    ? `Em observação até ${formatDate(observationEndsOn)}: não bloqueia ninguém.`
    : `Em observação por ${OBSERVATION_DAYS} dias depois de salvar: não bloqueia ninguém.`;
}

function hoursSentence(draft: ScheduleDraft, { shift }: HoursCheck): string {
  const days = toSchedule(draft).weekdays;
  if (days.length === 0) return 'Nenhum dia da semana escolhido.';
  if (!shift) return `${formatWeekdays(days)}, horário ainda incompleto.`;
  const end = shift.end % MINUTES_PER_DAY;
  const nextDay = shift.end > MINUTES_PER_DAY ? ' do dia seguinte' : '';
  return `${formatWeekdays(days)}, ${formatRange(shift.start, end)}${nextDay}.`;
}

function breaksSentence({ breaks }: HoursCheck): string {
  if (breaks.length === 0) return 'Sem intervalo.';
  const items = [...breaks]
    .sort((a, b) => a.start - b.start)
    .map((b) => `${b.label} (${formatSpan(b.start, b.end)})`);
  const list = items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;
  return `Estação bloqueada ${items.length === 1 ? 'no intervalo' : 'nos intervalos'} ${list}.`;
}

function warningsSentence(minutes: readonly number[]): string {
  if (minutes.length === 0) return 'Sem aviso antes do bloqueio.';
  return `${minutes.length === 1 ? 'Aviso' : 'Avisos'} ${formatWarnings(minutes)} antes.`;
}

function assignmentSentence(draft: ScheduleDraft, { covered }: AssignmentPreview): string {
  const groups = draft.assignment.groupIds.length;
  if (covered.length === 0) return 'Ainda não vale para ninguém.';
  const people = covered.length === 1 ? '1 colaborador' : `${covered.length} colaboradores`;
  return `Vale para ${people} de ${groups === 1 ? '1 grupo' : `${groups} grupos`}.`;
}
