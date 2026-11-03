import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FieldControl,
  PageHeader,
  Skeleton,
} from '../../../design-system';
import { toLocal } from '../../../shared/date';
import { injectNow } from '../../../shared/now';
import { People } from '../../people/data/people';
import { ApprovalInbox, INBOX_FILTERS, InboxFilter, visibleItems } from '../data/approval-inbox';
import { arrivalMessage, POLL_INTERVAL_MS, updatedLabel } from '../data/inbox-updates';
import { summaryOf, toCardView } from '../data/request-card-view';
import { RequestCard } from '../ui/request-card';
import { ApprovalActions } from './approval-actions';

/**
 * Caixa de aprovações (fluxo A, /aprovacoes): o gestor aprova com um toque, recusa com motivo ou
 * aprova vários de uma vez. Celular primeiro: uma coluna de cartões.
 *
 * Depois de decidir, o próprio cartão mostra o resultado e o "Desfazer", e o foco vai para esse
 * botão; o aviso (toast) também oferece "Desfazer" por 10 s. As ações e o estado de cada cartão
 * ficam no ApprovalActions, fornecido aqui.
 *
 * Filtros na URL (?filtro=decididos-hoje&grupo=grp-comercial): dá para compartilhar e voltar.
 *
 * O detalhe do pedido (/aprovacoes/:id) é rota filha: no celular, ocupa a página no lugar da
 * lista; no desktop (a partir de 64em), fica num painel ao lado. A troca é só de CSS, como na
 * casca. Ao fechar o detalhe, o foco volta para o "Ver detalhes" do cartão.
 *
 * Ao vivo: enquanto a página está aberta e visível, consulta os pedidos a cada 15 s e mostra
 * "Atualizado há X s". Pedido novo ganha a marca "Novo" e é anunciado numa região de status
 * (educada: o leitor de tela fala quando terminar o que está lendo). No modo demo
 * (?demo=ao-vivo), a API simulada cria um pedido a cada 30 s.
 */
@Component({
  selector: 'app-approvals-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    PageHeader,
    RequestCard,
    RouterOutlet,
    Skeleton,
  ],
  providers: [ApprovalActions],
  host: { '[class.has-detail]': 'detailOpen()' },
  templateUrl: './approvals-page.html',
  styleUrl: './approvals-page.scss',
})
export class ApprovalsPage {
  protected readonly inbox = inject(ApprovalInbox);
  protected readonly actions = inject(ApprovalActions);
  private readonly people = inject(People);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  protected readonly filters = INBOX_FILTERS;
  protected readonly summaryOf = summaryOf;
  /** Para os textos com hora ("Expira em 20 min"). */
  private readonly now = injectNow(30_000);
  /** Para o "Atualizado há X s", que muda a cada segundo sem redesenhar os cartões. */
  private readonly tick = injectNow(1000);

  /** Pedidos que chegaram enquanto a página estava aberta: ganham a marca "Novo". */
  protected readonly newIds = signal<ReadonlySet<string>>(new Set());
  /** A última consulta falhou; a lista na tela é a da consulta anterior. */
  protected readonly refreshFailed = signal(false);
  /** Há um pedido aberto no detalhe (rota filha ativa). */
  protected readonly detailOpen = signal(false);
  /** Pedido aberto por último no detalhe: o foco volta para o link dele quando o detalhe fecha. */
  private lastDetailId: string | null = null;

  /** Último anúncio de pedido novo, lido pela região de status. */
  private readonly announcement = signal('');
  private refreshing = false;

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filter = computed<InboxFilter>(() => {
    const value = this.query().get('filtro');
    return INBOX_FILTERS.find((f) => f.value === value)?.value ?? 'aguardando';
  });
  protected readonly groupId = computed(() => this.query().get('grupo') || null);
  private readonly groupName = computed(
    () => this.inbox.groups().find((g) => g.id === this.groupId())?.name ?? null,
  );

  protected readonly cards = computed(() => {
    const now = this.now();
    const session = this.actions.session();
    const items = visibleItems(this.inbox.items(), {
      filter: this.filter(),
      groupId: this.groupId(),
      today: toLocal(now).date,
      kept: new Set(session.keys()),
    });
    const options = { now, meId: this.inbox.meId(), employeeById: this.people.employeeById() };
    return items.map((item) =>
      toCardView(item, { ...options, session: session.get(item.request.id) }),
    );
  });

  /** Cartões que dá para marcar para aprovar em lote: os que aguardam o gestor, sem ação em curso. */
  private readonly selectable = computed(() =>
    this.cards().filter((card) => card.canDecide && card.busy === null),
  );
  /** Selecionados entre os que estão na tela. Trocar o filtro não aprova nada escondido. */
  protected readonly selectedCards = computed(() =>
    this.selectable().filter((card) => this.actions.selected().has(card.id)),
  );
  protected readonly selectableCount = computed(() => this.selectable().length);
  protected readonly allSelected = computed(
    () => this.selectableCount() > 0 && this.selectedCards().length === this.selectableCount(),
  );

  /** Quantos aguardam o gestor no grupo escolhido, ao lado do filtro "Aguardando". */
  protected readonly pendingCount = computed(
    () =>
      this.inbox
        .items()
        .filter((item) => !this.groupId() || item.employee.groupId === this.groupId())
        .filter((item) => item.request.status === 'aguardando_gestor').length,
  );

  protected readonly empty = computed(() => {
    const inGroup = this.groupName() ? ` em ${this.groupName()}` : '';
    const whenSomeoneAsks = 'Os pedidos de extensão aparecem aqui assim que alguém pedir.';
    switch (this.filter()) {
      case 'aguardando':
        return { heading: `Nenhum pedido aguardando${inGroup}`, description: whenSomeoneAsks };
      case 'decididos-hoje':
        return {
          heading: `Nenhum pedido decidido hoje${inGroup}`,
          description:
            'Os pedidos aprovados ou recusados hoje, por você ou por outro gestor, aparecem aqui.',
        };
      case 'todos':
        return { heading: `Nenhum pedido${inGroup}`, description: whenSomeoneAsks };
    }
  });

  /** Texto da região de status (leitor de tela). */
  protected readonly status = computed(() =>
    this.inbox.state() === 'loading' ? 'Carregando os pedidos' : this.announcement(),
  );

  protected readonly updated = computed(() => {
    const refreshedAt = this.inbox.refreshedAt();
    return refreshedAt === null ? null : updatedLabel(refreshedAt, this.tick());
  });

  constructor() {
    const timer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected setFilter(filter: InboxFilter): void {
    this.navigate({ filtro: filter === 'aguardando' ? null : filter });
  }

  protected setGroup(groupId: string): void {
    this.navigate({ grupo: groupId || null });
  }

  protected detailOpened(): void {
    this.detailOpen.set(true);
    this.lastDetailId = this.route.firstChild?.snapshot.paramMap.get('id') ?? null;
  }

  protected detailClosed(): void {
    this.detailOpen.set(false);
    const id = this.lastDetailId;
    if (!id) return;
    // Registrado antes do foco da casca: ela vê o foco já dentro do <main> e não mexe.
    afterNextRender(() => document.getElementById(`detalhes-${id}`)?.focus(), {
      injector: this.injector,
    });
  }

  protected selectAll(selected: boolean): void {
    this.actions.selectAll(
      this.selectable().map((card) => card.id),
      selected,
    );
  }

  /** "Limpar" some com a barra: o foco volta para "Selecionar todos". */
  protected clearSelection(): void {
    this.actions.selectAll([], false);
    afterNextRender(() => document.getElementById('selecionar-todos')?.focus(), {
      injector: this.injector,
    });
  }

  /**
   * Consulta os pedidos de novo. Pula se a aba está escondida, se a tela não está pronta ou se a
   * consulta anterior ainda não voltou.
   */
  private async refresh(): Promise<void> {
    if (this.refreshing || this.document.hidden || this.inbox.state() !== 'ready') return;
    this.refreshing = true;
    // Pedidos aguardando na tela agora: se outra pessoa decidir, eles ficam e mostram quem decidiu.
    const onScreen = this.cards()
      .filter((card) => card.canDecide)
      .map((card) => card.id);
    try {
      const added = await this.inbox.poll();
      this.refreshFailed.set(false);
      const stillPending = new Set(
        this.inbox
          .items()
          .filter((item) => item.request.status === 'aguardando_gestor')
          .map((item) => item.request.id),
      );
      this.actions.keep(onScreen.filter((id) => !stillPending.has(id)));
      const arrived = added.filter((item) => item.request.status === 'aguardando_gestor');
      if (arrived.length > 0) {
        this.newIds.update((ids) => new Set([...ids, ...arrived.map((i) => i.request.id)]));
        this.announcement.set(
          arrivalMessage(
            arrived.map((i) => ({
              employeeName: i.employee.name,
              requestedEnd: i.request.requestedEnd,
            })),
          ),
        );
      }
    } catch {
      this.refreshFailed.set(true);
    } finally {
      this.refreshing = false;
    }
  }

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
