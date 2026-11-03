import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Field, FieldControl, Icon } from '../../../design-system';
import { capitalize } from '../../../shared/text';
import { fieldErrorMessage } from '../data/schedule-form';
import { WEEK } from '../data/weekdays';

/**
 * Seção 1 do editor de regras: nome e dias da semana. Recebe os campos do formulário da página;
 * os erros só aparecem depois do primeiro "Salvar regra" (ADR 0008).
 *
 * Os dias são caixas de seleção nativas com cara de botão: o leitor de tela diz "Seg, caixa de
 * seleção, marcada", e o marcado se destaca pelo fundo e pelo ícone, não só pela cor.
 */
@Component({
  selector: 'app-schedule-name-days',
  imports: [Field, FieldControl, FormField, Icon],
  templateUrl: './schedule-name-days.html',
  styleUrl: './schedule-name-days.scss',
})
export class ScheduleNameDays {
  readonly name = input.required<FieldTree<string>>();
  readonly days = input.required<FieldTree<boolean[]>>();
  readonly showErrors = input(false);

  /** "Seg", "Ter"...: o mesmo texto na tela e no nome que o leitor de tela lê. */
  protected readonly week = WEEK.map((day) => ({ value: day.value, label: capitalize(day.short) }));

  protected errorOf(field: FieldTree<unknown>): string | null {
    return this.showErrors() ? fieldErrorMessage(field) : null;
  }
}
