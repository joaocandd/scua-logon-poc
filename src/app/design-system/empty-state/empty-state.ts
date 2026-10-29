import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Estado vazio de uma lista ou tela. A ação é opcional e vem por projeção:
 *
 * ```html
 * <app-empty-state heading="Nenhum pedido aguardando" description="...">
 *   <a app-button routerLink="/regras">Ver regras</a>
 * </app-empty-state>
 * ```
 */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<IconName>('inbox');
  /** Nível do título, para seguir a hierarquia da página (o h1 é do PageHeader). */
  readonly headingLevel = input<2 | 3>(2);
}
