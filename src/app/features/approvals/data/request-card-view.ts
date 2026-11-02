// O que cada cartão da caixa de aprovações mostra, já em texto. Funções puras: o cartão (ui/) só
// desenha, e as frases ficam testadas aqui.

import { addDays, formatDate, toLocal } from '../../../shared/date';
import { Employee, ExtensionRequest, ExtensionRequestStatus } from '../../../shared/models';
import { formatClock, formatDuration, MINUTES_PER_DAY, toMinutes } from '../../../shared/time';
import { undoBlocker } from '../../../shared/undo-decision';
import { InboxItem, managerDecision } from './approval-inbox';
import { RequestAlert } from './request-context';

/** Ação em andamento num cartão. */
export type CardBusy = 'approve' | 'reject' | 'undo';

/** O que a página guarda de cada cartão enquanto ele está na tela. */
export interface CardSession {
  /** Decidido nesta visita à página: o resultado diz só "Aprovado às 18h03", sem "por você". */
  decidedHere: boolean;
  busy: CardBusy | null;
  /** A API recusou o "Desfazer": por quê. */
  undoError?: string;
}

export interface CardOutcome {
  /** "Aprovado às 18h03" ou "Aprovado por Marina às 18h03". */
  text: string;
  /** Complemento, como "Falta a validação do RH." ou o motivo da recusa. */
  note: string | null;
  tone: 'approved' | 'rejected' | 'neutral';
}

export interface RequestCardView {
  id: string;
  employeeName: string;
  groupName: string;
  /** "Hoje, 30/10", "Amanhã, 31/10" ou "seg, 03/11". */
  day: string;
  /** "Até 19h30". */
  until: string;
  /** "+1h30". */
  extra: string;
  reason: string;
  status: ExtensionRequestStatus;
  /** Mostra o status quando não é o normal da caixa (aguardando o gestor). */
  showStatus: boolean;
  /** Tempo para decidir; só em pedido que aguarda o gestor. `soon`: falta menos de 1 h. */
  expires: { text: string; soon: boolean } | null;
  alerts: RequestAlert[];
  /** "1h30 de hora extra nos últimos 30 dias". */
  recentOvertime: string | null;
  /** Se ainda vai para o RH depois do gestor. */
  hrNote: string | null;
  canDecide: boolean;
  outcome: CardOutcome | null;
  /** Desfazer: disponível, ou o motivo de não estar mais. Nulo quando a decisão não é sua. */
  undo: { available: true } | { available: false; reason: string } | null;
  busy: CardBusy | null;
}

export interface CardViewOptions {
  /** Instante atual, em milissegundos. */
  now: number;
  /** Quem está usando o app. */
  meId: string | null;
  employeeById: ReadonlyMap<string, Employee>;
  session?: CardSession;
}

export function toCardView(item: InboxItem, options: CardViewOptions): RequestCardView {
  const { request, employee, group, context } = item;
  const { now, session } = options;
  const today = toLocal(now).date;
  const canDecide = request.status === 'aguardando_gestor';
  const extraMinutes =
    context?.extraMinutes ??
    (toMinutes(request.requestedEnd) - toMinutes(request.currentEnd) + MINUTES_PER_DAY) %
      MINUTES_PER_DAY;
  const recentOvertime = context ? describeRecent(context.recentOvertimeMinutes) : null;

  return {
    id: request.id,
    employeeName: employee.name,
    groupName: group?.name ?? 'Sem grupo',
    day: dayLabel(request.date, today),
    until: `Até ${formatClock(toMinutes(request.requestedEnd))}`,
    extra: `+${formatDuration(extraMinutes)}`,
    reason: request.reason,
    status: request.status,
    showStatus: !canDecide,
    expires: canDecide ? expiresLabel(request.expiresAt, now) : null,
    alerts: context?.alerts ?? [],
    recentOvertime,
    hrNote:
      canDecide && context
        ? context.needsHrValidation
          ? 'Depois de você, vai para a validação do RH.'
          : 'Sem validação do RH: a sua aprovação libera a estação.'
        : null,
    canDecide,
    outcome: outcomeOf(request, options),
    undo: undoState(request, options),
    busy: session?.busy ?? null,
  };
}

/** "Hoje, 30/10", "Amanhã, 31/10", "Ontem, 29/10" ou "seg, 03/11". */
export function dayLabel(date: string, today: string): string {
  const relative =
    date === today
      ? 'Hoje'
      : date === addDays(today, 1)
        ? 'Amanhã'
        : date === addDays(today, -1)
          ? 'Ontem'
          : null;
  return relative ? `${relative}, ${formatDate(date).split(', ')[1]}` : formatDate(date);
}

/**
 * Quanto falta para o pedido vencer: "Expira em 45 min", "Expira em 2h10". Mais de 12 h: o dia e a
 * hora, como "Expira amanhã às 19h30".
 */
export function expiresLabel(expiresAt: string, now: number): { text: string; soon: boolean } {
  const minutes = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000));
  if (minutes < 12 * 60) {
    return { text: `Expira em ${formatDuration(minutes)}`, soon: minutes < 60 };
  }
  const local = toLocal(expiresAt);
  const today = toLocal(now).date;
  const day =
    local.date === addDays(today, 1)
      ? 'amanhã'
      : local.date === today
        ? 'hoje'
        : formatDate(local.date);
  return { text: `Expira ${day} às ${formatClock(local.minutes)}`, soon: false };
}

function describeRecent(minutes: number): string {
  return minutes > 0
    ? `${formatDuration(minutes)} de hora extra nos últimos 30 dias`
    : 'Nenhuma hora extra nos últimos 30 dias';
}

/**
 * Resultado do pedido em texto. Quem decidiu nesta visita lê "Aprovado às 18h03"; uma decisão
 * sua de antes, "Aprovado por você às 18h03"; a de outra pessoa, "Aprovado por Marina às 18h03".
 */
export function outcomeOf(request: ExtensionRequest, options: CardViewOptions): CardOutcome | null {
  const clock = (instant: string) => formatClock(toLocal(instant).minutes);
  const firstName = (id: string) =>
    options.employeeById.get(id)?.name.split(' ')[0] ?? 'outra pessoa';

  switch (request.status) {
    case 'aguardando_gestor':
      return null;
    case 'expirado':
      return {
        text: `Expirou às ${clock(request.expiresAt)}, sem decisão`,
        note: null,
        tone: 'neutral',
      };
    case 'cancelado':
      return {
        text: `${firstName(request.employeeId)} cancelou o pedido`,
        note: null,
        tone: 'neutral',
      };
  }

  const last = request.decisions.at(-1);
  if (!last) return null;
  const approved = last.outcome === 'aprovado';
  const tone = approved ? 'approved' : 'rejected';
  const reason = last.reason ? `Motivo: ${last.reason}` : null;

  if (last.step === 'rh') {
    return {
      text: `${approved ? 'Validado' : 'Recusado'} pelo RH às ${clock(last.at)}`,
      note: reason,
      tone,
    };
  }
  const who =
    last.approverId !== options.meId
      ? ` por ${firstName(last.approverId)}`
      : options.session?.decidedHere
        ? ''
        : ' por você';
  const note = request.status === 'aguardando_rh' ? 'Falta a validação do RH.' : reason;
  return { text: `${approved ? 'Aprovado' : 'Recusado'}${who} às ${clock(last.at)}`, note, tone };
}

/**
 * "Desfazer" em toda decisão de gestor da pessoa que está usando o app, desta visita ou de antes,
 * enquanto a API ainda permitir (mesma regra dela, em undoBlocker). Quando não dá mais, o cartão
 * diz por quê.
 */
function undoState(request: ExtensionRequest, options: CardViewOptions): RequestCardView['undo'] {
  const { session, now, meId } = options;
  const mine = meId !== null && managerDecision(request)?.approverId === meId;
  if (!mine || request.status === 'aguardando_gestor') return null;
  const reason = session?.undoError ?? undoBlocker(request, now);
  return reason ? { available: false, reason } : { available: true };
}
