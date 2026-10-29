import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { Button } from '../button/button';
import type { ConfirmDialogData } from './confirm-dialog';

/** Conteúdo do diálogo aberto pelo serviço ConfirmDialog. Não use direto. */
@Component({
  selector: 'app-confirm-dialog-panel',
  imports: [Button],
  templateUrl: './confirm-dialog-panel.html',
  styleUrl: './confirm-dialog-panel.scss',
})
export class ConfirmDialogPanel {
  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}
