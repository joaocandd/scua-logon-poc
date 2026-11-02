import { Component, computed, inject } from '@angular/core';
import { EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../../design-system';
import { People } from '../../people/data/people';
import { isRetrying, loadState, retryFailed } from '../data/load-state';
import { scheduleRows } from '../data/schedule-list';
import { WorkSchedules } from '../data/work-schedules';

/**
 * Lista de regras de jornada (fluxo B, /regras): nome, horário, grupos, quantos colaboradores a
 * regra controla e se está ativa ou em observação.
 *
 * Desktop primeiro: uma tabela. No celular, cada linha vira um cartão; o HTML é o mesmo e a troca
 * é só de CSS, então o leitor de tela continua lendo uma tabela.
 */
@Component({
  selector: 'app-schedules-page',
  imports: [EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge],
  templateUrl: './schedules-page.html',
  styleUrl: './schedules-page.scss',
})
export class SchedulesPage {
  private readonly schedules = inject(WorkSchedules);
  private readonly people = inject(People);

  private readonly resources = [this.schedules.list, this.people.employees, this.people.groups];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  protected readonly rows = computed(() =>
    scheduleRows(
      this.schedules.list.hasValue() ? this.schedules.list.value() : [],
      this.people.employees.hasValue() ? this.people.employees.value() : [],
      this.people.groupById(),
    ),
  );

  protected retry(): void {
    retryFailed(this.resources);
  }
}
