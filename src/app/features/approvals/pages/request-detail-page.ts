import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Injector,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Button, Icon, Skeleton, StatusBadge, WorkdayTimeline } from '../../../design-system';
import { injectNow } from '../../../shared/now';
import { People } from '../../people/data/people';
import { ApprovalInbox } from '../data/approval-inbox';
import { summaryOf, toCardView } from '../data/request-card-view';
import { requestTimeline } from '../../../shared/request-timeline';
import { historyEntries, nowMarker } from '../data/request-detail';
import { requestHistory } from '../data/request-history';
import { RequestContextList } from '../ui/request-context-list';
import { RequestDecision } from '../ui/request-decision';
import { ApprovalActions } from './approval-actions';

/**
 * Detalhe do pedido (/aprovacoes/:id): a linha do tempo do dia (jornada, intervalos, hora extra
 * pedida e quando a estação bloqueia) e o histórico do pedido, além das mesmas ações do cartão.
 *
 * É rota filha da caixa de aprovações. No celular, ocupa a página no lugar da lista; no desktop,
 * fica num painel ao lado dela. A troca é só de CSS, na página da caixa. As ações usam o
 * ApprovalActions da caixa: o cartão e o detalhe mostram o mesmo estado.
 *
 * Ao abrir (ou trocar de pedido), o foco vai para o nome no título do detalhe.
 */
@Component({
  selector: 'app-request-detail-page',
  imports: [
    Button,
    Icon,
    RequestContextList,
    RequestDecision,
    RouterLink,
    Skeleton,
    StatusBadge,
    WorkdayTimeline,
  ],
  templateUrl: './request-detail-page.html',
  styleUrl: './request-detail-page.scss',
})
export class RequestDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly inbox = inject(ApprovalInbox);
  protected readonly actions = inject(ApprovalActions);
  private readonly people = inject(People);
  private readonly injector = inject(Injector);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly summaryOf = summaryOf;
  private readonly now = injectNow(30_000);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });
  protected readonly item = computed(
    () => this.inbox.items().find((item) => item.request.id === this.id()) ?? null,
  );
  protected readonly view = computed(() => {
    const item = this.item();
    if (!item) return null;
    return toCardView(item, {
      now: this.now(),
      meId: this.inbox.meId(),
      employeeById: this.people.employeeById(),
      session: this.actions.session().get(item.request.id),
    });
  });
  protected readonly timeline = computed(() => {
    const item = this.item();
    return item ? requestTimeline(item.request, item.employee.name, item.shift) : null;
  });
  protected readonly nowMarker = computed(() => {
    const item = this.item();
    return item ? nowMarker(item.request.date, this.now()) : undefined;
  });

  protected readonly history = requestHistory(() => this.id());
  protected readonly entries = computed(() =>
    this.history.hasValue() ? historyEntries(this.history.value()) : [],
  );
  /** Muda quando o pedido é decidido ou desfeito: o histórico é buscado de novo. */
  private readonly version = computed(() => {
    const request = this.item()?.request;
    return request ? `${request.status}:${request.decisions.length}` : '';
  });

  constructor() {
    // No primeiro carregamento da página, o foco fica onde o navegador põe, como em qualquer site.
    let focusedId: string | null = inject(Router).navigated ? null : this.id();
    effect(() => {
      const id = this.id();
      const ready = this.inbox.state() === 'ready';
      if (!ready || id === focusedId) return;
      focusedId = id;
      afterNextRender(() => this.focusHeading(), { injector: this.injector });
    });

    let lastVersion = '';
    effect(() => {
      const version = this.version();
      if (lastVersion && version !== lastVersion) untracked(() => this.history.reload());
      lastVersion = version;
    });
  }

  /**
   * Foco no nome do pedido. No celular, o detalhe é uma página nova e começa do topo; no desktop,
   * o painel fica ao lado da lista, que não pode perder a posição de rolagem.
   */
  private focusHeading(): void {
    const mobile = !this.window?.matchMedia('(min-width: 64em)').matches;
    if (mobile) this.window?.scrollTo(0, 0);
    this.heading()?.nativeElement.focus({ preventScroll: mobile });
  }
}
