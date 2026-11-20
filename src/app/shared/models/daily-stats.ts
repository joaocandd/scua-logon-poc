/**
 * Números de um grupo em um dia, para os relatórios (resposta de /api/relatorios/diario).
 *
 * Na PoC, a série é FICTÍCIA: a API simulada inventa os números com uma semente fixa a partir das
 * regras, dos feriados e das exceções (ver src/app/mocks/history.ts). No produto real, eles viriam
 * dos registros do agente do Windows.
 */
export interface DailyGroupStats {
  /** Dia, "AAAA-MM-DD" (America/Sao_Paulo). */
  date: string;
  groupId: string;
  /** Horas extras aprovadas, em minutos (cada colaborador conta no máximo 2 h por dia). */
  overtimeMinutes: number;
  /**
   * Minutos de estação bloqueada com o colaborador diante dela: a tela de bloqueio aberta antes do
   * início, no intervalo ou depois do fim da jornada.
   */
  blockedMinutes: number;
  /** Colaboradores com jornada no dia que não registraram o início. */
  absentCount: number;
  /** Colaboradores com jornada no dia (a base das ausências). */
  scheduledCount: number;
}
