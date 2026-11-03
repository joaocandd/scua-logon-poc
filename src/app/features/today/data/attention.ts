// O que precisa de atenção no painel "Hoje": os pedidos aguardando e os alertas. Funções puras.

import { formatDate, toLocal } from '../../../shared/date';
import { Employee, ExtensionRequest, WorkSchedule } from '../../../shared/models';
import { appliesTo } from '../../../shared/schedule-engine';
import { formatClock } from '../../../shared/time';
import { expiresLabel } from '../../approvals/data/request-card-view';
import { listNames } from '../../schedules/data/schedule-assignment';
import { StationRow } from './stations';

export interface PendingSummary {
  /** Aguardando o gestor: o que a caixa de aprovações mostra. */
  count: number;
  /** Aguardando a validação do RH. */
  hrCount: number;
  /** O que vence antes: "O próximo é de Ana Ribeiro. Expira em 45 min." Nulo sem pedidos. */
  next: string | null;
}

/** Pedidos em aberto do grupo (nulo: todos os grupos). */
export function pendingSummary(
  requests: readonly ExtensionRequest[],
  employeeById: ReadonlyMap<string, Employee>,
  groupId: string | null,
  now: number,
): PendingSummary {
  const inGroup = requests.filter((r) => {
    const employee = employeeById.get(r.employeeId);
    return employee && (!groupId || employee.groupId === groupId);
  });
  const pending = byExpiry(inGroup.filter((r) => r.status === 'aguardando_gestor'));
  const first = pending[0];
  return {
    count: pending.length,
    hrCount: inGroup.filter((r) => r.status === 'aguardando_rh').length,
    next: first
      ? `O próximo é de ${employeeById.get(first.employeeId)!.name}. ${expiresLabel(first.expiresAt, now).text}.`
      : null,
  };
}

export type AlertKind = 'sem_aprovacao' | 'vencendo' | 'sem_regra';

/** Alerta do painel: o que aconteceu e, no detalhe, por quê. A tela põe o link de cada tipo. */
export interface TodayAlert {
  kind: AlertKind;
  title: string;
  detail: string;
}

export interface AlertInput {
  /** Estações do grupo escolhido. */
  stations: readonly StationRow[];
  /** Colaboradores do grupo escolhido, com ou sem regra de jornada. */
  employees: readonly Employee[];
  /** Pedidos de todos os grupos: só os do grupo entram (pelos colaboradores acima). */
  requests: readonly ExtensionRequest[];
  schedules: readonly WorkSchedule[];
  now: number;
}

/** Um pedido vence "logo" se falta até 1 h. */
const SOON_MS = 60 * 60_000;

/**
 * Alertas, do mais urgente para o menos:
 * 1. estações liberadas sem aprovação (regra em observação que bloquearia agora);
 * 2. pedidos que vencem na próxima hora;
 * 3. colaboradores sem regra de jornada (a estação não é controlada).
 */
export function todayAlerts(input: AlertInput): TodayAlert[] {
  return [unapprovedAlert(input), expiringAlert(input), noScheduleAlert(input)].filter(
    (alert) => alert !== null,
  );
}

function unapprovedAlert({ stations, employees, schedules }: AlertInput): TodayAlert | null {
  const ids = new Set(
    stations.filter((s) => s.filter === 'sem_aprovacao').map((s) => s.employeeId),
  );
  if (ids.size === 0) return null;
  const observed = schedules.filter(
    (s) => s.observationMode && employees.some((e) => ids.has(e.id) && appliesTo(s, e)),
  );
  return {
    kind: 'sem_aprovacao',
    title: `${plural(ids.size, 'estação liberada', 'estações liberadas')} sem aprovação`,
    detail: observationDetail(observed),
  };
}

/**
 * "A regra Noturna está em observação até sex, 06/11: ela bloquearia estas estações agora, mas não
 * bloqueia." Com mais de uma regra, sem as datas.
 */
function observationDetail(schedules: readonly WorkSchedule[]): string {
  if (schedules.length !== 1) {
    const names = joinNames(schedules.map((s) => s.name));
    return `As regras ${names} estão em observação: elas bloqueariam estas estações agora, mas não bloqueiam.`;
  }
  const [schedule] = schedules;
  const until = schedule.observationEndsOn ? ` até ${formatDate(schedule.observationEndsOn)}` : '';
  return `A regra ${schedule.name} está em observação${until}: ela bloquearia estas estações agora, mas não bloqueia.`;
}

function expiringAlert({ requests, employees, now }: AlertInput): TodayAlert | null {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const soon = byExpiry(
    requests.filter((r) => {
      const left = Date.parse(r.expiresAt) - now;
      return (
        r.status === 'aguardando_gestor' && byId.has(r.employeeId) && left > 0 && left <= SOON_MS
      );
    }),
  );
  if (soon.length === 0) return null;
  // "Ana Ribeiro às 18h30 e Lucas Bittencourt às 18h45." Mais de três: "e mais 2 pedidos".
  const items = soon.map(
    (r) => `${byId.get(r.employeeId)!.name} às ${formatClock(toLocal(r.expiresAt).minutes)}`,
  );
  const rest = items.length - 3;
  return {
    kind: 'vencendo',
    title: `${plural(soon.length, 'pedido vence', 'pedidos vencem')} na próxima hora`,
    detail:
      rest > 0
        ? `${items.slice(0, 3).join(', ')} e mais ${plural(rest, 'pedido', 'pedidos')}.`
        : `${joinNames(items)}.`,
  };
}

function noScheduleAlert({ stations, employees }: AlertInput): TodayAlert | null {
  const controlled = new Set(stations.map((s) => s.employeeId));
  const free = employees
    .filter((e) => !controlled.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (free.length === 0) return null;
  return {
    kind: 'sem_regra',
    title: `${plural(free.length, 'colaborador', 'colaboradores')} sem regra de jornada`,
    detail:
      free.length === 1
        ? `A estação de ${free[0].name} não é bloqueada em nenhum horário.`
        : `As estações de ${listNames(free)} não são bloqueadas em nenhum horário.`,
  };
}

function byExpiry(requests: readonly ExtensionRequest[]): ExtensionRequest[] {
  return [...requests].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/** "1 estação liberada", "6 estações liberadas". */
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "A", "A e B", "A, B e C". */
function joinNames(names: readonly string[]): string {
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
}
