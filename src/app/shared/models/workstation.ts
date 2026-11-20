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

/**
 * Estação com os dados da lista de /estacoes. A mesma resposta de /api/estacoes serve ao painel
 * "Hoje", que só usa o que está em Workstation.
 */
export interface WorkstationDetail extends Workstation {
  /** Nome da máquina, fictício na PoC, como "COM-NB-011". */
  hostname: string;
  /** Regra de jornada que vale para o colaborador (WorkSchedule.id). */
  scheduleId: string;
  /**
   * Última vez que a estação mudou de estado ou registrou uso, ISO 8601. Vazio sem atividade nos
   * últimos 7 dias.
   */
  lastActivityAt?: string;
}
