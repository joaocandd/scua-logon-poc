export type ActivityEventType =
  | 'pedido_criado'
  | 'pedido_aprovado'
  | 'pedido_recusado'
  | 'pedido_expirado'
  | 'pedido_cancelado'
  | 'regra_criada'
  | 'regra_salva';

/** Item do histórico (auditoria). */
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  /** Instante, ISO 8601. */
  at: string;
  /** Quem fez (Employee.id). Fica vazio quando foi o sistema, como um pedido que expirou. */
  actorId?: string;
  /** Colaborador afetado. */
  employeeId?: string;
  requestId?: string;
  scheduleId?: string;
  /** Frase pronta para a tela, como "Marina Couto aprovou o pedido de Camila Vasconcelos." */
  summary: string;
}
