import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { DOCUMENT, EnvironmentInjector, inject } from '@angular/core';
import { from, mergeMap, of, throwError, timer } from 'rxjs';
import type { ApiError } from '../../mocks/handlers';

/**
 * Estado forçado pela URL da página:
 * - `erro`: toda chamada falha;
 * - `lento`: respostas de 3 a 5 s;
 * - `vazio`: listas vazias;
 * - `sem-permissao`: a pessoa entra, mas não pode ver os dados (403);
 * - `decidido`: ao aprovar ou recusar, outro gestor já decidiu o pedido (409).
 */
export type Simulation = 'erro' | 'lento' | 'vazio' | 'sem-permissao' | 'decidido';

const SIMULATIONS: readonly Simulation[] = ['erro', 'lento', 'vazio', 'sem-permissao', 'decidido'];

/** Espera de cada resposta, em milissegundos: [mínimo, máximo]. */
const LATENCY = { normal: [300, 800], lento: [3000, 5000] } as const;

const SERVER_DOWN: ApiError = {
  message: 'Não conseguimos falar com o servidor. Tente de novo em instantes.',
};

const FORBIDDEN: ApiError = {
  message:
    'Você não tem acesso a estas informações. Se precisa delas, peça acesso ao administrador do Scua Logon.',
};

/** Quem é a pessoa e o login continuam funcionando sem permissão: ela entrou, só não pode ver. */
const IDENTITY_URLS = ['/api/eu', '/api/sessao', '/api/sessao/corporativa'];

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
 * erro, lentidão, lista vazia, sem permissão e pedido já decidido em qualquer tela. O resto das
 * chamadas segue normal. `?demo=ao-vivo` liga o modo demo ao vivo: um pedido novo a cada 30 s.
 */
export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);

  const injector = inject(EnvironmentInjector);
  const search = inject(DOCUMENT).location.search;
  const simulation = readSimulation(search);
  const liveDemo = readLiveDemo(search);
  const [min, max] = LATENCY[simulation === 'lento' ? 'lento' : 'normal'];
  // O download da API simulada começa já, em paralelo com a espera.
  const server = loadMockServer();

  // A resposta é calculada depois da espera: aprovar muda o banco só quando "chega no servidor".
  return timer(min + Math.random() * (max - min)).pipe(
    mergeMap(() => from(server)),
    mergeMap(({ MockDb, handleApiRequest, decideElsewhereFirst }) => {
      const url = request.url;
      if (simulation === 'erro') {
        return throwError(() => new HttpErrorResponse({ status: 503, error: SERVER_DOWN, url }));
      }
      if (simulation === 'sem-permissao' && !IDENTITY_URLS.includes(url)) {
        return throwError(() => new HttpErrorResponse({ status: 403, error: FORBIDDEN, url }));
      }
      const db = injector.get(MockDb);
      const call = { method: request.method, url: request.urlWithParams, body: request.body };
      if (liveDemo) db.startLiveDemo();
      if (simulation === 'decidido') decideElsewhereFirst(db, call);
      const { status, body } = handleApiRequest(db, call);
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
  return SIMULATIONS.find((simulation) => simulation === value) ?? null;
}

/** `?demo=ao-vivo` liga o modo demo ao vivo, que fica ligado até a página recarregar. */
export function readLiveDemo(search: string): boolean {
  return new URLSearchParams(search).get('demo') === 'ao-vivo';
}
