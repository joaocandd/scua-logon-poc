import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Campo de formulário: rótulo visível, texto de ajuda e erro em volta de um controle nativo
 * marcado com `appFieldControl` (input de texto, hora ou data, select ou textarea).
 *
 * O controle continua sendo do formulário de quem usa (reactive forms, signal forms ou nada):
 * o Field só liga rótulo, ajuda e erro a ele.
 *
 * ```html
 * <app-field label="Início" hint="Formato 24 h" [error]="erro()" required>
 *   <input appFieldControl type="time" [formControl]="inicio" />
 * </app-field>
 * ```
 */
@Component({
  selector: 'app-field',
  imports: [Icon],
  templateUrl: './field.html',
  styleUrl: './field.scss',
  // Sem encapsulamento: o estilo precisa chegar ao controle projetado. Todas as classes
  // começam com app-field para não vazar.
  encapsulation: ViewEncapsulation.None,
  host: { class: 'app-field' },
})
export class Field {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Mensagem de erro em texto. Vazio ou nulo: sem erro. */
  readonly error = input<string | null>();
  readonly required = input(false, { transform: booleanAttribute });

  readonly controlId = `app-field-${nextId++}`;
  readonly hintId = `${this.controlId}-hint`;
  readonly errorId = `${this.controlId}-error`;

  readonly describedBy = computed(
    () =>
      [this.hint() ? this.hintId : null, this.error() ? this.errorId : null]
        .filter(Boolean)
        .join(' ') || null,
  );
}

/** Marca o controle nativo dentro de um `<app-field>` e liga a ele o rótulo, a ajuda e o erro. */
@Directive({
  selector: 'input[appFieldControl], select[appFieldControl], textarea[appFieldControl]',
  host: {
    class: 'app-field__control',
    '[id]': 'field.controlId',
    '[attr.aria-describedby]': 'field.describedBy()',
    '[attr.aria-invalid]': 'field.error() ? "true" : null',
    // aria-required em vez de required: a validação é do formulário, não do navegador.
    '[attr.aria-required]': 'field.required() ? "true" : null',
  },
})
export class FieldControl {
  protected readonly field = inject(Field);
}
