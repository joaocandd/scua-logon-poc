import { Component } from '@angular/core';
import { EmptyState, PageHeader } from '../../../design-system';

/** Relatórios (/relatorios): fora do escopo da prova de conceito. A tela diz o que a área teria. */
@Component({
  imports: [EmptyState, PageHeader],
  selector: 'app-reports-page',
  templateUrl: './reports-page.html',
})
export class ReportsPage {}
