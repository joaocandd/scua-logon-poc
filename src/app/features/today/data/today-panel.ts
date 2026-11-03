import { computed, inject, Injectable } from '@angular/core';
import { ExtensionRequests } from '../../approvals/data/extension-requests';
import { People } from '../../people/data/people';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { CompanySettings } from '../../settings/data/company-settings';
import { stationRows } from './stations';
import { Workstations } from './workstations';

/**
 * Painel "Hoje": junta as estações, os pedidos de extensão, as pessoas, as regras de jornada (com
 * feriados e exceções, para as horas extras) e o custo médio da hora extra. A página só conhece
 * esta fachada.
 */
@Injectable({ providedIn: 'root' })
export class TodayPanel {
  private readonly workstations = inject(Workstations);
  private readonly extensionRequests = inject(ExtensionRequests);
  private readonly people = inject(People);
  private readonly workSchedules = inject(WorkSchedules);
  private readonly settings = inject(CompanySettings);

  private readonly resources = [
    this.workstations.list,
    this.extensionRequests.list,
    this.people.employees,
    this.people.groups,
    this.workSchedules.list,
    this.workSchedules.holidays,
    this.workSchedules.exceptions,
    this.settings.current,
  ];
  readonly state = computed(() => loadState(this.resources));
  readonly retrying = computed(() => isRetrying(this.resources));

  /** Quando os dados chegaram do servidor pela última vez: o mais antigo dos dois que mudam. */
  readonly refreshedAt = computed(() => {
    const times = [this.workstations.refreshedAt(), this.extensionRequests.refreshedAt()];
    return times.includes(null) ? null : Math.min(...(times as number[]));
  });

  readonly groups = computed(() =>
    [...valueOf(this.people.groups)].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  readonly employees = computed(() => valueOf(this.people.employees));
  readonly employeeById = this.people.employeeById;
  readonly requests = computed(() => valueOf(this.extensionRequests.list));
  readonly schedules = computed(() => valueOf(this.workSchedules.list));
  readonly holidays = computed(() => valueOf(this.workSchedules.holidays));
  readonly exceptions = computed(() => valueOf(this.workSchedules.exceptions));
  /** Custo médio da hora extra, em reais. Zero enquanto carrega. */
  readonly hourlyCost = computed(() =>
    this.settings.current.hasValue() ? this.settings.current.value().overtimeHourlyCost : 0,
  );

  /** Todas as estações, de todos os grupos. */
  readonly stations = computed(() =>
    stationRows(
      valueOf(this.workstations.list),
      this.people.employeeById(),
      this.people.groupById(),
    ),
  );

  /**
   * Consulta as estações e os pedidos de novo, sem tirar o painel da tela. Se falhar, o erro sobe e
   * o painel continua.
   */
  async poll(): Promise<void> {
    await Promise.all([this.workstations.poll(), this.extensionRequests.poll()]);
  }

  /** "Tentar de novo": recarrega o que falhou. */
  retry(): void {
    retryFailed(this.resources);
  }
}

/** Valor do recurso, ou lista vazia enquanto carrega ou se falhou. */
function valueOf<T>(resource: { hasValue(): boolean; value(): T[] }): T[] {
  return resource.hasValue() ? resource.value() : [];
}
