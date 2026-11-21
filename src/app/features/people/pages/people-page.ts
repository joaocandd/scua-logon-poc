import { Dialog } from '@angular/cdk/dialog';
import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FieldControl,
  PageHeader,
  Skeleton,
  STATUS_INFO,
  Toast,
} from '../../../design-system';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { parseFilter, STATION_FILTERS, StationFilter } from '../../today/data/stations';
import { WorkstationDirectory } from '../../workstations/data/workstation-directory';
import { EmployeeOvertime } from '../data/employee-overtime';
import { People } from '../data/people';
import { countLabel, filterPeople, parseOrder, personRows } from '../data/people-list';
import { IMPORT_DIALOG_TITLE_ID, ImportDialog, ImportDialogData } from '../ui/import-dialog';
import { PeopleTable } from '../ui/people-table';
import { PeopleTabs } from '../ui/people-tabs';

/**
 * Pessoas (/pessoas): os colaboradores com matrícula, cargo, grupo, regra, o estado da estação
 * agora (motor de regras) e as horas extras dos últimos 30 dias (a série dos relatórios). Busca por
 * nome ou matrícula, filtros de grupo, regra e estado e a ordem, todos na URL
 * (`?busca=&grupo=&regra=&estado=&ordem=`), como em /estacoes.
 *
 * O perfil (/pessoas/:id) é rota filha, como o detalhe de /aprovacoes: no celular, ocupa a página
 * no lugar da lista; no desktop (a partir de 64em), fica num painel ao lado. Com o painel aberto,
 * a tabela vira cartões (container query). Ao fechar o perfil, o foco volta para o nome na lista.
 */
@Component({
  selector: 'app-people-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    PageHeader,
    PeopleTable,
    PeopleTabs,
    RouterLink,
    RouterOutlet,
    Skeleton,
  ],
  host: { '[class.has-detail]': 'detailOpen()' },
  templateUrl: './people-page.html',
  styleUrl: './people-page.scss',
})
export class PeoplePage {
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);
  private readonly directory = inject(WorkstationDirectory);
  private readonly overtime = inject(EmployeeOvertime);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(Dialog);
  private readonly toast = inject(Toast);

  private readonly resources = [
    this.people.employees,
    this.people.groups,
    this.schedules.list,
    this.directory.list,
    this.overtime.list,
  ];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  /** Há um perfil aberto (rota filha ativa). */
  protected readonly detailOpen = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  /** Perfil aberto por último: o foco volta para o nome dele quando o perfil fecha. */
  private lastDetailId: string | null = null;

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  /** Texto da busca, num signal da página (como em /estacoes): a URL vem depois de cada tecla. */
  protected readonly search = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  protected readonly groupId = computed(() => this.query().get('grupo') || null);
  protected readonly scheduleId = computed(() => this.query().get('regra') || null);
  protected readonly stateFilter = computed(() => parseFilter(this.query().get('estado')));
  protected readonly order = computed(() => parseOrder(this.query().get('ordem')));

  protected readonly stateOptions = STATION_FILTERS.map((value) => ({
    value,
    label: labelOf(value),
  }));
  protected readonly groups = computed(() =>
    [...(this.people.groups.hasValue() ? this.people.groups.value() : [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    ),
  );
  protected readonly scheduleOptions = computed(() =>
    [...(this.schedules.list.hasValue() ? this.schedules.list.value() : [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    ),
  );

  private readonly allRows = computed(() =>
    personRows({
      employees: this.people.employees.hasValue() ? this.people.employees.value() : [],
      groupById: this.people.groupById(),
      schedules: this.schedules.list.hasValue() ? this.schedules.list.value() : [],
      workstations: this.directory.list.hasValue() ? this.directory.list.value() : [],
      overtime: this.overtime.list.hasValue() ? this.overtime.list.value() : [],
    }),
  );
  protected readonly rows = computed(() =>
    filterPeople(this.allRows(), {
      search: this.search(),
      groupId: this.groupId(),
      scheduleId: this.scheduleId(),
      state: this.stateFilter(),
      order: this.order(),
    }),
  );
  protected readonly hasPeople = computed(() => this.allRows().length > 0);
  private readonly filtered = computed(
    () => !!this.search() || !!this.groupId() || !!this.scheduleId() || !!this.stateFilter(),
  );

  /** Lido pela região de status: quantos colaboradores a lista mostra agora. */
  protected readonly status = computed(() => {
    if (this.state() === 'loading') return 'Carregando os colaboradores';
    if (this.state() !== 'ready' || !this.hasPeople()) return '';
    const shown = this.rows().length;
    return this.filtered() ? `${countLabel(shown)} de ${this.allRows().length}` : countLabel(shown);
  });

  constructor() {
    // Quem volta à lista vê o estado das estações de agora.
    if (this.directory.list.hasValue()) this.directory.list.reload();
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.navigate({ busca: value.trim() ? value : null });
  }

  protected setGroup(value: string): void {
    this.navigate({ grupo: value || null });
  }

  protected setSchedule(value: string): void {
    this.navigate({ regra: value || null });
  }

  protected setState(value: string): void {
    this.navigate({ estado: value || null });
  }

  protected setOrder(value: string): void {
    this.navigate({ ordem: value === 'desc' ? 'desc' : null });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.navigate({ busca: null, grupo: null, regra: null, estado: null });
  }

  /**
   * Importar planilha (substitui a "Carga de Dados" do console atual). SIMULADO: o diálogo mostra
   * a prévia do arquivo de exemplo e, ao confirmar, só o aviso; a lista não muda.
   */
  protected openImport(): void {
    if (this.dialog.openDialogs.length > 0) return;
    const ref = this.dialog.open<number, ImportDialogData>(ImportDialog, {
      data: { groups: this.groups() },
      ariaLabelledBy: IMPORT_DIALOG_TITLE_ID,
      maxWidth: 'calc(100vw - 2 * var(--space-4))',
      restoreFocus: true,
    });
    ref.closed.subscribe((imported) => {
      if (!imported) return;
      this.toast.show({
        message: `${imported} colaboradores importados. Simulação: a lista não muda nesta prova de conceito.`,
      });
    });
  }

  protected retry(): void {
    retryFailed(this.resources);
  }

  protected detailOpened(): void {
    this.detailOpen.set(true);
    this.lastDetailId = this.route.firstChild?.snapshot.paramMap.get('id') ?? null;
    this.selectedId.set(this.lastDetailId);
  }

  protected detailClosed(): void {
    this.detailOpen.set(false);
    this.selectedId.set(null);
    const id = this.lastDetailId;
    if (!id) return;
    // Registrado antes do foco da casca: ela vê o foco já dentro do <main> e não mexe.
    afterNextRender(() => document.getElementById(`pessoa-${id}`)?.focus(), {
      injector: this.injector,
    });
  }

  /** Muda só a query: com o perfil aberto, ele continua aberto. */
  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route.firstChild ?? this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

function labelOf(filter: StationFilter): string {
  return filter === 'sem_aprovacao' ? 'Liberada sem aprovação' : STATUS_INFO[filter].label;
}
