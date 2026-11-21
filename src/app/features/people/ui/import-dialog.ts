import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { Button, Icon } from '../../../design-system';
import { Group } from '../../../shared/models';
import {
  importLabel,
  ImportPreviewRow,
  previewRows,
  SAMPLE_FILE_NAME,
  SAMPLE_ROWS,
} from '../data/import-preview';

export interface ImportDialogData {
  /** Grupos que existem: a prévia confere o grupo de cada linha. */
  groups: readonly Group[];
}

/** Id do título, para o `ariaLabelledBy` de quem abre o diálogo. */
export const IMPORT_DIALOG_TITLE_ID = 'importar-titulo';

/**
 * Importar planilha (SIMULADO). Dois passos: escolher o arquivo (na PoC, só o arquivo de exemplo)
 * e conferir a prévia, com o erro de cada linha explicado. Fecha com o número de colaboradores
 * importados, ou nada se a pessoa cancelar. Nada é gravado.
 *
 * Aberto pelo Dialog do CDK: foco preso, Esc cancela e o foco volta para quem abriu.
 */
@Component({
  selector: 'app-import-dialog',
  imports: [Button, Icon],
  templateUrl: './import-dialog.html',
  styleUrl: './import-dialog.scss',
})
export class ImportDialog {
  private readonly data = inject<ImportDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<number>>(DialogRef);
  private readonly injector = inject(Injector);
  private readonly previewHeading = viewChild<ElementRef<HTMLElement>>('previewHeading');
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLElement> });

  protected readonly titleId = IMPORT_DIALOG_TITLE_ID;
  protected readonly fileName = SAMPLE_FILE_NAME;

  /** Linhas do arquivo escolhido. Nulo: ainda no primeiro passo. */
  protected readonly rows = signal<ImportPreviewRow[] | null>(null);
  protected readonly valid = computed(() => (this.rows() ?? []).filter((r) => !r.error));
  protected readonly invalidCount = computed(
    () => (this.rows() ?? []).length - this.valid().length,
  );
  protected readonly importLabel = computed(() => importLabel(this.valid().length));

  protected useSample(): void {
    this.rows.set(previewRows(SAMPLE_ROWS, this.data.groups));
    afterNextRender(() => this.previewHeading()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected chooseAnother(): void {
    this.rows.set(null);
    afterNextRender(() => this.chooseButton()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected confirm(): void {
    this.ref.close(this.valid().length);
  }
}
