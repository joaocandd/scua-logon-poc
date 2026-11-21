import { Component, input } from '@angular/core';

/**
 * Iniciais num círculo. Só visual (o nome está ao lado): fica fora do leitor de tela.
 * `size="lg"` no topo do perfil.
 */
@Component({
  selector: 'app-person-avatar',
  template: `{{ initials() }}`,
  host: { 'aria-hidden': 'true', '[class.lg]': "size() === 'lg'" },
  styles: `
    :host {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      background: var(--color-highlight-bg);
      color: var(--color-text-on-highlight);
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    :host(.lg) {
      width: 3.5rem;
      height: 3.5rem;
      font-size: var(--text-lg);
    }
  `,
})
export class PersonAvatar {
  readonly initials = input.required<string>();
  readonly size = input<'md' | 'lg'>('md');
}
