import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Settings } from '../../../shared/models';

/** Configurações da empresa. O painel "Hoje" lê o custo médio da hora extra daqui. */
@Injectable({ providedIn: 'root' })
export class CompanySettings {
  private readonly http = inject(HttpClient);

  readonly current = httpResource<Settings>(() => '/api/configuracoes');

  /** Salva e já troca o valor em memória: quem lê `current` vê o novo sem buscar de novo. */
  async save(settings: Settings): Promise<Settings> {
    const saved = await firstValueFrom(this.http.put<Settings>('/api/configuracoes', settings));
    this.current.set(saved);
    return saved;
  }
}
