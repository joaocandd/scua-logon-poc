import type { RequestContext } from '../request-context';
import type { RequestTimeline } from '../request-timeline';
import { ExtensionRequest } from './extension-request';

/**
 * O que a página pública /aprovacao/:token recebe da API (GET /api/aprovacao/:token). O link do
 * e-mail pode ser encaminhado, então vem só o necessário para decidir (LGPD): o pedido, o nome e o
 * grupo do colaborador e o contexto já calculado. Nada de e-mail, cargo, exceções, feriados ou
 * outros pedidos da pessoa.
 */
export interface ApprovalLink {
  request: ExtensionRequest;
  employeeName: string;
  groupName: string;
  /** Quem recebeu o link (Employee.id). As decisões dele aparecem como "por você". */
  approverId: string;
  /** Alertas, horas extras dos últimos 30 dias e se vai para o RH. */
  context: RequestContext;
  /** Trechos da linha do tempo do dia e quando a estação bloqueia. */
  timeline: RequestTimeline;
}
