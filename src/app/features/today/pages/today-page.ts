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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FieldControl,
  PageHeader,
  Skeleton,
  STATUS_INFO,
} from '../../../design-system';
import { toLocal } from '../../../shared/date';
import { POLL_INTERVAL_MS, updatedLabel } from '../../../shared/live-updates';
import { injectNow } from '../../../shared/now';
import { pendingSummary, todayAlerts } from '../data/attention';
import { monthlyOvertime } from '../data/monthly-overtime';
import {
  countByFilter,
  emptyListText,
  inGroup,
  parseFilter,
  StationFilter,
} from '../data/stations';
import { TodayPanel } from '../data/today-panel';
import { OvertimeMonth } from '../ui/overtime-month';
import { PendingRequests } from '../ui/pending-requests';
import { StationCounters } from '../ui/station-counters';
import { StationList } from '../ui/station-list';
import { TodayAlerts } from '../ui/today-alerts';

/**
 * Painel "Hoje" (/hoje): como estão as estações agora e o que precisa de atenção. No topo, os
 * pedidos aguardando e os alertas; depois, os contadores das estações e as horas extras do mês.
 *
 * Os contadores abrem a lista do estado na própria página (`?estado=`), e o grupo também fica na
 * URL (`?grupo=`): dá para compartilhar e voltar. Mudar só a query não move o foco (a casca só
 * move ao trocar de página); a região de status diz qual lista abriu.
 *
 * Ao vivo: enquanto a página está aberta e visível, consulta a API a cada 15 s e mostra
 * "Atualizado há X s", como a caixa de aprovações.
 */
@Component({
  selector: 'app-today-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    OvertimeMonth,
    PageHeader,
    PendingRequests,
    RouterLink,
    Skeleton,
    StationCounters,
    StationList,
    TodayAlerts,
  ],
  templateUrl: './today-page.html',
  styleUrl: './today-page.scss',
})
export class TodayPage {
  protected readonly panel = inject(TodayPanel);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  /** Para os textos com hora ("Expira em 20 min"). */
  private readonly now = injectNow(30_000);
  /** Para o "Atualizado há X s", que muda a cada segundo sem refazer o resto. */
  private readonly tick = injectNow(1000);

  /** A última consulta falhou; o painel na tela é o da consulta anterior. */
  protected readonly refreshFailed = signal(false);
  private refreshing = false;
  /** Último anúncio, lido pela região de status. */
  private readonly announcement = signal('');

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly groupId = computed(() => this.query().get('grupo') || null);
  protected readonly groupName = computed(
    () => this.panel.groups().find((g) => g.id === this.groupId())?.name ?? null,
  );
  /** Lista aberta: um estado, ou as liberadas sem aprovação. Nula: nenhuma. */
  protected readonly filter = computed(() => parseFilter(this.query().get('estado')));

  protected readonly stations = computed(() => inGroup(this.panel.stations(), this.groupId()));
  protected readonly counts = computed(() => countByFilter(this.stations()));
  protected readonly listRows = computed(() =>
    this.stations().filter((row) => row.filter === this.filter()),
  );

  private readonly employees = computed(() => inGroup(this.panel.employees(), this.groupId()));
  protected readonly pending = computed(() =>
    pendingSummary(this.panel.requests(), this.panel.employeeById(), this.groupId(), this.now()),
  );
  protected readonly alerts = computed(() =>
    todayAlerts({
      stations: this.stations(),
      employees: this.employees(),
      requests: this.panel.requests(),
      schedules: this.panel.schedules(),
      now: this.now(),
    }),
  );

  protected readonly overtime = computed(() =>
    monthlyOvertime({
      requests: this.panel.requests(),
      employees: this.employees(),
      schedules: this.panel.schedules(),
      exceptions: this.panel.exceptions(),
      holidays: this.panel.holidays(),
      today: toLocal(this.now()).date,
    }),
  );

  protected readonly status = computed(() =>
    this.panel.state() === 'loading' ? 'Carregando o painel' : this.announcement(),
  );

  protected readonly updated = computed(() => {
    const refreshedAt = this.panel.refreshedAt();
    return refreshedAt === null ? null : updatedLabel(refreshedAt, this.tick());
  });

  constructor() {
    const timer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    // Quem volta ao painel vê os números de agora, sem esperar a próxima consulta.
    void this.refresh();
  }

  /** "Bloqueada", "Liberada sem aprovação". */
  protected labelOf(filter: StationFilter): string {
    return filter === 'sem_aprovacao' ? 'Liberada sem aprovação' : STATUS_INFO[filter].label;
  }

  protected emptyListText(filter: StationFilter): string {
    return emptyListText(filter, this.groupName());
  }

  protected setGroup(groupId: string): void {
    this.navigate({ grupo: groupId || null });
  }

  /** A lista abre abaixo dos contadores; a região de status diz qual e quantas estações. */
  protected listOpened(filter: StationFilter): void {
    const count = this.counts()[filter];
    this.announcement.set(
      `Lista aberta: ${this.labelOf(filter)}, ${count} ${count === 1 ? 'estação' : 'estações'}.`,
    );
  }

  /** "Fechar lista" some com a lista: o foco volta para o contador que a abriu. */
  protected closeList(filter: StationFilter): void {
    this.navigate({ estado: null });
    this.announcement.set('');
    const target = filter === 'sem_aprovacao' ? 'estacoes-titulo' : `contador-${filter}`;
    afterNextRender(() => this.document.getElementById(target)?.focus(), {
      injector: this.injector,
    });
  }

  /**
   * Consulta de novo. Pula se a aba está escondida, se o painel não está pronto ou se a consulta
   * anterior ainda não voltou.
   */
  private async refresh(): Promise<void> {
    if (this.refreshing || this.document.hidden || this.panel.state() !== 'ready') return;
    this.refreshing = true;
    try {
      await this.panel.poll();
      this.refreshFailed.set(false);
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
