import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { DOCUMENT, EnvironmentInjector, inject } from '@angular/core';
import { from, mergeMap, of, throwError, timer } from 'rxjs';
import type { ApiError } from '../../mocks/handlers';

/** Estado forçado pela URL da página: ?simular=erro, ?simular=lento ou ?simular=vazio. */
export type Simulation = 'erro' | 'lento' | 'vazio';

/** Espera de cada resposta, em milissegundos: [mínimo, máximo]. */
const LATENCY = { normal: [300, 800], lento: [3000, 5000] } as const;

const SERVER_DOWN: ApiError = {
  message: 'Não conseguimos falar com o servidor. Tente de novo em instantes.',
};

type MockServer = typeof import('../../mocks/server');
let mockServer: Promise<MockServer> | undefined;

/**
 * Baixa a API simulada (banco, fixtures e rotas) na primeira chamada e guarda para as próximas.
 * Fica fora do pacote inicial: a tela de entrada, por exemplo, não chama a API.
 */
export function loadMockServer(): Promise<MockServer> {
  mockServer ??= import('../../mocks/server');
  return mockServer;
}

/**
 * API simulada: responde às chamadas a /api/... a partir do banco em memória (MockDb), com uma
 * espera de rede de 300 a 800 ms. O parâmetro `simular` na URL da página força os estados de
 * erro, lentidão e lista vazia em qualquer tela. O resto das chamadas segue normal.
 */
export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);

  const injector = inject(EnvironmentInjector);
  const simulation = readSimulation(inject(DOCUMENT).location.search);
  const [min, max] = LATENCY[simulation === 'lento' ? 'lento' : 'normal'];
  // O download da API simulada começa já, em paralelo com a espera.
  const server = loadMockServer();

  // A resposta é calculada depois da espera: aprovar muda o banco só quando "chega no servidor".
  return timer(min + Math.random() * (max - min)).pipe(
    mergeMap(() => from(server)),
    mergeMap(({ MockDb, handleApiRequest }) => {
      const url = request.url;
      if (simulation === 'erro') {
        return throwError(() => new HttpErrorResponse({ status: 503, error: SERVER_DOWN, url }));
      }
      const { status, body } = handleApiRequest(injector.get(MockDb), {
        method: request.method,
        url: request.urlWithParams,
        body: request.body,
      });
      if (status >= 400) {
        return throwError(() => new HttpErrorResponse({ status, error: body, url }));
      }
      const empty = simulation === 'vazio' && request.method === 'GET' && Array.isArray(body);
      return of(new HttpResponse({ status, body: empty ? [] : body, url }));
    }),
  );
};

export function readSimulation(search: string): Simulation | null {
  const value = new URLSearchParams(search).get('simular');
  return value === 'erro' || value === 'lento' || value === 'vazio' ? value : null;
}
