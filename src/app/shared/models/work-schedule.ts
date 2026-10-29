/** Dia da semana como no `Date.getUTCDay()`: 0 é domingo e 6 é sábado. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Intervalo dentro da jornada. A estação fica bloqueada nele. */
export interface Break {
  /** Nome do intervalo, como "Almoço" ou "Pausa". */
  label: string;
  /** Início, "HH:mm". */
  start: string;
  /** Fim, "HH:mm". */
  end: string;
}

/** A quem a regra se aplica: todos os colaboradores dos grupos, menos os excluídos. */
export interface ScheduleAssignment {
  groupIds: string[];
  excludedEmployeeIds: string[];
}

/** Regra de jornada: quando a estação fica liberada e como a hora extra é aprovada. */
export interface WorkSchedule {
  id: string;
  name: string;
  weekdays: Weekday[];
  /** Início, "HH:mm". */
  start: string;
  /**
   * Fim, "HH:mm". Fim antes do início atravessa a meia-noite (22:00–06:00): a jornada pertence
   * ao dia em que começa.
   */
  end: string;
  breaks: Break[];
  /** Minutos antes do bloqueio em que o colaborador recebe aviso. Padrão: [15, 5]. */
  warningMinutes: number[];
  /** Depois do gestor, a hora extra ainda precisa da validação do RH. */
  requiresHrValidation: boolean;
  /** Modo observação: registra quem seria bloqueado, sem bloquear. */
  observationMode: boolean;
  assignment: ScheduleAssignment;
}
