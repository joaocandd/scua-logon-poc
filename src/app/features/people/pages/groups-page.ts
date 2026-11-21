import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../../design-system';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { groupCards } from '../data/group-list';
import { People } from '../data/people';
import { countLabel } from '../data/people-list';
import { PeopleTabs } from '../ui/people-tabs';

/**
 * Pessoas › Grupos (/pessoas/grupos): um cartão por grupo, com o gestor e os aprovadores, quantos
 * colaboradores tem e a regra de jornada que vale para ele. "Ver colaboradores" abre a lista
 * filtrada pelo grupo. Só leitura.
 */
@Component({
  selector: 'app-groups-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Icon,
    PageHeader,
    PeopleTabs,
    RouterLink,
    Skeleton,
    StatusBadge,
  ],
  templateUrl: './groups-page.html',
  styleUrl: './groups-page.scss',
})
export class GroupsPage {
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);

  private readonly resources = [this.people.employees, this.people.groups, this.schedules.list];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  protected readonly cards = computed(() =>
    groupCards(
      this.people.groups.hasValue() ? this.people.groups.value() : [],
      this.people.employees.hasValue() ? this.people.employees.value() : [],
      this.schedules.list.hasValue() ? this.schedules.list.value() : [],
    ),
  );
  protected readonly countLabel = countLabel;

  protected readonly status = computed(() => {
    if (this.state() === 'loading') return 'Carregando os grupos';
    if (this.state() !== 'ready') return '';
    const count = this.cards().length;
    return count === 1 ? '1 grupo' : `${count} grupos`;
  });

  protected retry(): void {
    retryFailed(this.resources);
  }
}
