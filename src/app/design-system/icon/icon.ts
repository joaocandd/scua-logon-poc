import { Component, computed, input } from '@angular/core';
import { ICON_VIEW_BOX, ICONS, IconName } from './icons';

/**
 * Ícone do Material Symbols em SVG. É sempre decorativo (aria-hidden): o sentido vem do texto
 * ao lado ou do aria-label do botão. O tamanho acompanha o texto e a cor é a do texto.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: { 'aria-hidden': 'true' },
})
export class Icon {
  readonly name = input.required<IconName>();

  protected readonly viewBox = ICON_VIEW_BOX;
  protected readonly path = computed(() => ICONS[this.name()]);
}
