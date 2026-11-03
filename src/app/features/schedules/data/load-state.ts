import { Resource } from '@angular/core';
import { apiErrorStatus } from '../../../shared/api-error';

/** Estado de uma tela que depende de vários recursos da API: carregando, erro, sem permissão (403) ou pronta. */
export type LoadState = 'loading' | 'error' | 'forbidden' | 'ready';

/** Mesmo critério da caixa de aprovações: um 403 vence; depois, qualquer erro; depois, carregando. */
export function loadState(resources: readonly Resource<unknown>[]): LoadState {
  const errors = resources.map((r) => r.error()).filter((e) => e !== undefined);
  if (errors.some((e) => apiErrorStatus(e) === 403)) return 'forbidden';
  if (errors.length > 0) return 'error';
  const statuses = resources.map((r) => r.status());
  return statuses.includes('idle') || statuses.includes('loading') ? 'loading' : 'ready';
}

/**
 * "Tentar de novo" em andamento. O recurso continua com o erro antigo enquanto recarrega: a tela
 * fica no erro, com o botão em carregando, até a resposta chegar.
 */
export function isRetrying(resources: readonly Resource<unknown>[]): boolean {
  return resources.some((r) => r.status() === 'reloading');
}

/** Busca de novo só os recursos que falharam. */
export function retryFailed(resources: readonly { error(): unknown; reload(): boolean }[]): void {
  for (const resource of resources) if (resource.error()) resource.reload();
}
