import { Component, computed, DOCUMENT, inject } from '@angular/core';
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
  Toast,
} from '../../../design-system';
import { downloadCsv } from '../../../shared/csv';
import { formatDuration } from '../../../shared/time';
import { People } from '../../people/data/people';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { DailyReport } from '../data/daily-report';
import {
  absenceRate,
  byDay,
  byGroup,
  inGroup,
  inPeriod,
  parsePeriod,
  REPORT_PERIODS,
  ReportMetric,
  reportCsv,
  total,
} from '../data/report-series';
import { ReportBlock, ReportStat } from '../ui/report-block';

const hours = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
const minutes = (value: number) => `${value.toLocaleString('pt-BR')} min`;
const people = (value: number) => value.toLocaleString('pt-BR');

/**
 * Relatórios (/relatorios): horas extras, tempo de bloqueio e ausências, por dia e por grupo, nos
 * últimos 7 ou 30 dias. Substitui o "Tempo de Bloqueio" e o "Gráfico de Ausência" do console atual.
 *
 * O período e o grupo ficam na URL (`?periodo=7&grupo=grp-ti`): dá para compartilhar e voltar.
 * Cada bloco exporta o próprio CSV, com o mesmo recorte da tela. Os números são fictícios.
 */
@Component({
  selector: 'app-reports-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    PageHeader,
    ReportBlock,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage {
  private readonly report = inject(DailyReport);
  private readonly people = inject(People);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(Toast);

  private readonly resources = [this.report.list, this.people.groups];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  protected readonly periods = REPORT_PERIODS;

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly period = computed(() => parsePeriod(this.query().get('periodo')));
  protected readonly groups = computed(() =>
    [...(this.people.groups.hasValue() ? this.people.groups.value() : [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    ),
  );
  /** Grupo da URL, se existir. Um id que não existe vale como "todos". */
  protected readonly groupId = computed(() => {
    const id = this.query().get('grupo');
    return this.groups().some((g) => g.id === id) ? id : null;
  });
  protected readonly groupName = computed(
    () => this.groups().find((g) => g.id === this.groupId())?.name ?? null,
  );

  /** Linhas do período e do grupo escolhidos. */
  private readonly rows = computed(() =>
    inGroup(
      inPeriod(this.report.list.hasValue() ? this.report.list.value() : [], this.period()),
      this.groupId(),
    ),
  );
  protected readonly empty = computed(() => this.rows().length === 0);

  /** "nos últimos 30 dias · TI". */
  protected readonly scope = computed(
    () => `nos últimos ${this.period()} dias${this.groupName() ? ` · ${this.groupName()}` : ''}`,
  );

  protected readonly overtime = computed(() => {
    const rows = this.rows();
    const sum = total(rows, 'overtimeMinutes');
    const days = new Set(rows.filter((r) => r.overtimeMinutes > 0).map((r) => r.date)).size;
    return this.block('overtimeMinutes', [
      { label: 'Total no período', value: formatDuration(sum) },
      { label: 'Dias com hora extra', value: `${days} de ${this.period()}` },
      {
        label: 'Média nesses dias',
        value: days ? formatDuration(Math.round(sum / days)) : '0 min',
      },
    ]);
  });

  protected readonly blocked = computed(() => {
    const rows = this.rows();
    const sum = total(rows, 'blockedMinutes');
    const days = new Set(rows.map((r) => r.date)).size || 1;
    return this.block('blockedMinutes', [
      { label: 'Total no período', value: minutes(sum) },
      { label: 'Média por dia', value: minutes(Math.round(sum / days)) },
    ]);
  });

  protected readonly absences = computed(() => {
    const rows = this.rows();
    const rate = absenceRate(rows).toLocaleString('pt-BR', {
      style: 'percent',
      maximumFractionDigits: 1,
    });
    return this.block('absentCount', [
      { label: 'Ausências no período', value: people(total(rows, 'absentCount')) },
      { label: 'Taxa de ausência', value: rate },
    ]);
  });

  protected readonly formats = { hours, minutes, people };

  constructor() {
    // Quem volta aos relatórios vê os números de agora (uma aprovação na demo muda as horas extras).
    if (this.report.list.hasValue()) this.report.list.reload();
  }

  protected setPeriod(value: string): void {
    this.navigate({ periodo: value === '30' ? null : value });
  }

  protected setGroup(groupId: string): void {
    this.navigate({ grupo: groupId || null });
  }

  protected retry(): void {
    retryFailed(this.resources);
  }

  /** CSV do bloco, com o mesmo período e grupo da tela. */
  protected exportCsv(metric: ReportMetric, name: string): void {
    const group = this.groupName();
    const slug = group
      ? `-${group
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()}`
      : '';
    const filename = `${name}-${this.period()}-dias${slug.replaceAll(' ', '-')}.csv`;
    downloadCsv(this.document, filename, reportCsv(this.rows(), this.groups(), metric));
    this.toast.show({ message: `Arquivo ${filename} baixado.` });
  }

  private block(metric: ReportMetric, stats: ReportStat[]) {
    const rows = this.rows();
    return {
      stats,
      byDay: byDay(rows, metric),
      byGroup: this.groupId() ? null : byGroup(rows, this.groups(), metric),
    };
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
