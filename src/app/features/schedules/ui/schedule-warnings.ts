import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { Icon } from '../../../design-system';
import { WARNING_OPTIONS, WarningPreview } from '../data/schedule-warnings';

/**
 * Seção 3 do editor de regras: avisos antes do bloqueio, com a prévia do aviso que o colaborador
 * vê. As opções são caixas de seleção com cara de botão, como os dias da semana.
 *
 * O Signal Forms liga uma caixa de seleção a um valor booleano; aqui cada caixa liga ou desliga um
 * número da lista `warningMinutes`. Por isso a ligação é feita à mão, sem o `[formField]`.
 */
@Component({
  selector: 'app-schedule-warnings',
  imports: [Icon],
  templateUrl: './schedule-warnings.html',
  styleUrl: './schedule-warnings.scss',
})
export class ScheduleWarnings {
  readonly warnings = input.required<FieldTree<number[]>>();
  /** Nula enquanto a jornada não tem início e fim certos. */
  readonly preview = input<WarningPreview | null>(null);

  protected readonly options = WARNING_OPTIONS;
  protected readonly chosen = computed(() => new Set(this.warnings()().value()));

  protected toggle(minutes: number, checked: boolean): void {
    this.warnings()().value.update((list) =>
      checked ? [...list, minutes].sort((a, b) => b - a) : list.filter((m) => m !== minutes),
    );
  }
}
