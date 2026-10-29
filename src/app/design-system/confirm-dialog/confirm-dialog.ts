import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogPanel } from './confirm-dialog-panel';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Diz a ação, como "Aprovar 3 pedidos" ou "Excluir regra". Nunca "OK" ou "Sim". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para ações destrutivas ou difíceis de desfazer. */
  variant?: 'primary' | 'danger';
}

/** O que o painel recebe: as opções e os ids que ligam o título e a mensagem ao diálogo. */
export interface ConfirmDialogData extends ConfirmOptions {
  titleId: string;
  messageId: string;
}

let nextId = 0;

/**
 * Diálogo de confirmação, no lugar do `confirm()` nativo. Usa o Dialog do CDK: foco preso no
 * diálogo, Esc fecha (como "Cancelar") e o foco volta para o elemento que abriu.
 *
 * ```ts
 * if (await this.confirm.open({ title: 'Aprovar 3 pedidos?', confirmLabel: 'Aprovar 3 pedidos' })) { ... }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialog {
  private readonly dialog = inject(Dialog);

  /** Resolve `true` se a pessoa confirmar e `false` em qualquer outro caso. */
  async open(options: ConfirmOptions): Promise<boolean> {
    const id = `app-confirm-${nextId++}`;
    const data: ConfirmDialogData = {
      ...options,
      titleId: `${id}-title`,
      messageId: `${id}-message`,
    };
    const ref = this.dialog.open<boolean, ConfirmDialogData>(ConfirmDialogPanel, {
      data,
      role: 'alertdialog',
      ariaLabelledBy: data.titleId,
      ariaDescribedBy: options.message ? data.messageId : null,
      // O foco começa em "Cancelar", a opção menos destrutiva (padrão ARIA de alertdialog).
      autoFocus: '[data-autofocus]',
      restoreFocus: true,
      maxWidth: 'calc(100vw - 2 * var(--space-4))',
    });
    return (await firstValueFrom(ref.closed)) === true;
  }
}
