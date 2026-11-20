// Auditoria (/relatorios/auditoria): tipos, filtros e o CSV do registro de eventos. Funções puras.
// O registro é só leitura: nenhuma tela edita ou apaga um evento.

import { addDays, formatDate, toLocal } from '../../../shared/date';
import { toCsv } from '../../../shared/csv';
import { ActivityEvent, ActivityEventType, Employee } from '../../../shared/models';
import { formatClock } from '../../../shared/time';

/** Tipo de evento no filtro. Vai na URL como `?tipo=`. */
export type AuditKind = 'acessos' | 'pedidos' | 'decisoes' | 'desfazer' | 'regras';

export const AUDIT_KINDS: readonly { value: AuditKind; label: string }[] = [
  { value: 'acessos', label: 'Acessos' },
  { value: 'pedidos', label: 'Pedidos' },
  { value: 'decisoes', label: 'Decisões' },
  { value: 'desfazer', label: 'Decisões desfeitas' },
  { value: 'regras', label: 'Regras de jornada' },
];

const KIND_OF: Record<ActivityEventType, AuditKind> = {
  acesso: 'acessos',
  pedido_criado: 'pedidos',
  pedido_expirado: 'pedidos',
  pedido_cancelado: 'pedidos',
  pedido_aprovado: 'decisoes',
  pedido_recusado: 'decisoes',
  decisao_desfeita: 'desfazer',
  regra_criada: 'regras',
  regra_salva: 'regras',
  bloqueio_observado: 'regras',
  observacao_encerrada: 'regras',
};

/** Rótulo de cada tipo de evento na tabela. */
const TYPE_LABEL: Record<ActivityEventType, string> = {
  acesso: 'Acesso',
  pedido_criado: 'Pedido feito',
  pedido_expirado: 'Pedido expirado',
  pedido_cancelado: 'Pedido cancelado',
  pedido_aprovado: 'Pedido aprovado',
  pedido_recusado: 'Pedido recusado',
  decisao_desfeita: 'Decisão desfeita',
  regra_criada: 'Regra criada',
  regra_salva: 'Regra salva',
  bloqueio_observado: 'Bloqueio em observação',
  observacao_encerrada: 'Observação encerrada',
};

/** Período do filtro: hoje, 7 ou 30 dias. Vai na URL como `?periodo=`. */
export type AuditPeriod = 'hoje' | '7' | '30';

export const AUDIT_PERIODS: readonly { value: AuditPeriod; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
];

export function parseKind(value: string | null): AuditKind | null {
  return AUDIT_KINDS.find((k) => k.value === value)?.value ?? null;
}

export function parseAuditPeriod(value: string | null): AuditPeriod {
  return value === 'hoje' || value === '7' ? value : '30';
}

/** Um evento na tabela. */
export interface AuditRow {
  id: string;
  at: string;
  /** "qui, 12/11 às 18h03". */
  when: string;
  typeLabel: string;
  /** Quem fez, ou "Sistema" (um pedido que expirou, uma observação que terminou). */
  actor: string;
  summary: string;
}

export interface AuditFilters {
  /** Pessoa que fez ou que foi afetada (Employee.id). */
  personId: string | null;
  kind: AuditKind | null;
  period: AuditPeriod;
}

/** Eventos do filtro, do mais novo para o mais antigo (a ordem da API). */
export function auditRows(
  events: readonly ActivityEvent[],
  employeeById: ReadonlyMap<string, Employee>,
  { personId, kind, period }: AuditFilters,
  now: number,
): AuditRow[] {
  const today = toLocal(now).date;
  const from = period === 'hoje' ? today : addDays(today, -(Number(period) - 1));
  return events
    .filter((e) => toLocal(e.at).date >= from)
    .filter((e) => !kind || KIND_OF[e.type] === kind)
    .filter((e) => !personId || e.actorId === personId || e.employeeId === personId)
    .map((e) => ({
      id: e.id,
      at: e.at,
      when: whenOf(e.at),
      typeLabel: TYPE_LABEL[e.type],
      actor: (e.actorId && employeeById.get(e.actorId)?.name) || 'Sistema',
      summary: e.summary,
    }));
}

/** Pessoas que aparecem no registro (quem fez ou quem foi afetado), em ordem alfabética. */
export function auditPeople(
  events: readonly ActivityEvent[],
  employeeById: ReadonlyMap<string, Employee>,
): Employee[] {
  const ids = new Set(events.flatMap((e) => [e.actorId, e.employeeId]).filter((id) => !!id));
  return [...ids]
    .map((id) => employeeById.get(id!))
    .filter((e): e is Employee => !!e)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function auditCsv(rows: readonly AuditRow[]): string {
  return toCsv(
    ['Quando', 'Tipo', 'Quem', 'O que aconteceu'],
    rows.map((row) => [isoLocal(row.at), row.typeLabel, row.actor, row.summary]),
  );
}

/** "qui, 12/11 às 18h03". */
function whenOf(instant: string): string {
  const local = toLocal(instant);
  return `${formatDate(local.date)} às ${formatClock(local.minutes)}`;
}

/** "2026-11-12 18:03", no relógio de São Paulo: fácil de ordenar na planilha. */
function isoLocal(instant: string): string {
  const { date, minutes } = toLocal(instant);
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}
