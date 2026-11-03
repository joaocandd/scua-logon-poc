import { WorkstationState } from './status';

/** Estado da estação e o motivo, como o schedule-engine calcula. */
export interface WorkstationStatus {
  state: WorkstationState;
  /** Motivo em português, como "Bloqueada: fora da jornada Comercial (das 8h às 17h)." */
  reason: string;
}

/** Estação de um colaborador agora (resposta de /api/estacoes). */
export interface Workstation extends WorkstationStatus {
  employeeId: string;
  /**
   * A regra do colaborador está em observação: o estado é o que a regra faria, mas a estação não
   * é bloqueada de verdade.
   */
  observed?: boolean;
}
