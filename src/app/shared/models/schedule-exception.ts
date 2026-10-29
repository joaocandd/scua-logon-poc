import { Break } from './work-schedule';

interface ScheduleExceptionBase {
  id: string;
  employeeId: string;
  /** Dia, "AAAA-MM-DD" (America/Sao_Paulo). */
  date: string;
  /** Motivo, como "Doação de sangue" ou "Treinamento". */
  reason: string;
}

/** Folga: a estação fica bloqueada o dia todo. */
export interface DayOffException extends ScheduleExceptionBase {
  kind: 'folga';
}

/** Horário alternativo: substitui a jornada da regra nesse dia, mesmo em feriado ou fim de semana. */
export interface AlternateHoursException extends ScheduleExceptionBase {
  kind: 'horario';
  /** Início, "HH:mm". */
  start: string;
  /** Fim, "HH:mm". Fim antes do início atravessa a meia-noite. */
  end: string;
  breaks: Break[];
}

/** Exceção na jornada de um colaborador em um dia. Vale mais que o feriado e que a regra. */
export type ScheduleException = DayOffException | AlternateHoursException;
