import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button, Icon, IconName, StatusBadge } from '../../../design-system';
import { CardOutcome, RequestCardView } from '../data/request-card-view';

/**
 * Cartão de um pedido na caixa de aprovações: quem, quando, até que horas, o motivo e o contexto
 * para decidir. Só desenha; a página decide o que fazer com cada ação.
 *
 * Os botões têm id previsível para a página mover o foco depois de uma ação:
 * `aprovar-<id>`, `desfazer-<id>` e `resultado-<id>` (o texto do resultado).
 */
@Component({
  selector: 'app-request-card',
  imports: [Button, Icon, StatusBadge],
  templateUrl: './request-card.html',
  styleUrl: './request-card.scss',
})
export class RequestCard {
  readonly view = input.required<RequestCardView>();
  /** Mostra a caixa de seleção para aprovar em lote. */
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });

  readonly selectedChange = output<boolean>();
  readonly approve = output();
  readonly reject = output();
  readonly undo = output();

  protected readonly outcomeIcons: Record<CardOutcome['tone'], IconName> = {
    approved: 'check_circle',
    rejected: 'cancel',
    neutral: 'timer_off',
  };
}
