import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../../design-system';
import { lastActivityLabel, WorkstationRow } from '../data/workstation-list';

/**
 * Tabela das estações: máquina, colaborador, grupo, estado (com o motivo), regra e última
 * atividade. Abaixo de 48em, cada linha vira um cartão só com CSS; o leitor de tela continua
 * lendo uma tabela.
 */
@Component({
  selector: 'app-workstation-table',
  imports: [RouterLink, StatusBadge],
  templateUrl: './workstation-table.html',
  styleUrl: './workstation-table.scss',
})
export class WorkstationTable {
  readonly rows = input.required<readonly WorkstationRow[]>();
  /** Instante atual, para "há 5 min". */
  readonly now = input.required<number>();

  protected lastActivity(row: WorkstationRow): string {
    return lastActivityLabel(row.lastActivityAt, this.now());
  }
}
