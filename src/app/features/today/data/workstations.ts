import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import { Workstation, WORKSTATION_STATES, WorkstationState } from '../../../shared/models';

/** Estado das estações agora, calculado pelo schedule-engine na API simulada. */
@Injectable({ providedIn: 'root' })
export class Workstations {
  readonly list = httpResource<Workstation[]>(() => '/api/estacoes', { defaultValue: [] });

  /** Quantas estações em cada estado, para os contadores do painel "Hoje". */
  readonly countByState = computed(() => {
    const counts = Object.fromEntries(WORKSTATION_STATES.map((state) => [state, 0])) as Record<
      WorkstationState,
      number
    >;
    for (const { state } of this.list.hasValue() ? this.list.value() : []) counts[state]++;
    return counts;
  });
}
