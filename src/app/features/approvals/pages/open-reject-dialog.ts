import type { Dialog } from '@angular/cdk/dialog';
import type { RejectDialogData } from '../ui/reject-dialog';

let opening = false;

/**
 * Abre o diálogo de recusa e chama `onClosed` quando ele fecha. O diálogo e o Signal Forms que ele
 * usa (uns 17 kB com gzip) só são baixados no primeiro "Recusar": quem abre a caixa de aprovações
 * ou o link do e-mail para aprovar não espera por eles.
 *
 * Enquanto o código chega, um segundo clique não abre outro diálogo.
 */
export async function openRejectDialog(
  dialog: Dialog,
  data: RejectDialogData,
  onClosed: () => void,
): Promise<void> {
  if (opening || dialog.openDialogs.length > 0) return;
  opening = true;
  try {
    const { RejectDialog, REJECT_DIALOG_TITLE_ID } = await import('../ui/reject-dialog');
    const ref = dialog.open<boolean, RejectDialogData>(RejectDialog, {
      data,
      ariaLabelledBy: REJECT_DIALOG_TITLE_ID,
      maxWidth: 'calc(100vw - 2 * var(--space-4))',
      restoreFocus: true,
    });
    ref.closed.subscribe(onClosed);
  } finally {
    opening = false;
  }
}
