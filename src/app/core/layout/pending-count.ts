import { Component, computed, input } from '@angular/core';

/**
 * Número de pedidos aguardando, ao lado de "Aprovações" no menu. O número faz parte do nome do
 * link e "pendentes" vem em texto oculto: o leitor de tela ouve "Aprovações 3 pendentes", o
 * mesmo que está na tela (WCAG 2.5.3).
 */
@Component({
  selector: 'app-pending-count',
  templateUrl: './pending-count.html',
  styleUrl: './pending-count.scss',
})
export class PendingCount {
  readonly count = input.required<number>();

  protected readonly visible = computed(() => (this.count() > 99 ? '99+' : String(this.count())));
  protected readonly noun = computed(() => (this.count() === 1 ? 'pendente' : 'pendentes'));
}
