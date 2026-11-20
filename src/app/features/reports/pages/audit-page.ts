import { Component, computed, DOCUMENT, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FieldControl,
  Icon,
  PageHeader,
  Skeleton,
  Toast,
} from '../../../design-system';
import { downloadCsv } from '../../../shared/csv';
import { injectNow } from '../../../shared/now';
import { People } from '../../people/data/people';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { ActivityLog } from '../data/activity-log';
import {
  AUDIT_KINDS,
  AUDIT_PERIODS,
  auditCsv,
  auditPeople,
  auditRows,
  parseAuditPeriod,
  parseKind,
} from '../data/audit-log';
import { AuditTable } from '../ui/audit-table';

/**
 * Auditoria (/relatorios/auditoria): o registro de eventos, como acessos, pedidos, decisões,
 * decisões desfeitas e mudanças de regra. Filtro por pessoa, tipo e período na URL e "Exportar
 * CSV". O registro só é lido: nenhuma tela edita ou apaga um evento. Substitui os "Logs" do
 * console atual.
 */
@Component({
  selector: 'app-audit-page',
  imports: [
    AuditTable,
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    Icon,
    PageHeader,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.scss',
})
export class AuditPage {
  private readonly log = inject(ActivityLog);
  private readonly people = inject(People);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(Toast);
  private readonly now = injectNow(60_000);

  private readonly resources = [this.log.events, this.people.employees];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  protected readonly kinds = AUDIT_KINDS;
  protected readonly periods = AUDIT_PERIODS;

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly personId = computed(() => this.query().get('pessoa') || null);
  protected readonly kind = computed(() => parseKind(this.query().get('tipo')));
  protected readonly period = computed(() => parseAuditPeriod(this.query().get('periodo')));

  private readonly events = computed(() =>
    this.log.events.hasValue() ? this.log.events.value() : [],
  );
  protected readonly peopleOptions = computed(() =>
    auditPeople(this.events(), this.people.employeeById()),
  );
  protected readonly rows = computed(() =>
    auditRows(
      this.events(),
      this.people.employeeById(),
      { personId: this.personId(), kind: this.kind(), period: this.period() },
      this.now(),
    ),
  );
  protected readonly filtered = computed(
    () => !!this.personId() || !!this.kind() || this.period() !== '30',
  );

  protected readonly status = computed(() => {
    if (this.state() === 'loading') return 'Carregando o registro';
    if (this.state() !== 'ready') return '';
    const count = this.rows().length;
    return `${count} ${count === 1 ? 'evento' : 'eventos'}`;
  });

  constructor() {
    // Quem volta à auditoria vê o que aconteceu desde a última vez.
    if (this.log.events.hasValue()) this.log.events.reload();
  }

  protected setPerson(value: string): void {
    this.navigate({ pessoa: value || null });
  }

  protected setKind(value: string): void {
    this.navigate({ tipo: value || null });
  }

  protected setPeriod(value: string): void {
    this.navigate({ periodo: value === '30' ? null : value });
  }

  protected clearFilters(): void {
    this.navigate({ pessoa: null, tipo: null, periodo: null });
  }

  protected retry(): void {
    retryFailed(this.resources);
  }

  protected exportCsv(): void {
    const filename = `auditoria-${this.period() === 'hoje' ? 'hoje' : `${this.period()}-dias`}.csv`;
    downloadCsv(this.document, filename, auditCsv(this.rows()));
    this.toast.show({ message: `Arquivo ${filename} baixado.` });
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
