import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DailyGroupStats } from '../../../shared/models';

/**
 * Série diária por grupo dos últimos 30 dias (horas extras, bloqueios e ausências). Na PoC, os
 * números são fictícios: a API simulada os inventa com semente fixa (mocks/history.ts).
 */
@Injectable({ providedIn: 'root' })
export class DailyReport {
  readonly list = httpResource<DailyGroupStats[]>(() => '/api/relatorios/diario', {
    defaultValue: [],
  });
}
