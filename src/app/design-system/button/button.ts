import { booleanAttribute, Component, ElementRef, inject, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

/**
 * Botão do design system. Fica no próprio elemento nativo: `<button app-button>` para ações e
 * `<a app-button>` para navegação. Links não têm `disabled` nem `loading`.
 *
 * Em `loading`, o botão continua focável (aria-disabled em vez de disabled), para o foco não
 * saltar para o começo da página no meio da ação; o clique é bloqueado até terminar.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.disabled]': 'isButton && disabled() ? "" : null',
    '[attr.aria-disabled]': 'isButton && loading() ? "true" : null',
    '[attr.aria-busy]': 'isButton && loading() ? "true" : null',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  /** Ícone antes do rótulo. Sem rótulo, o botão precisa de aria-label. */
  readonly icon = input<IconName>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly isButton = this.element.tagName === 'BUTTON';

  constructor() {
    // Ouvinte na fase de captura: roda antes do (click) de quem usa o botão e o cancela.
    // preventDefault também impede o envio do formulário num botão type="submit".
    this.element.addEventListener(
      'click',
      (event) => {
        if (this.isButton && this.loading()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }
}
