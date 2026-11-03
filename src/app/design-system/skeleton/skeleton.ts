import { Component, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'heading' | 'block';

/**
 * Esqueleto de carregamento: um bloco cinza no lugar do conteúdo que ainda não chegou, com o
 * mesmo tamanho dele, para a tela não pular quando os dados chegam.
 *
 * É só visual (aria-hidden). Quem usa avisa o leitor de tela: `aria-busy="true"` na região que
 * carrega e um texto como "Carregando os pedidos" numa região `role="status"`.
 *
 * ```html
 * <div aria-busy="true">
 *   <app-skeleton variant="heading" width="40%" />
 *   <app-skeleton />
 *   <app-skeleton width="70%" />
 * </div>
 * ```
 */
@Component({
  selector: 'app-skeleton',
  template: '',
  styleUrl: './skeleton.scss',
  host: {
    'aria-hidden': 'true',
    '[attr.data-variant]': 'variant()',
    '[style.width]': 'width()',
  },
})
export class Skeleton {
  /** `text`: uma linha de texto; `heading`: um título; `block`: um botão ou área. */
  readonly variant = input<SkeletonVariant>('text');
  /** Largura em CSS, como "60%" ou "var(--space-8)". */
  readonly width = input('100%');
}
