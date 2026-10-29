import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ExtensionRequest } from '../../../shared/models';

/** Pedidos de extensão: a caixa de aprovações (fluxo A) lê e decide por aqui. */
@Injectable({ providedIn: 'root' })
export class ExtensionRequests {
  private readonly http = inject(HttpClient);

  /** Todos os pedidos. `isLoading()`, `error()` e `reload()` vêm do httpResource. */
  readonly list = httpResource<ExtensionRequest[]>(() => '/api/pedidos', { defaultValue: [] });

  /** Aguardando o gestor, do que vence antes para o que vence depois. */
  readonly pending = computed(() =>
    (this.list.hasValue() ? this.list.value() : [])
      .filter((r) => r.status === 'aguardando_gestor')
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
  );

  /** Aprova. Se a regra pedir validação do RH, o pedido passa para "aguardando_rh". */
  approve(id: string): Promise<ExtensionRequest> {
    return this.decide(this.http.post<ExtensionRequest>(`/api/pedidos/${id}/aprovar`, {}));
  }

  /** Recusa. O motivo é obrigatório. */
  reject(id: string, reason: string): Promise<ExtensionRequest> {
    return this.decide(this.http.post<ExtensionRequest>(`/api/pedidos/${id}/recusar`, { reason }));
  }

  /** Troca o pedido na lista pela versão que o servidor devolveu, sem recarregar tudo. */
  private async decide(call: Observable<ExtensionRequest>): Promise<ExtensionRequest> {
    const updated = await firstValueFrom(call);
    if (this.list.hasValue()) {
      this.list.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    }
    return updated;
  }
}
