// Até quando o gestor pode desfazer a própria decisão. A API e a caixa de aprovações usam a
// mesma regra: a API recusa o pedido de desfazer e a tela esconde o botão, com o mesmo motivo.

import { toLocal } from './date';
import { ExtensionDecision, ExtensionRequest } from './models';
import { formatClock } from './time';

/** Decisão do gestor no pedido, se houver. */
export function managerDecision(request: ExtensionRequest): ExtensionDecision | undefined {
  return request.decisions.find((d) => d.step === 'gestor');
}

/**
 * Por que a decisão do gestor não pode mais ser desfeita, ou nulo se ainda pode. Depois que o RH
 * decide, ou depois que o pedido vence (o novo fim pedido já passou), a decisão fica.
 */
export function undoBlocker(request: ExtensionRequest, now: Date | number): string | null {
  const last = request.decisions.at(-1);
  if (last?.step === 'rh') {
    const verb = last.outcome === 'aprovado' ? 'validou' : 'recusou';
    return `Não dá mais para desfazer: o RH já ${verb} o pedido.`;
  }
  if (request.status === 'expirado' || Date.parse(request.expiresAt) <= new Date(now).getTime()) {
    const deadline = formatClock(toLocal(request.expiresAt).minutes);
    return `Não dá mais para desfazer: o pedido venceu às ${deadline}.`;
  }
  return null;
}
