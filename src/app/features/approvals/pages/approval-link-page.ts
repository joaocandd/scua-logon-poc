import { Dialog } from '@angular/cdk/dialog';
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
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  ErrorState,
  Icon,
  IconName,
  Skeleton,
  StatusBadge,
  WorkdayTimeline,
} from '../../../design-system';
import { apiErrorMessage, apiErrorStatus } from '../../../shared/api-error';
import { ExtensionRequest } from '../../../shared/models';
import { injectNow } from '../../../shared/now';
import { approvalLinkResource, ApprovalLinkDecisions } from '../data/approval-link';
import { nowMarker } from '../data/request-detail';
import { CardSession, summaryOf, toCardView } from '../data/request-card-view';
import type { RejectDialogData } from '../ui/reject-dialog';
import { openRejectDialog } from './open-reject-dialog';
import { RequestContextList } from '../ui/request-context-list';
import { RequestDecision } from '../ui/request-decision';

/** Link que não serve mais: inválido (404 ou 403), expirado (410) ou já usado (409). */
type ClosedState = 'invalido' | 'expirado' | 'usado';
type LinkState = 'carregando' | 'erro' | ClosedState | 'pronto';

const CLOSED: Record<ClosedState, { title: string; icon: IconName }> = {
  invalido: { title: 'Link inválido', icon: 'error' },
  expirado: { title: 'Link expirado', icon: 'timer_off' },
  usado: { title: 'Pedido já decidido', icon: 'fact_check' },
};

/** Aviso depois de uma ação, numa região de status: visível e anunciado. */
interface Notice {
  text: string;
  tone: 'success' | 'error';
}

/**
 * Página pública que o gestor abre pelo link do e-mail (/aprovacao/:token), fora da casca do app.
 * Mostra o pedido com o mesmo contexto da caixa de aprovações e decide pelas mesmas rotas da API,
 * com o token. A API manda só o necessário para decidir: o link pode ser encaminhado (ADR 0010).
 *
 * Depois de aprovar ou recusar, a página confirma e mostra o "Desfazer" enquanto a API permitir.
 * Link inválido, expirado ou já usado mostra a mensagem da API. Em todos os casos, "Ver outros
 * pedidos pendentes" leva ao login, que devolve a pessoa para /aprovacoes.
 */
@Component({
  selector: 'app-approval-link-page',
  imports: [
    ErrorState,
    Icon,
    RequestContextList,
    RequestDecision,
    RouterLink,
    Skeleton,
    StatusBadge,
    WorkdayTimeline,
  ],
  templateUrl: './approval-link-page.html',
  styleUrl: './approval-link-page.scss',
})
export class ApprovalLinkPage {
  private readonly decisions = inject(ApprovalLinkDecisions);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly closedHeading = viewChild<ElementRef<HTMLElement>>('closedHeading');

  protected readonly pendingLink = { voltar: '/aprovacoes' };

  private readonly token = toSignal(this.route.paramMap.pipe(map((p) => p.get('token') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('token') ?? '',
  });
  protected readonly link = approvalLinkResource(() => this.token());
  private readonly now = injectNow(30_000);

  /** Estado do "Desfazer" e da ação em curso, como num cartão da caixa de aprovações. */
  private readonly session = signal<CardSession>({ decidedHere: false, busy: null });
  /** Outra pessoa decidiu enquanto a página estava aberta (409 ao decidir). */
  private readonly decidedElsewhere = signal<string | null>(null);
  protected readonly notice = signal<Notice | null>(null);

  protected readonly state = computed<LinkState>(() => {
    if (this.decidedElsewhere()) return 'usado';
    const error = this.link.error();
    if (error) {
      const status = apiErrorStatus(error);
      if (status === 404 || status === 403) return 'invalido';
      if (status === 410) return 'expirado';
      if (status === 409) return 'usado';
      return 'erro';
    }
    return this.link.hasValue() ? 'pronto' : 'carregando';
  });

  /** Título e ícone do link que não serve mais. */
  protected readonly closedInfo = computed(() => {
    const state = this.state();
    return state === 'invalido' || state === 'expirado' || state === 'usado' ? CLOSED[state] : null;
  });

  /** Mensagem da API para o link que não serve mais. */
  protected readonly closedMessage = computed(
    () => this.decidedElsewhere() ?? apiErrorMessage(this.link.error()),
  );

  protected readonly view = computed(() => {
    if (!this.link.hasValue()) return null;
    const link = this.link.value();
    return toCardView(
      {
        request: link.request,
        employee: { name: link.employeeName },
        group: { name: link.groupName },
        context: link.context,
      },
      { now: this.now(), meId: link.approverId, employeeById: new Map(), session: this.session() },
    );
  });
  protected readonly timeline = computed(() =>
    this.link.hasValue() ? this.link.value().timeline : null,
  );
  /**
   * A decisão está sendo salva, ou o link está sendo buscado de novo depois dela. Nesse meio-tempo,
   * as frases da linha do tempo ainda são as de antes da decisão: a tela mostra "Atualizando…".
   */
  protected readonly updating = computed(
    () => this.session().busy !== null || this.link.status() === 'reloading',
  );
  protected readonly nowMarker = computed(() =>
    this.link.hasValue() ? nowMarker(this.link.value().request.date, this.now()) : undefined,
  );

  protected async approve(): Promise<void> {
    const request = this.request();
    if (!request) return;
    this.start('approve');
    try {
      const updated = await this.decisions.approve(request.id, this.token());
      const next = updated.status === 'aguardando_rh' ? ' Agora vai para a validação do RH.' : '';
      this.decided(updated, `Pedido aprovado.${next}`);
      this.focus(`link-desfazer-${request.id}`);
    } catch (error) {
      this.failed(error, 'Não conseguimos aprovar o pedido. Tente de novo.');
    }
  }

  protected reject(): void {
    const view = this.view();
    const request = this.request();
    if (!view || !request) return;
    let focusAfterClose: string | null = null;
    const data: RejectDialogData = {
      employeeName: view.employeeName,
      summary: summaryOf(view),
      submit: async (reason) => {
        try {
          const updated = await this.decisions.reject(request.id, reason, this.token());
          this.decided(updated, 'Pedido recusado.');
          focusAfterClose = `link-desfazer-${request.id}`;
          return null;
        } catch (error) {
          if (apiErrorStatus(error) !== 409) {
            return apiErrorMessage(error, 'Não conseguimos recusar o pedido. Tente de novo.');
          }
          this.closeAsDecided(error);
          return null;
        }
      },
    };
    void openRejectDialog(this.dialog, data, () => {
      if (focusAfterClose) this.focus(focusAfterClose);
      else if (this.decidedElsewhere()) this.focusClosedHeading();
    });
  }

  protected async undo(): Promise<void> {
    const request = this.request();
    if (!request) return;
    this.start('undo');
    try {
      const updated = await this.decisions.undo(request.id, this.token());
      this.session.set({ decidedHere: false, busy: null });
      this.replaceRequest(updated);
      this.notice.set({ text: 'Decisão desfeita. O pedido voltou a aguardar.', tone: 'success' });
      this.focus(`link-aprovar-${request.id}`);
    } catch (error) {
      const message = apiErrorMessage(error, 'Não conseguimos desfazer. Tente de novo.');
      const blocked = apiErrorStatus(error) === 409;
      // Não dá mais (o RH decidiu ou o pedido venceu): o botão some e a página explica por quê.
      this.session.update((s) => ({ ...s, busy: null, ...(blocked && { undoError: message }) }));
      this.notice.set({ text: message, tone: 'error' });
      if (blocked) this.focus(`link-resultado-${request.id}`);
    }
  }

  private request(): ExtensionRequest | null {
    return this.link.hasValue() ? this.link.value().request : null;
  }

  private start(busy: CardSession['busy']): void {
    this.notice.set(null);
    this.session.update((s) => ({ ...s, busy }));
  }

  private decided(updated: ExtensionRequest, text: string): void {
    this.session.set({ decidedHere: true, busy: null });
    this.replaceRequest(updated);
    this.notice.set({ text, tone: 'success' });
  }

  /**
   * Troca o pedido pela resposta da API na hora e busca o link de novo, para a linha do tempo e as
   * frases de bloqueio acompanharem a decisão.
   */
  private replaceRequest(updated: ExtensionRequest): void {
    this.link.update((link) => link && { ...link, request: updated });
    this.link.reload();
  }

  private failed(error: unknown, fallback: string): void {
    this.session.update((s) => ({ ...s, busy: null }));
    if (apiErrorStatus(error) === 409) {
      this.closeAsDecided(error);
      this.focusClosedHeading();
      return;
    }
    this.notice.set({ text: apiErrorMessage(error, fallback), tone: 'error' });
  }

  /** Outra pessoa decidiu antes: a página mostra quem decidiu e quando. */
  private closeAsDecided(error: unknown): void {
    this.decidedElsewhere.set(apiErrorMessage(error));
  }

  private focusClosedHeading(): void {
    afterNextRender(() => this.closedHeading()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  /** Move o foco depois que a tela mostrar o elemento novo. */
  private focus(elementId: string): void {
    afterNextRender(() => document.getElementById(elementId)?.focus(), {
      injector: this.injector,
    });
  }
}
