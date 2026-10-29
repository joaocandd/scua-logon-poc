import { LiveAnnouncer } from '@angular/cdk/a11y';
import { createGlobalPositionStrategy, createOverlayRef, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ElementRef, inject, Injectable, Injector, signal } from '@angular/core';
import { Button } from '../button/button';

export interface ToastOptions {
  message: string;
  /** Mostra o botão "Desfazer". É chamado se a pessoa clicar nele antes de o aviso sumir. */
  undo?: () => void;
  /** Tempo na tela, em milissegundos. Padrão: 10 s com "Desfazer" e 5 s sem. */
  duration?: number;
}

type Hold = 'hover' | 'focus';

/**
 * Aviso curto no rodapé da tela ("toast"), anunciado para leitor de tela. Um por vez: um aviso
 * novo substitui o anterior. O tempo para enquanto o mouse ou o foco estão no aviso, para dar
 * tempo de ler e de usar o "Desfazer" (WCAG 2.2.1).
 *
 * ```ts
 * this.toast.show({ message: 'Pedido aprovado', undo: () => this.requests.undo(id) });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class Toast {
  private readonly injector = inject(Injector);
  private readonly announcer = inject(LiveAnnouncer);
  private overlayRef?: OverlayRef;

  /** Aviso na tela agora (o painel desenha a partir deste signal). */
  readonly current = signal<ToastOptions | null>(null);

  private timer?: ReturnType<typeof setTimeout>;
  private remaining = 0;
  private startedAt = 0;
  private readonly holds = new Set<Hold>();

  show(options: ToastOptions): void {
    this.attachPanel();
    this.stopTimer();
    this.current.set(options);
    this.remaining = options.duration ?? (options.undo ? 10_000 : 5_000);
    this.startTimer();
    void this.announcer.announce(options.message, 'polite');
  }

  dismiss(): void {
    this.stopTimer();
    // O painel some da tela, então nenhum mouseleave ou focusout vai chegar.
    this.holds.clear();
    this.current.set(null);
  }

  /** Roda o "Desfazer" do aviso atual e fecha o aviso. */
  undo(): void {
    const undo = this.current()?.undo;
    this.dismiss();
    undo?.();
  }

  /** Pausa o tempo enquanto o mouse ou o foco estiverem no aviso. */
  hold(reason: Hold): void {
    if (this.holds.size === 0 && this.timer) {
      this.stopTimer();
      this.remaining -= Date.now() - this.startedAt;
    }
    this.holds.add(reason);
  }

  release(reason: Hold): void {
    this.holds.delete(reason);
    this.startTimer();
  }

  private startTimer(): void {
    if (this.holds.size > 0 || this.timer || !this.current()) return;
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.dismiss(), Math.max(this.remaining, 0));
  }

  private stopTimer(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private attachPanel(): void {
    if (this.overlayRef) return;
    this.overlayRef = createOverlayRef(this.injector, {
      positionStrategy: createGlobalPositionStrategy(this.injector)
        .centerHorizontally()
        .bottom('var(--space-4)'),
      maxWidth: 'calc(100vw - 2 * var(--space-4))',
    });
    this.overlayRef.attach(new ComponentPortal(ToastPanel));
  }
}

/** Desenho do aviso. Fica sempre no overlay; o serviço Toast diz o que mostrar. Não use direto. */
@Component({
  selector: 'app-toast-panel',
  imports: [Button],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  // Ouvintes no host, por delegação: o foco e o Esc vêm dos botões de dentro do aviso.
  host: {
    '(mouseenter)': 'toast.hold("hover")',
    '(mouseleave)': 'toast.release("hover")',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown.escape)': 'close()',
  },
})
export class ToastPanel {
  protected readonly toast = inject(Toast);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  /** Onde estava o foco antes de entrar no aviso, para devolver quando ele fechar. */
  private returnFocusTo: HTMLElement | null = null;

  protected onFocusIn(event: FocusEvent): void {
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !this.host.contains(from)) this.returnFocusTo = from;
    this.toast.hold('focus');
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.host.contains(event.relatedTarget as Node | null)) this.toast.release('focus');
  }

  protected undo(): void {
    this.restoreFocus();
    this.toast.undo();
  }

  protected close(): void {
    this.restoreFocus();
    this.toast.dismiss();
  }

  // Sem isso, o foco cairia no começo da página quando o botão clicado some.
  private restoreFocus(): void {
    if (this.host.contains(document.activeElement) && this.returnFocusTo?.isConnected) {
      this.returnFocusTo.focus();
    }
    this.returnFocusTo = null;
  }
}
