import { computed, inject, Injectable } from '@angular/core';
import { CurrentUser } from '../../../core/auth/current-user';
import { apiErrorStatus } from '../../../shared/api-error';
import { toLocal } from '../../../shared/date';
import { Employee, ExtensionRequest, Group, WorkSchedule } from '../../../shared/models';
import { appliesTo, isShift, PlannedShift, plannedShift } from '../../../shared/schedule-engine';
import { People } from '../../people/data/people';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { ExtensionRequests } from './extension-requests';
import { requestContext, RequestContext } from '../../../shared/request-context';
import { managerDecision } from '../../../shared/undo-decision';

/** Um pedido com o que a caixa de aprovações precisa para mostrar e decidir. */
export interface InboxItem {
  request: ExtensionRequest;
  employee: Employee;
  group: Group | undefined;
  schedule: WorkSchedule | undefined;
  /** Jornada prevista no dia do pedido. Nula sem regra de jornada ou em dia sem jornada. */
  shift: PlannedShift | null;
  /** Alertas e horas extras recentes. Nulo se o colaborador não tem regra de jornada. */
  context: RequestContext | null;
}

/** Estado da tela: carregando, erro, sem permissão (403) ou pronta. */
export type InboxState = 'loading' | 'error' | 'forbidden' | 'ready';

export type InboxFilter = 'aguardando' | 'decididos-hoje' | 'todos';

export const INBOX_FILTERS: readonly { value: InboxFilter; label: string }[] = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'decididos-hoje', label: 'Decididos hoje' },
  { value: 'todos', label: 'Todos' },
];

/**
 * Caixa de aprovações (fluxo A): junta os pedidos, as pessoas e as regras de jornada, e calcula o
 * contexto de cada pedido. A página só conhece esta fachada.
 */
@Injectable({ providedIn: 'root' })
export class ApprovalInbox {
  private readonly requests = inject(ExtensionRequests);
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);
  private readonly currentUser = inject(CurrentUser);

  private readonly resources = [
    this.requests.list,
    this.people.employees,
    this.people.groups,
    this.schedules.list,
    this.schedules.holidays,
    this.schedules.exceptions,
  ];
  readonly state = computed<InboxState>(() => {
    const errors = this.resources.map((r) => r.error()).filter((e) => e !== undefined);
    if (errors.some((e) => apiErrorStatus(e) === 403)) return 'forbidden';
    if (errors.length > 0) return 'error';
    const statuses = this.resources.map((r) => r.status());
    return statuses.includes('idle') || statuses.includes('loading') ? 'loading' : 'ready';
  });

  /**
   * "Tentar de novo" em andamento. O recurso continua com o erro antigo enquanto recarrega: a tela
   * fica no erro, com o botão em carregando, até a resposta chegar.
   */
  readonly retrying = computed(() => this.resources.some((r) => r.status() === 'reloading'));

  /** Quando os pedidos chegaram do servidor pela última vez, em milissegundos. */
  readonly refreshedAt = this.requests.refreshedAt.asReadonly();

  /** Quem está usando o app: as decisões dele aparecem como "por você". */
  readonly meId = computed(() => this.currentUser.profile()?.id ?? null);

  readonly groups = computed(() =>
    [...valueOf(this.people.groups)].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );

  readonly items = computed<InboxItem[]>(() => {
    const employees = this.people.employeeById();
    const groups = this.people.groupById();
    const schedules = valueOf(this.schedules.list);
    const holidays = valueOf(this.schedules.holidays);
    const exceptions = valueOf(this.schedules.exceptions);
    const requests = valueOf(this.requests.list);

    return requests.flatMap((request) => {
      const employee = employees.get(request.employeeId);
      if (!employee) return [];
      const schedule = schedules.find((s) => appliesTo(s, employee));
      const ownExceptions = exceptions.filter((e) => e.employeeId === employee.id);
      const day = schedule && plannedShift(schedule, ownExceptions, holidays, request.date);
      const context =
        schedule &&
        requestContext({
          request,
          schedule,
          exceptions: ownExceptions,
          holidays,
          history: requests.filter((r) => r.employeeId === employee.id),
        });
      return [
        {
          request,
          employee,
          group: groups.get(employee.groupId),
          schedule,
          shift: day && isShift(day) ? day : null,
          context: context ?? null,
        },
      ];
    });
  });

  approve(id: string): Promise<ExtensionRequest> {
    return this.requests.approve(id);
  }

  reject(id: string, reason: string): Promise<ExtensionRequest> {
    return this.requests.reject(id, reason);
  }

  undo(id: string): Promise<ExtensionRequest> {
    return this.requests.undo(id);
  }

  refresh(id: string): Promise<ExtensionRequest> {
    return this.requests.refresh(id);
  }

  /**
   * Consulta os pedidos de novo, sem tirar a lista da tela. Devolve os que chegaram, já com o
   * colaborador, para o anúncio "Novo pedido de...". Se falhar, o erro sobe e a lista continua.
   */
  async poll(): Promise<InboxItem[]> {
    const added = new Set((await this.requests.poll()).map((r) => r.id));
    return this.items().filter((item) => added.has(item.request.id));
  }

  /** "Tentar de novo": recarrega o que falhou. */
  retry(): void {
    for (const resource of this.resources) {
      if (resource.error()) resource.reload();
    }
  }
}

export interface VisibleOptions {
  filter: InboxFilter;
  /** Só os pedidos deste grupo. Nulo: todos os grupos. */
  groupId: string | null;
  /** Hoje, "AAAA-MM-DD" em São Paulo. */
  today: string;
  /**
   * Pedidos que continuam na tela mesmo sem combinar com o filtro, como o que a pessoa acabou de
   * aprovar em "Aguardando": o cartão mostra o resultado e o "Desfazer" em vez de sumir.
   */
  kept: ReadonlySet<string>;
}

/**
 * Pedidos visíveis, na ordem da tela:
 * - Aguardando: os que aguardam o gestor, do que expira antes para o que expira depois;
 * - Decididos hoje: decididos pelo gestor hoje, do mais recente para o mais antigo;
 * - Todos: os que aguardam o gestor primeiro, depois os outros, do mais novo para o mais antigo.
 */
export function visibleItems(items: readonly InboxItem[], options: VisibleOptions): InboxItem[] {
  const { filter, groupId, today, kept } = options;
  const inGroup = items.filter((item) => !groupId || item.employee.groupId === groupId);
  const pending = (item: InboxItem) => item.request.status === 'aguardando_gestor';
  const byExpiry = (a: InboxItem, b: InboxItem) =>
    a.request.expiresAt.localeCompare(b.request.expiresAt);

  switch (filter) {
    case 'aguardando':
      return inGroup.filter((item) => pending(item) || kept.has(item.request.id)).sort(byExpiry);
    case 'decididos-hoje': {
      const decidedAt = (item: InboxItem) => managerDecision(item.request)?.at ?? '';
      return inGroup
        .filter((item) => {
          const at = decidedAt(item);
          return (at && toLocal(at).date === today) || kept.has(item.request.id);
        })
        .sort((a, b) => decidedAt(b).localeCompare(decidedAt(a)));
    }
    case 'todos':
      return [
        ...inGroup.filter(pending).sort(byExpiry),
        ...inGroup
          .filter((item) => !pending(item))
          .sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt)),
      ];
  }
}

/** Valor do recurso, ou lista vazia enquanto carrega ou se falhou. */
function valueOf<T>(resource: { hasValue(): boolean; value(): T[] }): T[] {
  return resource.hasValue() ? resource.value() : [];
}
