import { Component, input } from '@angular/core';
import { StatusBadge } from '../../../design-system';
import { StationRow } from '../data/stations';

/**
 * Lista de estações do painel "Hoje": colaborador, grupo, estado e motivo. Como a lista de regras,
 * é uma tabela no desktop; abaixo de 48em, cada linha vira um cartão só com CSS, e o leitor de
 * tela continua lendo uma tabela.
 */
@Component({
  selector: 'app-station-list',
  imports: [StatusBadge],
  templateUrl: './station-list.html',
  styleUrl: './station-list.scss',
})
export class StationList {
  readonly rows = input.required<readonly StationRow[]>();
  /** Nome da tabela para o leitor de tela, como "Bloqueada". */
  readonly caption = input.required<string>();
}
