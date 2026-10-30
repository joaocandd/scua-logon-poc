import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { afterNextRender, Component, inject, Injector, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { Button, Field, FieldControl, Icon } from '../../../design-system';

export interface RejectDialogData {
  employeeName: string;
  /** Resumo do pedido, como "Até 19h30 (+2h30) · Entrega de proposta comercial". */
  summary: string;
  /**
   * Recusa o pedido com o motivo. Resolve nulo quando deu certo (o diálogo fecha) ou com a
   * mensagem para mostrar no diálogo, como "Não conseguimos falar com o servidor...".
   */
  submit: (reason: string) => Promise<string | null>;
}

/** Id do título, para o `ariaLabelledBy` de quem abre o diálogo. */
export const REJECT_DIALOG_TITLE_ID = 'recusar-pedido-titulo';

const REASON_REQUIRED = 'Escreva o motivo da recusa.';

/**
 * Diálogo de recusa com motivo obrigatório. Aberto pelo Dialog do CDK: foco preso, Esc cancela e o
 * foco volta para quem abriu. Fecha com `true` quando a recusa deu certo.
 *
 * Só recebe dados e devolve o resultado: quem chama a API é a página, pelo `submit`.
 */
@Component({
  selector: 'app-reject-dialog',
  imports: [Button, Field, FieldControl, FormField, FormRoot, Icon],
  templateUrl: './reject-dialog.html',
  styleUrl: './reject-dialog.scss',
})
export class RejectDialog {
  protected readonly data = inject<RejectDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly injector = inject(Injector);
  protected readonly titleId = REJECT_DIALOG_TITLE_ID;

  protected readonly rejection = form(
    signal({ reason: '' }),
    (path) => {
      required(path.reason, { message: REASON_REQUIRED });
      // Só espaços também não vale como motivo.
      validate(path.reason, ({ value }) =>
        value() && !value().trim() ? requiredError({ message: REASON_REQUIRED }) : null,
      );
    },
    {
      submission: {
        action: async (fields) => {
          this.formError.set(null);
          const error = await this.data.submit(fields.reason().value().trim());
          if (error) this.formError.set(error);
          else this.ref.close(true);
        },
        onInvalid: (fields) => {
          this.showErrors.set(true);
          afterNextRender(() => fields.reason().focusBoundControl(), { injector: this.injector });
        },
      },
    },
  );

  /** Como no login, o erro do campo só aparece depois da primeira tentativa (ADR 0008). */
  protected readonly showErrors = signal(false);
  /** Erro que não é do campo, como o servidor fora do ar. */
  protected readonly formError = signal<string | null>(null);

  protected reasonError(): string | null {
    return this.showErrors() ? (this.rejection.reason().errors()[0]?.message ?? null) : null;
  }
}
