import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Erro ao carregar uma tela ou lista, com o botão "Tentar de novo".
 *
 * Só aceita texto escrito para pessoas. Nunca passe a mensagem do HttpErrorResponse, o código
 * HTTP ou o JSON da resposta: o padrão já diz o que aconteceu e o que fazer.
 */
@Component({
  selector: 'app-error-state',
  imports: [Button, Icon],
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
})
export class ErrorState {
  readonly heading = input('Não conseguimos carregar');
  readonly description = input('Tente de novo em instantes. Se continuar, avise o suporte.');
  /** Mostra o botão em loading enquanto a nova tentativa acontece. */
  readonly retrying = input(false, { transform: booleanAttribute });
  readonly headingLevel = input<2 | 3>(2);

  readonly retry = output();
}
