import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, STATUS_INFO } from '../../../design-system';
import { WORKSTATION_STATES, WorkstationState } from '../../../shared/models';
import { StationFilter } from '../data/stations';

/**
 * Contadores do painel "Hoje": quantas estações em cada estado. Cada contador é um link que abre a
 * lista daquele estado na própria página (`?estado=`, mantendo o grupo). O aberto leva
 * `aria-current`.
 *
 * O nome do link é o número e o rótulo, como está na tela ("12 Em jornada", WCAG 2.5.3). Ícone e
 * rótulo vêm do StatusBadge; no lugar da pílula, que não quebra linha, uma faixa no topo com a cor
 * do estado (laranja na liberada, hachura na bloqueada).
 */
@Component({
  selector: 'app-station-counters',
  imports: [Icon, RouterLink],
  templateUrl: './station-counters.html',
  styleUrl: './station-counters.scss',
})
export class StationCounters {
  readonly counts = input.required<Record<StationFilter, number>>();
  /** Lista aberta agora. */
  readonly selected = input<StationFilter | null>(null);
  /** A pessoa abriu a lista de um estado. */
  readonly opened = output<WorkstationState>();

  protected readonly states = WORKSTATION_STATES;
  protected readonly info = STATUS_INFO;
}
