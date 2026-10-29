import { DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Button, Icon } from '../../design-system';
import { NAV_ITEMS } from './nav-items';

/** Id do título. Também dá nome ao diálogo (ariaLabelledBy em quem abre). */
export const MORE_SHEET_TITLE_ID = 'mais-titulo';

/**
 * Painel "Mais" do celular: as áreas que não cabem na barra inferior. Abre num Dialog do CDK
 * (foco preso, Esc fecha, foco volta para o botão "Mais"). Escolher uma área fecha o painel.
 */
@Component({
  selector: 'app-more-sheet',
  imports: [RouterLink, RouterLinkActive, Button, Icon],
  templateUrl: './more-sheet.html',
  styleUrl: './more-sheet.scss',
})
export class MoreSheet {
  protected readonly ref = inject(DialogRef);
  protected readonly titleId = MORE_SHEET_TITLE_ID;
  protected readonly items = NAV_ITEMS.filter((item) => !item.onMobileBar);
}
