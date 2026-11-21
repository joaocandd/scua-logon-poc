import { Component, computed, inject, signal } from '@angular/core';
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
import { injectNow } from '../../../shared/now';
import { People } from '../../people/data/people';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { parseFilter, STATION_FILTERS, StationFilter } from '../../today/data/stations';
import { WorkstationDirectory } from '../data/workstation-directory';
import { countLabel, filterWorkstations, workstationRows } from '../data/workstation-list';
import { WorkstationTable } from '../ui/workstation-table';

/**
 * Estações (/estacoes): cada estação controlada, com a máquina, o colaborador, o grupo, o estado
 * agora (pelo motor de regras), a regra e a última atividade. Busca por nome ou máquina e filtros
 * de estado e grupo, todos na URL (`?busca=&estado=&grupo=`), como no painel "Hoje".
 *
 * Desktop primeiro: uma tabela; no celular, cada linha vira um cartão, com o mesmo HTML.
 */
@Component({
  selector: 'app-workstations-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    PageHeader,
    RouterLink,
    Skeleton,
    WorkstationTable,
  ],
  templateUrl: './workstations-page.html',
  styleUrl: './workstations-page.scss',
})
export class WorkstationsPage {
  private readonly directory = inject(WorkstationDirectory);
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Para "há 5 min", que muda com o tempo. */
  protected readonly now = injectNow(30_000);

  private readonly resources = [
    this.directory.list,
    this.people.employees,
    this.people.groups,
    this.schedules.list,
  ];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  /**
   * Texto da busca. Fica num signal da página, não lido de volta da URL: a URL muda depois de cada
   * tecla e, lida de volta, poderia apagar o que a pessoa acabou de digitar.
   */
  protected readonly search = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  protected readonly stateFilter = computed(() => parseFilter(this.query().get('estado')));
  protected readonly groupId = computed(() => this.query().get('grupo') || null);

  protected readonly stateOptions = STATION_FILTERS.map((value) => ({
    value,
    label: labelOf(value),
  }));
  protected readonly groups = computed(() =>
    [...(this.people.groups.hasValue() ? this.people.groups.value() : [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    ),
  );

  private readonly allRows = computed(() =>
    workstationRows(
      this.directory.list.hasValue() ? this.directory.list.value() : [],
      this.people.employeeById(),
      this.people.groupById(),
      this.schedules.list.hasValue() ? this.schedules.list.value() : [],
    ),
  );
  protected readonly rows = computed(() =>
    filterWorkstations(this.allRows(), {
      search: this.search(),
      state: this.stateFilter(),
      groupId: this.groupId(),
    }),
  );
  protected readonly hasStations = computed(() => this.allRows().length > 0);
  protected readonly filtered = computed(
    () => !!this.search() || !!this.stateFilter() || !!this.groupId(),
  );

  /** Lido pela região de status: quantas estações a lista mostra agora. */
  protected readonly status = computed(() => {
    if (this.state() === 'loading') return 'Carregando as estações';
    if (this.state() !== 'ready' || !this.hasStations()) return '';
    const shown = this.rows().length;
    return this.filtered() ? `${countLabel(shown)} de ${this.allRows().length}` : countLabel(shown);
  });

  constructor() {
    // Quem volta à lista vê o estado de agora.
    if (this.directory.list.hasValue()) this.directory.list.reload();
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.navigate({ busca: value.trim() ? value : null });
  }

  protected setState(value: string): void {
    this.navigate({ estado: value || null });
  }

  protected setGroup(value: string): void {
    this.navigate({ grupo: value || null });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.navigate({ busca: null, estado: null, grupo: null });
  }

  protected retry(): void {
    retryFailed(this.resources);
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

function labelOf(filter: StationFilter): string {
  return filter === 'sem_aprovacao' ? 'Liberada sem aprovação' : STATUS_INFO[filter].label;
}
