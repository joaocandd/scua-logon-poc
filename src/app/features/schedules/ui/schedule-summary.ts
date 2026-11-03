import { Component, computed, input } from '@angular/core';

/**
 * Seção 6 do editor de regras: o resumo da regra em português, atualizado a cada mudança. Não é
 * região viva: mudaria a cada tecla e o leitor de tela não pararia de falar.
 */
@Component({
  selector: 'app-schedule-summary',
  templateUrl: './schedule-summary.html',
  styleUrl: './schedule-summary.scss',
})
export class ScheduleSummary {
  readonly sentences = input.required<readonly string[]>();

  protected readonly text = computed(() => this.sentences().join(' '));
}
