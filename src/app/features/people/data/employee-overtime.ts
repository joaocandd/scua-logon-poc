import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DailyEmployeeOvertime } from '../../../shared/models';

/**
 * Horas extras aprovadas de cada colaborador nos últimos 30 dias (/api/relatorios/colaboradores).
 * Na PoC, fictícias: a mesma conta da série dos relatórios, por colaborador (mocks/history.ts).
 */
@Injectable({ providedIn: 'root' })
export class EmployeeOvertime {
  readonly list = httpResource<DailyEmployeeOvertime[]>(() => '/api/relatorios/colaboradores', {
    defaultValue: [],
  });
}
