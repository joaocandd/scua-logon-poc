import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  signal,
  Type,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Event, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Icon } from '../../design-system';
import { ExtensionRequests } from '../../features/approvals/data/extension-requests';
import { BottomNav } from './bottom-nav';
import { MORE_SHEET_TITLE_ID, MoreSheet } from './more-sheet';
import { NAV_ITEMS } from './nav-items';
import { SideNav } from './side-nav';
import { UserMenu } from './user-menu';

/**
 * Casca do app: cabeçalho, navegação e a área principal onde as páginas aparecem.
 *
 * - Desktop (a partir de 1024 px): menu lateral com todas as áreas.
 * - Celular: barra inferior com Hoje, Aprovações e "Mais". A troca é só de CSS; a navegação
 *   escondida fica com `display: none`, fora do Tab e do leitor de tela.
 * - Ctrl+K ou Cmd+K abre a busca (paleta de comandos) em qualquer página. O código da busca só
 *   é baixado na primeira vez que alguém abre: fica fora do pacote inicial.
 * - Ao trocar de página, o foco vai para o <main>, para quem usa teclado ou leitor de tela
 *   começar pelo conteúdo novo.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Icon, SideNav, BottomNav, UserMenu],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
})
export class AppShell {
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly requests = inject(ExtensionRequests);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly pendingCount = computed(() => this.requests.pending().length);
  protected readonly paletteOpen = signal(false);
  protected readonly moreOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter(isNavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** A página atual está no "Mais" (Pessoas, Regras, Relatórios ou Configurações). */
  protected readonly moreActive = computed(() =>
    NAV_ITEMS.some((item) => !item.onMobileBar && isWithin(this.url(), item.path)),
  );

  private readonly isApple = /Mac|iPhone|iPad/.test(
    inject(DOCUMENT).defaultView?.navigator.userAgent ?? '',
  );
  /** Atalho mostrado no botão de busca. */
  protected readonly shortcut = this.isApple ? '⌘ K' : 'Ctrl K';

  private paletteRef?: DialogRef;

  constructor() {
    this.focusMainOnPageChange();
  }

  /** O link "Pular para o conteúdo" leva o foco ao <main> sem mudar a URL. */
  protected skipToContent(event: MouseEvent): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    const isShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
    if (!isShortcut || event.key.toLowerCase() !== 'k') return;
    // Com outro diálogo aberto (confirmação, "Mais"), o atalho não abre a busca por cima.
    if (!this.paletteRef && this.dialog.openDialogs.length > 0) return;
    event.preventDefault();
    void this.togglePalette();
  }

  protected async togglePalette(): Promise<void> {
    if (this.paletteRef) {
      this.paletteRef.close();
      return;
    }
    const { CommandPalette, COMMAND_PALETTE_LABEL_ID } = await import('./command-palette');
    if (this.paletteRef) return; // abriu por outro clique enquanto o código chegava
    this.paletteRef = this.openDialog(CommandPalette, this.paletteOpen, {
      ariaLabelledBy: COMMAND_PALETTE_LABEL_ID,
      width: '40rem',
      positionStrategy: createGlobalPositionStrategy(this.injector)
        .centerHorizontally()
        .top('10vh'),
    });
    this.paletteRef.closed.subscribe(() => (this.paletteRef = undefined));
  }

  protected openMore(): void {
    this.openDialog(MoreSheet, this.moreOpen, {
      ariaLabelledBy: MORE_SHEET_TITLE_ID,
      width: '100%',
      maxWidth: '32rem',
      positionStrategy: createGlobalPositionStrategy(this.injector)
        .centerHorizontally()
        .bottom('0'),
    });
  }

  /** Abre um diálogo do CDK e mantém `open` em dia, para o aria-expanded do botão que abriu. */
  private openDialog(
    component: Type<unknown>,
    open: WritableSignal<boolean>,
    config: DialogConfig<unknown, DialogRef>,
  ): DialogRef {
    const ref = this.dialog.open(component, {
      maxWidth: 'calc(100vw - 2 * var(--space-4))',
      restoreFocus: true,
      ...config,
    });
    open.set(true);
    ref.closed.subscribe(() => open.set(false));
    return ref;
  }

  private focusMainOnPageChange(): void {
    // No primeiro carregamento o foco fica no começo da página, como em qualquer site. Mudar só
    // a query (um filtro, a busca levando a /pessoas?grupo=...) também não move o foco.
    let path = this.router.navigated ? pathOf(this.router.url) : null;
    this.router.events.pipe(filter(isNavigationEnd), takeUntilDestroyed()).subscribe((event) => {
      const next = pathOf(event.urlAfterRedirects);
      if (path !== null && next !== path) {
        afterNextRender(() => this.main().nativeElement.focus(), { injector: this.injector });
      }
      path = next;
    });
  }
}

function isNavigationEnd(event: Event): event is NavigationEnd {
  return event instanceof NavigationEnd;
}

/** "/pessoas?grupo=grp-ti#topo" → "/pessoas". */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}

/** A URL é a página `path` ou uma página dentro dela (/regras/123). */
function isWithin(url: string, path: string): boolean {
  const current = pathOf(url);
  return current === path || current.startsWith(`${path}/`);
}
