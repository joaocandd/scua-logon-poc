import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../design-system';
import { PendingSummary } from '../data/attention';

/**
 * Topo do painel "Hoje": quantos pedidos aguardam aprovação, o que vence antes e o atalho para a
 * caixa de aprovações, já no grupo escolhido.
 */
@Component({
  selector: 'app-pending-requests',
  imports: [Button, RouterLink],
  templateUrl: './pending-requests.html',
  styleUrl: './pending-requests.scss',
})
export class PendingRequests {
  readonly summary = input.required<PendingSummary>();
  /** Grupo escolhido no painel. Nulo: todos. */
  readonly groupId = input<string | null>(null);

  protected readonly approvalsQuery = computed(() =>
    this.groupId() ? { grupo: this.groupId() } : {},
  );
}
