import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApprovalLink, ExtensionRequest } from '../../../shared/models';

/**
 * O link do e-mail (GET /api/aprovacao/:token): o pedido e o contexto já calculado pela API. Crie
 * num campo do componente (contexto de injeção). Erros: 404 link inválido, 410 expirado e 409 já
 * decidido, sempre com a mensagem para a tela.
 */
export function approvalLinkResource(token: () => string) {
  return httpResource<ApprovalLink>(() => `/api/aprovacao/${encodeURIComponent(token())}`);
}

/**
 * Decisões pelo link do e-mail. Usam as mesmas rotas da caixa de aprovações, com o token no
 * corpo: a API decide no nome de quem recebeu o link.
 */
@Injectable({ providedIn: 'root' })
export class ApprovalLinkDecisions {
  private readonly http = inject(HttpClient);

  approve(id: string, token: string): Promise<ExtensionRequest> {
    return this.post(`/api/pedidos/${id}/aprovar`, { step: 'gestor', token });
  }

  reject(id: string, reason: string, token: string): Promise<ExtensionRequest> {
    return this.post(`/api/pedidos/${id}/recusar`, { reason, step: 'gestor', token });
  }

  undo(id: string, token: string): Promise<ExtensionRequest> {
    return this.post(`/api/pedidos/${id}/desfazer`, { token });
  }

  private post(url: string, body: object): Promise<ExtensionRequest> {
    return firstValueFrom(this.http.post<ExtensionRequest>(url, body));
  }
}
