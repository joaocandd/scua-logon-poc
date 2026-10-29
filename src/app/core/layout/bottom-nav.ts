import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../design-system';
import { NAV_ITEMS } from './nav-items';
import { PendingCount } from './pending-count';

/** Barra inferior do celular: Hoje, Aprovações e o botão "Mais", que abre as outras áreas. */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icon, PendingCount],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  /** Pedidos aguardando aprovação. Zero esconde o número. */
  readonly pendingCount = input(0);
  /** O painel "Mais" está aberto. */
  readonly moreOpen = input(false);
  /** A página atual é uma das áreas do "Mais": o botão fica marcado. */
  readonly moreActive = input(false);

  readonly openMore = output();

  protected readonly items = NAV_ITEMS.filter((item) => item.onMobileBar);
}
