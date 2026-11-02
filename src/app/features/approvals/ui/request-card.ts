import { booleanAttribute, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, StatusBadge } from '../../../design-system';
import { RequestCardView } from '../data/request-card-view';
import { RequestContextList } from './request-context-list';
import { RequestDecision } from './request-decision';

/**
 * Cartão de um pedido na caixa de aprovações: quem, quando, até que horas, o motivo, o contexto
 * para decidir e o link para o detalhe. Só desenha; a página decide o que fazer com cada ação.
 *
 * Ids que recebem o foco depois de uma ação: `aprovar-<id>`, `desfazer-<id>`, `resultado-<id>`
 * (na decisão) e `detalhes-<id>` (o link, quando o detalhe fecha).
 */
@Component({
  selector: 'app-request-card',
  imports: [Icon, RequestContextList, RequestDecision, RouterLink, RouterLinkActive, StatusBadge],
  templateUrl: './request-card.html',
  styleUrl: './request-card.scss',
})
export class RequestCard {
  readonly view = input.required<RequestCardView>();
  /** Mostra a caixa de seleção para aprovar em lote. */
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });
  /** Chegou enquanto a página estava aberta: mostra a marca "Novo". */
  readonly isNew = input(false, { transform: booleanAttribute });

  readonly selectedChange = output<boolean>();
  readonly approve = output();
  readonly reject = output();
  readonly undo = output();
}
