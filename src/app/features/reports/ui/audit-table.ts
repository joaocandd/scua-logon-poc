import { Component, input } from '@angular/core';
import { AuditRow } from '../data/audit-log';

/**
 * Tabela da auditoria: quando, tipo, quem e o que aconteceu. Só leitura, sem ações por linha.
 * Abaixo de 48em, cada linha vira um cartão só com CSS.
 */
@Component({
  selector: 'app-audit-table',
  templateUrl: './audit-table.html',
  styleUrl: './audit-table.scss',
})
export class AuditTable {
  readonly rows = input.required<readonly AuditRow[]>();
}
