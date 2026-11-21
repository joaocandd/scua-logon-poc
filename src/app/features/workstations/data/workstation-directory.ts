import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WorkstationDetail } from '../../../shared/models';

/**
 * Estações com nome da máquina, regra e última atividade (/api/estacoes). O estado vem do motor de
 * regras na API simulada; o nome da máquina e a última atividade são fictícios.
 */
@Injectable({ providedIn: 'root' })
export class WorkstationDirectory {
  readonly list = httpResource<WorkstationDetail[]>(() => '/api/estacoes', { defaultValue: [] });
}
