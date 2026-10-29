import { Component, input } from '@angular/core';

/**
 * Cabeçalho da página: o único h1 da tela, uma descrição curta e a área de ações (projeção).
 *
 * ```html
 * <app-page-header heading="Regras de jornada" description="...">
 *   <a app-button routerLink="/regras/nova" icon="add">Nova regra</a>
 * </app-page-header>
 * ```
 */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly description = input<string>();
}
