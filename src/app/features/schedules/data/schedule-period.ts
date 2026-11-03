// Feriados e exceções nos próximos dias, para o RH saber o que muda a regra no período. Só informa:
// não impede salvar. Função pura; a data de hoje vem de quem chama, no fuso de São Paulo.

import { addDays, formatDate, weekdayOf } from '../../../shared/date';
import { Employee, Holiday, ScheduleException, WorkSchedule } from '../../../shared/models';
import { formatRange, toMinutes } from '../../../shared/time';

/** Quantos dias, a partir de hoje, o editor olha. */
export const PERIOD_DAYS = 30;

export interface PeriodNotes {
  /** Feriados em dia de jornada da regra: "Finados, seg, 02/11". */
  holidays: string[];
  /** Exceções de quem está na regra: "Patrícia Lemos, qua, 04/11: horário especial das 7h às 16h (Auditoria externa)". */
  exceptions: string[];
}

/** Feriados e exceções de hoje até `PERIOD_DAYS - 1` dias depois. */
export function periodNotes(
  schedule: WorkSchedule,
  covered: readonly Employee[],
  holidays: readonly Holiday[],
  exceptions: readonly ScheduleException[],
  today: string,
): PeriodNotes {
  const last = addDays(today, PERIOD_DAYS - 1);
  const inPeriod = (date: string) => date >= today && date <= last;
  const nameOf = new Map(covered.map((e) => [e.id, e.name]));

  return {
    holidays: holidays
      .filter((h) => inPeriod(h.date) && schedule.weekdays.includes(weekdayOf(h.date)))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => `${h.name}, ${formatDate(h.date)}`),
    exceptions: exceptions
      .filter((e) => inPeriod(e.date) && nameOf.has(e.employeeId))
      .sort((a, b) => a.date.localeCompare(b.date) || a.employeeId.localeCompare(b.employeeId))
      .map((e) => {
        const what =
          e.kind === 'folga'
            ? 'folga'
            : `horário especial ${formatRange(toMinutes(e.start), toMinutes(e.end))}`;
        return `${nameOf.get(e.employeeId)}, ${formatDate(e.date)}: ${what} (${e.reason})`;
      }),
  };
}
