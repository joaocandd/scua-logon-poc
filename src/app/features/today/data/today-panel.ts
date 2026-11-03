import { computed, inject, Injectable } from '@angular/core';
import { People } from '../../people/data/people';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { stationRows } from './stations';
import { Workstations } from './workstations';

/**
 * Painel "Hoje": junta as estações e as pessoas. A página só conhece esta fachada.
 */
@Injectable({ providedIn: 'root' })
export class TodayPanel {
  private readonly workstations = inject(Workstations);
  private readonly people = inject(People);

  private readonly resources = [this.workstations.list, this.people.employees, this.people.groups];
  readonly state = computed(() => loadState(this.resources));
  readonly retrying = computed(() => isRetrying(this.resources));

  /** Quando os dados chegaram do servidor pela última vez, em milissegundos. */
  readonly refreshedAt = this.workstations.refreshedAt.asReadonly();

  readonly groups = computed(() =>
    [...valueOf(this.people.groups)].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );

  /** Todas as estações, de todos os grupos. */
  readonly stations = computed(() =>
    stationRows(
      valueOf(this.workstations.list),
      this.people.employeeById(),
      this.people.groupById(),
    ),
  );

  /** Consulta de novo, sem tirar o painel da tela. Se falhar, o erro sobe e o painel continua. */
  poll(): Promise<void> {
    return this.workstations.poll();
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
