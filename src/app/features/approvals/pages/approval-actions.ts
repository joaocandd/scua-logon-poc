import { Dialog } from '@angular/cdk/dialog';
import { afterNextRender, inject, Injectable, Injector, signal } from '@angular/core';
import { ConfirmDialog, Toast } from '../../../design-system';
import { apiErrorMessage, apiErrorStatus } from '../../../shared/api-error';
import { ApprovalInbox } from '../data/approval-inbox';
import { CardSession, RequestCardView } from '../data/request-card-view';
import { RejectDialog, REJECT_DIALOG_TITLE_ID, RejectDialogData } from '../ui/reject-dialog';

/** De onde veio a ação: o cartão na lista ou o painel de detalhe. Decide para onde vai o foco. */
export type ActionOrigin = 'lista' | 'detalhe';

/**
 * Id dos elementos que recebem o foco depois de uma ação. No desktop, a lista e o detalhe aparecem
 * juntos, então cada um tem os seus: `desfazer-ped-02` no cartão, `detalhe-desfazer-ped-02` no
 * detalhe.
 */
export function actionElementId(
  origin: ActionOrigin,
  kind: 'aprovar' | 'desfazer' | 'resultado',
  id: string,
): string {
  return origin === 'lista' ? `${kind}-${id}` : `detalhe-${kind}-${id}`;
}

/** "Até 19h30 (+2h30) · Entrega de proposta comercial". */
export function summaryOf(view: RequestCardView): string {
  return `${view.until} (${view.extra}) · ${view.reason}`;
}

/**
 * Ações da caixa de aprovações: aprovar, recusar, desfazer e aprovar em lote, com os avisos e o
 * foco depois de cada uma. Guarda o estado de cada cartão enquanto a página está aberta.
 *
 * Fornecido pela página (/aprovacoes), não pela raiz: a lista e o detalhe do pedido compartilham
 * o mesmo estado, e ele some quando a pessoa sai da página.
 */
@Injectable()
export class ApprovalActions {
  private readonly inbox = inject(ApprovalInbox);
  private readonly toast = inject(Toast);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmDialog);
  private readonly injector = inject(Injector);

  /**
   * Cartões com ação em andamento ou decididos nesta visita. Eles continuam na tela mesmo que não
   * combinem mais com o filtro, como o pedido que acabou de ser aprovado em "Aguardando".
   */
  readonly session = signal<ReadonlyMap<string, CardSession>>(new Map());
  /** Pedidos marcados para aprovar em lote. */
  readonly selected = signal<ReadonlySet<string>>(new Set());

  async approve(id: string, origin: ActionOrigin = 'lista'): Promise<void> {
    const name = this.nameOf(id);
    this.patch(id, { busy: 'approve' });
    this.select(id, false);
    try {
      const updated = await this.inbox.approve(id);
      this.patch(id, { busy: null, decidedHere: true, undoError: undefined });
      this.focus(actionElementId(origin, 'desfazer', id));
      const next = updated.status === 'aguardando_rh' ? ' Agora vai para a validação do RH.' : '';
      this.toast.show({
        message: `Pedido de ${name} aprovado.${next}`,
        undo: () => void this.undo(id, origin),
      });
    } catch (error) {
      if (apiErrorStatus(error) === 409) {
        await this.decidedElsewhere(id, error);
        this.focus(actionElementId(origin, 'resultado', id));
        return;
      }
      this.patch(id, { busy: null });
      this.toast.show({
        message: apiErrorMessage(error, 'Não conseguimos aprovar o pedido. Tente de novo.'),
      });
    }
  }

  /** Abre o diálogo de recusa. `summary`: o resumo do pedido mostrado no diálogo. */
  reject(id: string, summary: string, origin: ActionOrigin = 'lista'): void {
    const name = this.nameOf(id);
    let focusAfterClose: string | null = null;
    const data: RejectDialogData = {
      employeeName: name,
      summary,
      submit: async (reason) => {
        try {
          await this.inbox.reject(id, reason);
          this.patch(id, { busy: null, decidedHere: true, undoError: undefined });
          this.select(id, false);
          focusAfterClose = actionElementId(origin, 'desfazer', id);
          this.toast.show({
            message: `Pedido de ${name} recusado.`,
            undo: () => void this.undo(id, origin),
          });
          return null;
        } catch (error) {
          if (apiErrorStatus(error) !== 409) {
            return apiErrorMessage(error, 'Não conseguimos recusar o pedido. Tente de novo.');
          }
          // Outra pessoa decidiu antes: o diálogo fecha e o cartão mostra quem decidiu.
          await this.decidedElsewhere(id, error);
          focusAfterClose = actionElementId(origin, 'resultado', id);
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

  async undo(id: string, origin: ActionOrigin = 'lista'): Promise<void> {
    const name = this.nameOf(id);
    this.patch(id, { busy: 'undo' });
    try {
      await this.inbox.undo(id);
      this.patch(id, { busy: null, decidedHere: false, undoError: undefined });
      this.focus(actionElementId(origin, 'aprovar', id));
      this.toast.show({ message: `Decisão desfeita. O pedido de ${name} voltou a aguardar.` });
    } catch (error) {
      this.undoFailed(id, error, origin);
    }
  }

  /** Marca ou desmarca um pedido para aprovar em lote. */
  select(id: string, selected: boolean): void {
    this.selected.update((ids) => {
      const next = new Set(ids);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Marca todos os pedidos dados, ou desmarca todos. */
  selectAll(ids: readonly string[], selected: boolean): void {
    this.selected.set(new Set(selected ? ids : []));
  }

  /**
   * Aprova os pedidos selecionados depois de confirmar quantos e quais. Os cartões mostram o
   * resultado de cada um; o aviso resume e oferece "Desfazer" para todos os aprovados.
   */
  async approveMany(cards: readonly RequestCardView[]): Promise<void> {
    if (cards.length === 0) return;
    if (cards.length === 1) return this.approve(cards[0].id);

    const withAlerts = cards.some((card) => card.alerts.length > 0);
    const confirmed = await this.confirm.open({
      title: `Aprovar ${cards.length} pedidos?`,
      message: withAlerts
        ? 'Cada pessoa vai poder trabalhar até o horário pedido. Confira os alertas antes de aprovar.'
        : 'Cada pessoa vai poder trabalhar até o horário pedido.',
      items: cards.map((card) => {
        const alerts = card.alerts.map((alert) => ` · ${alert.title}`).join('');
        return `${card.employeeName}: ${card.until.toLowerCase()} (${card.extra})${alerts}`;
      }),
      confirmLabel: `Aprovar ${cards.length} pedidos`,
    });
    if (!confirmed) return;

    const ids = cards.map((card) => card.id);
    ids.forEach((id) => this.patch(id, { busy: 'approve' }));
    this.selectAll([], false);
    const results = await Promise.allSettled(ids.map((id) => this.inbox.approve(id)));

    const approved: string[] = [];
    const conflicts: string[] = [];
    let failed = 0;
    for (const [i, result] of results.entries()) {
      const id = ids[i];
      if (result.status === 'fulfilled') {
        approved.push(id);
        this.patch(id, { busy: null, decidedHere: true, undoError: undefined });
      } else if (apiErrorStatus(result.reason) === 409) {
        conflicts.push(id);
        this.patch(id, { busy: null, decidedHere: false });
        await this.inbox.refresh(id).catch(() => undefined);
      } else {
        failed++;
        this.patch(id, { busy: null });
      }
    }

    const first = approved[0] ?? conflicts[0];
    if (first) {
      this.focus(actionElementId('lista', approved.length ? 'desfazer' : 'resultado', first));
    }
    this.toast.show({
      message: batchMessage(approved.length, conflicts.length, failed),
      undo: approved.length ? () => void this.undoMany(approved) : undefined,
    });
  }

  private async undoMany(ids: readonly string[]): Promise<void> {
    ids.forEach((id) => this.patch(id, { busy: 'undo' }));
    const results = await Promise.allSettled(ids.map((id) => this.inbox.undo(id)));
    const undone = ids.filter((_, i) => results[i].status === 'fulfilled');
    for (const [i, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        this.patch(ids[i], { busy: null, decidedHere: false, undoError: undefined });
      } else {
        this.undoFailed(ids[i], result.reason, 'lista', false);
      }
    }
    if (undone.length) this.focus(actionElementId('lista', 'aprovar', undone[0]));
    this.toast.show({
      message:
        undone.length === ids.length
          ? `Decisões desfeitas. Os ${ids.length} pedidos voltaram a aguardar.`
          : `${undone.length} de ${ids.length} decisões desfeitas. Veja nos cartões por que as outras ficaram.`,
    });
  }

  /**
   * Se a API disse que não dá mais (o RH decidiu ou o pedido venceu), o botão some, o cartão
   * explica por quê e o foco vai para o resultado.
   */
  private undoFailed(id: string, error: unknown, origin: ActionOrigin, notify = true): void {
    const blocked = apiErrorStatus(error) === 409;
    const message = apiErrorMessage(error, 'Não conseguimos desfazer. Tente de novo.');
    this.patch(id, { busy: null, ...(blocked && { undoError: message }) });
    if (blocked) {
      this.focus(actionElementId(origin, 'resultado', id));
      void this.inbox.refresh(id).catch(() => undefined);
    }
    if (notify) this.toast.show({ message });
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

  private nameOf(id: string): string {
    return (
      this.inbox.items().find((item) => item.request.id === id)?.employee.name ?? 'colaborador'
    );
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
}

/** "3 pedidos aprovados.", com o que deu errado, se deu. */
function batchMessage(approved: number, conflicts: number, failed: number): string {
  const parts = [
    approved === 1 ? '1 pedido aprovado.' : `${approved} pedidos aprovados.`,
    conflicts === 1
      ? '1 já tinha sido decidido por outra pessoa.'
      : conflicts > 1
        ? `${conflicts} já tinham sido decididos por outra pessoa.`
        : '',
    failed === 1
      ? '1 não foi aprovado: tente de novo.'
      : failed > 1
        ? `${failed} não foram aprovados: tente de novo.`
        : '',
  ];
  return parts.filter(Boolean).join(' ');
}
