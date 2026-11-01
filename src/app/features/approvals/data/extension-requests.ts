import { HttpClient, httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ExtensionRequest } from '../../../shared/models';

/** Pedidos de extensão: a caixa de aprovações (fluxo A) lê e decide por aqui. */
@Injectable({ providedIn: 'root' })
export class ExtensionRequests {
  private readonly http = inject(HttpClient);

  /** Todos os pedidos. `isLoading()`, `error()` e `reload()` vêm do httpResource. */
  readonly list = httpResource<ExtensionRequest[]>(() => '/api/pedidos', { defaultValue: [] });

  /** Quando a lista chegou do servidor pela última vez, em milissegundos. */
  readonly refreshedAt = signal<number | null>(null);

  /** Aguardando o gestor, do que vence antes para o que vence depois. */
  readonly pending = computed(() =>
    (this.list.hasValue() ? this.list.value() : [])
      .filter((r) => r.status === 'aguardando_gestor')
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
  );

  constructor() {
    // A primeira carga e o "Tentar de novo" também contam como atualização.
    effect(() => {
      if (this.list.status() === 'resolved') untracked(() => this.refreshedAt.set(Date.now()));
    });
  }

  /**
   * Aprova como gestor. Se a regra pedir validação do RH, o pedido passa para "aguardando_rh".
   * Se outra pessoa já decidiu, a API responde 409 dizendo quem e quando.
   */
  approve(id: string): Promise<ExtensionRequest> {
    const body = { step: 'gestor' };
    return this.replace(this.http.post<ExtensionRequest>(`/api/pedidos/${id}/aprovar`, body));
  }

  /** Recusa como gestor. O motivo é obrigatório. */
  reject(id: string, reason: string): Promise<ExtensionRequest> {
    const body = { reason, step: 'gestor' };
    return this.replace(this.http.post<ExtensionRequest>(`/api/pedidos/${id}/recusar`, body));
  }

  /** Desfaz a decisão do gestor: o pedido volta a aguardar o gestor. */
  undo(id: string): Promise<ExtensionRequest> {
    return this.replace(this.http.post<ExtensionRequest>(`/api/pedidos/${id}/desfazer`, {}));
  }

  /**
   * Busca a lista de novo sem tirar a atual da tela: se a chamada falhar, a lista continua e o
   * erro vai para quem chamou. Devolve os pedidos que ainda não estavam na lista.
   */
  async poll(): Promise<ExtensionRequest[]> {
    const known = new Set((this.list.hasValue() ? this.list.value() : []).map((r) => r.id));
    const latest = await firstValueFrom(this.http.get<ExtensionRequest[]>('/api/pedidos'));
    this.list.set(latest);
    this.refreshedAt.set(Date.now());
    return latest.filter((r) => !known.has(r.id));
  }

  /** Busca de novo um pedido, por exemplo depois que outra pessoa decidiu antes. */
  refresh(id: string): Promise<ExtensionRequest> {
    return this.replace(this.http.get<ExtensionRequest>(`/api/pedidos/${id}`));
  }

  /** Troca o pedido na lista pela versão que o servidor devolveu, sem recarregar tudo. */
  private async replace(call: Observable<ExtensionRequest>): Promise<ExtensionRequest> {
    const updated = await firstValueFrom(call);
    if (this.list.hasValue()) {
      this.list.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    }
    return updated;
  }
}
