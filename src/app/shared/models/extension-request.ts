import { ExtensionRequestStatus } from './status';

/** Etapa da aprovação: primeiro o gestor; depois o RH, se a regra pedir. */
export type ApprovalStep = 'gestor' | 'rh';

/** Decisão de uma etapa da aprovação. */
export interface ExtensionDecision {
  step: ApprovalStep;
  outcome: Extract<ExtensionRequestStatus, 'aprovado' | 'recusado'>;
  /** Quem decidiu (Employee.id). */
  approverId: string;
  /** Instante, ISO 8601. */
  at: string;
  /** Motivo. Obrigatório na recusa. */
  reason?: string;
}

/** Pedido de extensão: o colaborador pede para trabalhar além do fim da jornada. */
export interface ExtensionRequest {
  id: string;
  employeeId: string;
  /** Dia da jornada, "AAAA-MM-DD". Na jornada que atravessa a meia-noite, é o dia em que ela começa. */
  date: string;
  /** Fim da jornada sem a extensão, "HH:mm". */
  currentEnd: string;
  /** Novo fim pedido, "HH:mm". Pode passar da meia-noite (22:00 → 00:30). */
  requestedEnd: string;
  reason: string;
  status: ExtensionRequestStatus;
  /** Instante, ISO 8601. */
  createdAt: string;
  /** Prazo para decidir, ISO 8601. É o novo fim pedido: depois dele, aprovar não muda nada. */
  expiresAt: string;
  /** Decisões na ordem em que aconteceram. */
  decisions: ExtensionDecision[];
}
