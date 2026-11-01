import { Component, input, output } from '@angular/core';
import { Button, Icon, IconName } from '../../../design-system';
import { CardOutcome, RequestCardView } from '../data/request-card-view';

/**
 * Decisão de um pedido: "Aprovar" e "Recusar" enquanto aguarda o gestor; depois, o resultado
 * ("Aprovado às 18h03") e o "Desfazer", ou por que não dá mais para desfazer. Usado no cartão da
 * lista e no detalhe.
 *
 * Os ids (`aprovar-<id>`, `desfazer-<id>`, `resultado-<id>`) recebem o foco depois de uma ação.
 * No desktop, a lista e o detalhe aparecem juntos: o detalhe usa o prefixo `detalhe-`.
 */
@Component({
  selector: 'app-request-decision',
  imports: [Button, Icon],
  templateUrl: './request-decision.html',
  styleUrl: './request-decision.scss',
})
export class RequestDecision {
  readonly view = input.required<RequestCardView>();
  /** Prefixo dos ids: vazio na lista, "detalhe-" no detalhe. */
  readonly idPrefix = input('');

  readonly approve = output();
  readonly reject = output();
  readonly undo = output();

  protected readonly outcomeIcons: Record<CardOutcome['tone'], IconName> = {
    approved: 'check_circle',
    rejected: 'cancel',
    neutral: 'timer_off',
  };
}
