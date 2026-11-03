import { Component, input } from '@angular/core';
import { Icon } from '../../../design-system';
import { PERIOD_DAYS, PeriodNotes } from '../data/schedule-period';

/**
 * Feriados e exceções nos próximos 30 dias, junto do resumo. Só informa: não impede salvar.
 */
@Component({
  selector: 'app-schedule-period',
  imports: [Icon],
  templateUrl: './schedule-period.html',
  styleUrl: './schedule-period.scss',
})
export class SchedulePeriod {
  readonly notes = input.required<PeriodNotes>();

  protected readonly days = PERIOD_DAYS;
}
