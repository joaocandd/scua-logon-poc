import { Component, input } from '@angular/core';
import { Icon } from '../../../design-system';
import { RequestCardView } from '../data/request-card-view';

/**
 * Contexto para decidir um pedido: alertas (2 h extras no dia, interjornada), horas extras dos
 * últimos 30 dias e se ainda vai para o RH. Usado no cartão da lista e no detalhe.
 */
@Component({
  selector: 'app-request-context-list',
  imports: [Icon],
  templateUrl: './request-context-list.html',
  styleUrl: './request-context-list.scss',
})
export class RequestContextList {
  readonly view = input.required<RequestCardView>();
}
