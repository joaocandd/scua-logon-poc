import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../design-system';
import { TodayAlert } from '../data/attention';

/**
 * Alertas do painel "Hoje", cada um com o link para resolver: a lista das estações liberadas sem
 * aprovação (na própria página), a caixa de aprovações ou as regras de jornada.
 *
 * Não é região viva: os alertas chegam com o painel, e anunciar a cada consulta seria ruído.
 */
@Component({
  selector: 'app-today-alerts',
  imports: [Icon, RouterLink],
  templateUrl: './today-alerts.html',
  styleUrl: './today-alerts.scss',
})
export class TodayAlerts {
  readonly alerts = input.required<readonly TodayAlert[]>();
  /** Grupo escolhido no painel. Nulo: todos. */
  readonly groupId = input<string | null>(null);
  /** A pessoa abriu a lista das estações liberadas sem aprovação. */
  readonly stationsOpened = output<void>();

  protected readonly approvalsQuery = computed(() =>
    this.groupId() ? { grupo: this.groupId() } : {},
  );
}
