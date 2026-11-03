import { HttpClient, httpResource } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Workstation } from '../../../shared/models';

/** Estado das estações agora, calculado pelo schedule-engine na API simulada. */
@Injectable({ providedIn: 'root' })
export class Workstations {
  private readonly http = inject(HttpClient);

  readonly list = httpResource<Workstation[]>(() => '/api/estacoes', { defaultValue: [] });

  /** Quando a lista chegou do servidor pela última vez, em milissegundos. */
  readonly refreshedAt = signal<number | null>(null);

  constructor() {
    // A primeira carga e o "Tentar de novo" também contam como atualização.
    effect(() => {
      if (this.list.status() === 'resolved') untracked(() => this.refreshedAt.set(Date.now()));
    });
  }

  /**
   * Busca a lista de novo sem tirar a atual da tela: se a chamada falhar, a lista continua e o
   * erro vai para quem chamou.
   */
  async poll(): Promise<void> {
    const latest = await firstValueFrom(this.http.get<Workstation[]>('/api/estacoes'));
    this.list.set(latest);
    this.refreshedAt.set(Date.now());
  }
}
