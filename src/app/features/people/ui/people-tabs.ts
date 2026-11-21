import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Abas de Pessoas: "Colaboradores" e "Grupos". São links (cada aba tem a própria URL), com
 * `aria-current="page"` na aba aberta: o leitor de tela diz qual é a atual.
 */
@Component({
  selector: 'app-people-tabs',
  imports: [RouterLink],
  template: `
    <nav class="tabs" aria-label="Seções de Pessoas">
      <a
        class="tab"
        routerLink="/pessoas"
        [attr.aria-current]="active() === 'colaboradores' ? 'page' : null"
        >Colaboradores</a
      >
      <a
        class="tab"
        routerLink="/pessoas/grupos"
        [attr.aria-current]="active() === 'grupos' ? 'page' : null"
        >Grupos</a
      >
    </nav>
  `,
  styleUrl: './people-tabs.scss',
})
export class PeopleTabs {
  readonly active = input.required<'colaboradores' | 'grupos'>();
}
