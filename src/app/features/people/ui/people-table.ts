import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../../design-system';
import { hoursLabel, NameOrder, PersonRow } from '../data/people-list';
import { PersonAvatar } from './person-avatar';

/**
 * Tabela dos colaboradores: nome (com as iniciais), matrícula, cargo, grupo, regra, estado da
 * estação agora e horas extras dos últimos 30 dias. O nome abre o perfil.
 *
 * Quando falta largura (no celular, ou com o perfil aberto ao lado), cada linha vira um cartão só
 * com CSS, por container query: o leitor de tela continua lendo uma tabela.
 */
@Component({
  selector: 'app-people-table',
  imports: [PersonAvatar, RouterLink, StatusBadge],
  templateUrl: './people-table.html',
  styleUrl: './people-table.scss',
})
export class PeopleTable {
  readonly rows = input.required<readonly PersonRow[]>();
  readonly order = input<NameOrder>('asc');
  /** Colaborador aberto no perfil: a linha fica marcada. */
  readonly selectedId = input<string | null>(null);

  protected readonly hoursLabel = hoursLabel;
}
