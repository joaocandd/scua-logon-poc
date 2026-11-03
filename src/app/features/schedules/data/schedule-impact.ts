// Confirmação de impacto ao salvar uma regra: o que muda em relação à versão salva, para quantas
// pessoas vale e de quem a estação passa a ficar bloqueada agora mesmo. Quem decide o estado da
// estação é o schedule-engine. Função pura.

import { formatDate } from '../../../shared/date';
import {
  Employee,
  ExtensionRequest,
  Holiday,
  OBSERVATION_DAYS,
  ScheduleException,
  WorkSchedule,
  WorkstationStatus,
} from '../../../shared/models';
import { appliesTo, evaluateWorkstation } from '../../../shared/schedule-engine';
import { formatRange, formatSpan, toMinutes } from '../../../shared/time';
import { listNames } from './schedule-assignment';
import { formatWarnings } from './schedule-warnings';
import { formatWeekdays } from './weekdays';

export interface ImpactInput {
  /** A regra como está salva. Nula em regra nova. */
  before: WorkSchedule | null;
  /** A regra como vai ser salva. */
  after: WorkSchedule;
  employees: readonly Employee[];
  exceptions: readonly ScheduleException[];
  holidays: readonly Holiday[];
  extensions: readonly ExtensionRequest[];
  now: number;
}

/** Texto do ConfirmDialog. */
export interface SaveImpact {
  title: string;
  message: string;
  /** O que muda e de quem a estação bloqueia agora. */
  items: string[];
  confirmLabel: string;
}

/** Nulo quando nada mudou em relação à versão salva: não há o que salvar. */
export function saveImpact(input: ImpactInput): SaveImpact | null {
  const { before, after } = input;
  // Em ordem alfabética, como na seção "A quem se aplica".
  const employees = [...input.employees].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const changes = before ? changesOf(before, after, employees) : [];
  if (before && changes.length === 0 && before.observationMode === after.observationMode) {
    return null;
  }

  const covered = employees.filter((e) => appliesTo(after, e));
  const startsObserving = after.observationMode && !before?.observationMode;
  return {
    title: before ? `Salvar a regra ${after.name}?` : `Criar a regra ${after.name}?`,
    message: messageOf(before, after, covered.length),
    items: [...changes, ...(covered.length > 0 ? [blockedNow(input, covered)] : [])],
    confirmLabel: startsObserving ? 'Salvar e observar' : before ? 'Salvar regra' : 'Criar regra',
  };
}

function messageOf(before: WorkSchedule | null, after: WorkSchedule, count: number): string {
  const people = count === 1 ? '1 colaborador' : `${count} colaboradores`;
  if (after.observationMode && before?.observationMode && before.observationEndsOn) {
    return `A regra continua em observação até ${formatDate(before.observationEndsOn)}: ela não bloqueia ninguém, o Scua Logon só registra quem seria bloqueado.`;
  }
  if (after.observationMode) {
    return `Por ${OBSERVATION_DAYS} dias, a regra não bloqueia ninguém: o Scua Logon só registra quem seria bloqueado. Depois disso, ela passa a bloquear ${people}.`;
  }
  if (count === 0) return 'A regra ainda não vale para ninguém.';
  if (before?.observationMode) {
    return `A observação termina agora: a regra passa a bloquear ${people} assim que você salvar.`;
  }
  return before
    ? `A mudança vale para ${people} assim que você salvar.`
    : `A regra passa a valer para ${people} assim que você salvar.`;
}

/** "Horário: das 8h às 17h → das 8h às 18h", na ordem das seções do editor. */
function changesOf(
  before: WorkSchedule,
  after: WorkSchedule,
  employees: readonly Employee[],
): string[] {
  const changes: string[] = [];
  const compare = (label: string, describe: (s: WorkSchedule) => string) => {
    const [from, to] = [describe(before), describe(after)];
    if (from !== to) changes.push(`${label}: ${from} → ${to}`);
  };
  compare('Nome', (s) => s.name);
  compare('Dias', (s) => formatWeekdays(s.weekdays));
  compare('Horário', (s) => formatRange(toMinutes(s.start), toMinutes(s.end)));
  compare('Intervalos', (s) =>
    s.breaks.length === 0
      ? 'sem intervalo'
      : s.breaks
          .map((b) => `${b.label} (${formatSpan(toMinutes(b.start), toMinutes(b.end))})`)
          .join(', '),
  );
  compare('Avisos', (s) => formatWarnings(s.warningMinutes) || 'sem aviso');
  compare('Aprovação', (s) => (s.requiresHrValidation ? 'gestor e RH' : 'só o gestor'));

  const was = new Set(employees.filter((e) => appliesTo(before, e)).map((e) => e.id));
  const is = new Set(employees.filter((e) => appliesTo(after, e)).map((e) => e.id));
  const joining = employees.filter((e) => is.has(e.id) && !was.has(e.id));
  const leaving = employees.filter((e) => was.has(e.id) && !is.has(e.id));
  if (joining.length > 0) changes.push(`Entram na regra: ${listNames(joining)}.`);
  if (leaving.length > 0) {
    changes.push(`Saem da regra e ficam sem controle de jornada: ${listNames(leaving)}.`);
  }
  return changes;
}

/**
 * Quem está com a estação liberada agora (pela versão salva, ou sem regra) e ficaria bloqueado
 * com a regra nova. Na observação, isso só fica registrado.
 */
function blockedNow(input: ImpactInput, covered: readonly Employee[]): string {
  const { before, after } = input;
  const unlocked = ({ state }: WorkstationStatus) =>
    state === 'em_jornada' || state === 'he_aprovada';
  const blocked = covered.filter((employee) => {
    const current =
      before && !before.observationMode && appliesTo(before, employee)
        ? unlocked(evaluate(input, before, employee))
        : true;
    return current && !unlocked(evaluate(input, after, employee));
  });

  if (blocked.length === 0) {
    return 'Agora mesmo, ninguém fica com a estação bloqueada por causa disso.';
  }
  const verb = blocked.length === 1 ? 'fica' : 'ficam';
  return after.observationMode
    ? `Agora mesmo, a regra bloquearia a estação de ${listNames(blocked)}. Na observação, isso só fica registrado.`
    : `Agora mesmo, ${listNames(blocked)} ${verb} com a estação bloqueada.`;
}

function evaluate(input: ImpactInput, schedule: WorkSchedule, employee: Employee) {
  return evaluateWorkstation({
    schedule,
    exceptions: input.exceptions.filter((e) => e.employeeId === employee.id),
    holidays: input.holidays,
    extensions: input.extensions.filter((r) => r.employeeId === employee.id),
    at: input.now,
  });
}
