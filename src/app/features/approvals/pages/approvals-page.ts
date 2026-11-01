import { afterNextRender, Component, computed, inject, Injector } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { toCardView } from '../data/request-card-view';
import { RequestCard } from '../ui/request-card';
import { ApprovalActions, summaryOf } from './approval-actions';

/**
 * Caixa de aprovações (fluxo A, /aprovacoes): o gestor aprova com um toque, recusa com motivo ou
 * aprova vários de uma vez. Celular primeiro: uma coluna de cartões.
 *
 * Depois de decidir, o próprio cartão mostra o resultado e o "Desfazer", e o foco vai para esse
 * botão; o aviso (toast) também oferece "Desfazer" por 10 s. As ações e o estado de cada cartão
 * ficam no ApprovalActions, fornecido aqui.
 *
 * Filtros na URL (?filtro=decididos-hoje&grupo=grp-comercial): dá para compartilhar e voltar.
 */
@Component({
  selector: 'app-approvals-page',
  imports: [Button, EmptyState, ErrorState, Field, FieldControl, PageHeader, RequestCard, Skeleton],
  providers: [ApprovalActions],
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

  protected readonly filters = INBOX_FILTERS;
  protected readonly summaryOf = summaryOf;
  /** Para os textos com hora ("Expira em 20 min"). */
  private readonly now = injectNow(30_000);

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
    const whenSomeoneAsks = 'Pedidos de extensão aparecem aqui assim que alguém solicitar.';
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
    this.inbox.state() === 'loading' ? 'Carregando pedidos' : '',
  );

  protected setFilter(filter: InboxFilter): void {
    this.navigate({ filtro: filter === 'aguardando' ? null : filter });
  }

  protected setGroup(groupId: string): void {
    this.navigate({ grupo: groupId || null });
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

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
