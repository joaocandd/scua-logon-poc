import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../design-system';
import { NAV_ITEMS } from './nav-items';
import { PendingCount } from './pending-count';

/** Menu lateral do desktop (a partir de 1024 px), com todas as áreas. */
@Component({
  selector: 'app-side-nav',
  imports: [RouterLink, RouterLinkActive, Icon, PendingCount],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {
  /** Pedidos aguardando aprovação. Zero esconde o número. */
  readonly pendingCount = input(0);

  protected readonly items = NAV_ITEMS;
}
