import { Dialog } from '@angular/cdk/dialog';
import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
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
  Toast,
} from '../../../design-system';
import { apiErrorMessage, apiErrorStatus } from '../../../shared/api-error';
import { toLocal } from '../../../shared/date';
import { injectNow } from '../../../shared/now';
import { People } from '../../people/data/people';
import {
  ApprovalInbox,
  INBOX_FILTERS,
  InboxFilter,
  InboxItem,
  visibleItems,
} from '../data/approval-inbox';
import { CardSession, toCardView } from '../data/request-card-view';
import { RejectDialog, REJECT_DIALOG_TITLE_ID, RejectDialogData } from '../ui/reject-dialog';
import { RequestCard } from '../ui/request-card';

/**
 * Caixa de aprovações (fluxo A, /aprovacoes): o gestor aprova com um toque ou recusa com motivo.
 * Celular primeiro: uma coluna de cartões.
 *
 * Depois de decidir, o próprio cartão mostra o resultado e o "Desfazer", e o foco vai para esse
 * botão; o aviso (toast) também oferece "Desfazer" por 10 s. O cartão decidido continua na tela
 * enquanto a pessoa estiver na página, mesmo que não combine mais com o filtro.
 *
 * Filtros na URL (?filtro=decididos-hoje&grupo=grp-comercial): dá para compartilhar e voltar.
 */
@Component({
  selector: 'app-approvals-page',
  imports: [Button, EmptyState, ErrorState, Field, FieldControl, PageHeader, RequestCard, Skeleton],
  templateUrl: './approvals-page.html',
  styleUrl: './approvals-page.scss',
})
export class ApprovalsPage {
  protected readonly inbox = inject(ApprovalInbox);
  private readonly people = inject(People);
  private readonly toast = inject(Toast);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);

  protected readonly filters = INBOX_FILTERS;
  /** Para os textos com hora ("Expira em 20 min"). */
  private readonly now = injectNow(30_000);
  /** Cartões com ação em andamento ou decididos nesta visita. */
  private readonly session = signal<ReadonlyMap<string, CardSession>>(new Map());

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
    const session = this.session();
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

  protected async approve(id: string): Promise<void> {
    const item = this.itemOf(id);
    if (!item) return;
    this.patch(id, { busy: 'approve' });
    try {
      const updated = await this.inbox.approve(id);
      this.patch(id, { busy: null, decidedHere: true, undoError: undefined });
      this.focus(`desfazer-${id}`);
      const next = updated.status === 'aguardando_rh' ? ' Agora vai para a validação do RH.' : '';
      this.toast.show({
        message: `Pedido de ${item.employee.name} aprovado.${next}`,
        undo: () => void this.undo(id),
      });
    } catch (error) {
      await this.decisionFailed(id, error, 'Não conseguimos aprovar o pedido. Tente de novo.');
    }
  }

  protected reject(id: string): void {
    const item = this.itemOf(id);
    if (!item) return;
    const card = this.cards().find((c) => c.id === id);
    let focusAfterClose: string | null = null;
    const data: RejectDialogData = {
      employeeName: item.employee.name,
      summary: `${card?.until} (${card?.extra}) · ${item.request.reason}`,
      submit: async (reason) => {
        try {
          await this.inbox.reject(id, reason);
          this.patch(id, { busy: null, decidedHere: true, undoError: undefined });
          focusAfterClose = `desfazer-${id}`;
          this.toast.show({
            message: `Pedido de ${item.employee.name} recusado.`,
            undo: () => void this.undo(id),
          });
          return null;
        } catch (error) {
          if (apiErrorStatus(error) !== 409) {
            return apiErrorMessage(error, 'Não conseguimos recusar o pedido. Tente de novo.');
          }
          // Outra pessoa decidiu antes: o diálogo fecha e o cartão mostra quem decidiu.
          await this.decidedElsewhere(id, error);
          focusAfterClose = `resultado-${id}`;
          return null;
        }
      },
    };
    const ref = this.dialog.open<boolean, RejectDialogData>(RejectDialog, {
      data,
      ariaLabelledBy: REJECT_DIALOG_TITLE_ID,
      maxWidth: 'calc(100vw - 2 * var(--space-4))',
      restoreFocus: true,
    });
    // O diálogo devolve o foco ao "Recusar", que some quando o cartão mostra o resultado.
    ref.closed.subscribe(() => {
      if (focusAfterClose) this.focus(focusAfterClose);
    });
  }

  protected async undo(id: string): Promise<void> {
    const item = this.itemOf(id);
    if (!item) return;
    this.patch(id, { busy: 'undo' });
    try {
      await this.inbox.undo(id);
      this.patch(id, { busy: null, decidedHere: false, undoError: undefined });
      this.focus(`aprovar-${id}`);
      this.toast.show({
        message: `Decisão desfeita. O pedido de ${item.employee.name} voltou a aguardar.`,
      });
    } catch (error) {
      const blocked = apiErrorStatus(error) === 409;
      const message = apiErrorMessage(error, 'Não conseguimos desfazer. Tente de novo.');
      // Se a API disse que não dá mais (o RH decidiu ou o pedido venceu), o botão some e o cartão
      // explica por quê; o foco vai para o resultado.
      this.patch(id, { busy: null, ...(blocked && { undoError: message }) });
      if (blocked) {
        this.focus(`resultado-${id}`);
        await this.inbox.refresh(id).catch(() => undefined);
      }
      this.toast.show({ message });
    }
  }

  private async decisionFailed(id: string, error: unknown, fallback: string): Promise<void> {
    if (apiErrorStatus(error) === 409) {
      await this.decidedElsewhere(id, error);
      this.focus(`resultado-${id}`);
      return;
    }
    this.patch(id, { busy: null });
    this.toast.show({ message: apiErrorMessage(error, fallback) });
  }

  /**
   * Outra pessoa decidiu antes (409): busca o pedido de novo e o cartão fica na tela mostrando
   * "Aprovado por Marina às 18h03", sem os botões.
   */
  private async decidedElsewhere(id: string, error: unknown): Promise<void> {
    this.patch(id, { busy: null, decidedHere: false });
    this.toast.show({ message: apiErrorMessage(error) });
    await this.inbox.refresh(id).catch(() => undefined);
  }

  private itemOf(id: string): InboxItem | undefined {
    return this.inbox.items().find((item) => item.request.id === id);
  }

  private patch(id: string, changes: Partial<CardSession>): void {
    this.session.update((sessions) => {
      const current = sessions.get(id) ?? { decidedHere: false, busy: null };
      return new Map(sessions).set(id, { ...current, ...changes });
    });
  }

  /** Move o foco depois que a tela mostrar o elemento novo. */
  private focus(elementId: string): void {
    afterNextRender(() => document.getElementById(elementId)?.focus(), {
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
