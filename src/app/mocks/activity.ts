// Itens do histórico. As fixtures e a API simulada usam as mesmas frases.

import {
  ActivityEvent,
  Employee,
  ExtensionDecision,
  ExtensionRequest,
  WorkSchedule,
} from '../shared/models';
import { formatClock, toMinutes } from '../shared/time';

/** Item do histórico antes de ganhar id. */
export type NewActivityEvent = Omit<ActivityEvent, 'id'>;

export function requestCreated(request: ExtensionRequest, employee: Employee): NewActivityEvent {
  return {
    type: 'pedido_criado',
    at: request.createdAt,
    actorId: employee.id,
    employeeId: employee.id,
    requestId: request.id,
    summary: `${employee.name} pediu extensão até ${formatClock(toMinutes(request.requestedEnd))} (${request.reason}).`,
  };
}

export function requestDecided(
  request: ExtensionRequest,
  decision: ExtensionDecision,
  employee: Employee,
  approver: Employee,
): NewActivityEvent {
  const approved = decision.outcome === 'aprovado';
  const byHr = decision.step === 'rh' ? ' pelo RH' : '';
  const verb = approved ? (decision.step === 'rh' ? 'validou' : 'aprovou') : 'recusou';
  const next = approved && request.status === 'aguardando_rh' ? ' Falta a validação do RH.' : '';
  const why = decision.reason ? ` Motivo: ${sentence(decision.reason)}` : '';
  return {
    type: approved ? 'pedido_aprovado' : 'pedido_recusado',
    at: decision.at,
    actorId: approver.id,
    employeeId: employee.id,
    requestId: request.id,
    summary: `${approver.name} ${verb}${byHr} o pedido de ${employee.name}.${next}${why}`,
  };
}

export function requestExpired(request: ExtensionRequest, employee: Employee): NewActivityEvent {
  return {
    type: 'pedido_expirado',
    at: request.expiresAt,
    employeeId: employee.id,
    requestId: request.id,
    summary: `O pedido de ${employee.name} expirou sem decisão.`,
  };
}

export function requestCancelled(
  request: ExtensionRequest,
  employee: Employee,
  at: string,
): NewActivityEvent {
  return {
    type: 'pedido_cancelado',
    at,
    actorId: employee.id,
    employeeId: employee.id,
    requestId: request.id,
    summary: `${employee.name} cancelou o pedido.`,
  };
}

export function scheduleSaved(
  schedule: WorkSchedule,
  actor: Employee,
  at: string,
  created: boolean,
): NewActivityEvent {
  return {
    type: created ? 'regra_criada' : 'regra_salva',
    at,
    actorId: actor.id,
    scheduleId: schedule.id,
    summary: `${actor.name} ${created ? 'criou' : 'salvou'} a regra ${schedule.name}.`,
  };
}

/** Termina com ponto, se a pessoa não tiver posto. */
function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
