import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ExtensionRequest } from '../../shared/models';
import {
  loadMockServer,
  mockApiInterceptor,
  readLiveDemo,
  readSimulation,
} from './mock-api.interceptor';

describe('mockApiInterceptor', () => {
  let http: HttpClient;

  // A API simulada é baixada sob demanda. Aqui ela já fica pronta, para os testes medirem só a
  // espera simulada (os timers são falsos; o download do módulo, não).
  beforeAll(() => loadMockServer());

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockApiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    vi.useRealTimers();
    history.replaceState(null, '', '/');
  });

  /** Faz a chamada e anota quando ela termina, para medir a espera. */
  function track<T>(request: Promise<T>) {
    const state = { done: false, result: request };
    request.then(
      () => (state.done = true),
      () => (state.done = true),
    );
    return state;
  }

  it('responde /api/... entre 300 e 800 ms', async () => {
    const call = track(firstValueFrom(http.get<unknown[]>('/api/grupos')));
    await vi.advanceTimersByTimeAsync(299);
    expect(call.done).toBe(false);
    await vi.advanceTimersByTimeAsync(501);
    expect(call.done).toBe(true);
    expect(await call.result).toHaveLength(6);
  });

  it('erro da API simulada vira HttpErrorResponse com a mensagem no corpo', async () => {
    const call = track(firstValueFrom(http.post('/api/pedidos/ped-05/recusar', {})));
    const assertion = expect(call.result).rejects.toMatchObject({
      status: 422,
      error: { message: 'Escreva o motivo da recusa.' },
    });
    await vi.advanceTimersByTimeAsync(800);
    await assertion;
  });

  it('aprovar altera o banco: a próxima leitura já vem atualizada', async () => {
    const approve = firstValueFrom(http.post('/api/pedidos/ped-04/aprovar', {}));
    await vi.advanceTimersByTimeAsync(800);
    await approve;
    const read = firstValueFrom(http.get<ExtensionRequest>('/api/pedidos/ped-04'));
    await vi.advanceTimersByTimeAsync(800);
    expect((await read).status).toBe('aprovado');
  });

  it('deixa passar o que não é /api', () => {
    void firstValueFrom(http.get('/assets/logo.svg', { responseType: 'text' }));
    TestBed.inject(HttpTestingController).expectOne('/assets/logo.svg').flush('<svg/>');
  });

  it('?demo=ao-vivo: um pedido novo chega a cada 30 s, mesmo depois que a URL muda', async () => {
    const count = async () => {
      const call = firstValueFrom(http.get<unknown[]>('/api/pedidos'));
      await vi.advanceTimersByTimeAsync(800);
      return (await call).length;
    };
    history.replaceState(null, '', '/aprovacoes?demo=ao-vivo');
    expect(await count()).toBe(25);
    history.replaceState(null, '', '/aprovacoes');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await count()).toBe(26);
  });

  describe('?simular=', () => {
    it('erro: toda chamada falha com mensagem humana', async () => {
      history.replaceState(null, '', '/aprovacoes?simular=erro');
      const call = firstValueFrom(http.get('/api/pedidos'));
      const assertion = expect(call).rejects.toMatchObject({
        status: 503,
        error: { message: 'Não conseguimos falar com o servidor. Tente de novo em instantes.' },
      });
      await vi.advanceTimersByTimeAsync(800);
      await assertion;
    });

    it('vazio: listas vêm vazias', async () => {
      history.replaceState(null, '', '/aprovacoes?simular=vazio');
      const call = firstValueFrom(http.get<unknown[]>('/api/pedidos'));
      await vi.advanceTimersByTimeAsync(800);
      expect(await call).toEqual([]);
    });

    it('sem-permissao: os dados respondem 403, mas quem é a pessoa continua', async () => {
      history.replaceState(null, '', '/aprovacoes?simular=sem-permissao');
      const list = firstValueFrom(http.get('/api/pedidos'));
      const assertion = expect(list).rejects.toMatchObject({
        status: 403,
        error: { message: 'Você não tem permissão para ver estas informações.' },
      });
      const me = firstValueFrom(http.get<{ name: string }>('/api/eu'));
      await vi.advanceTimersByTimeAsync(800);
      await assertion;
      expect((await me).name).toBe('Renata Albuquerque');
    });

    it('decidido: ao aprovar, o gestor da área já decidiu (409)', async () => {
      history.replaceState(null, '', '/aprovacoes?simular=decidido');
      const call = firstValueFrom(http.post('/api/pedidos/ped-02/aprovar', { step: 'gestor' }));
      const assertion = expect(call).rejects.toMatchObject({
        status: 409,
        error: { message: expect.stringMatching(/^Este pedido já foi aprovado por Marina às /) },
      });
      await vi.advanceTimersByTimeAsync(800);
      await assertion;
    });

    it('lento: espera de 3 a 5 s', async () => {
      history.replaceState(null, '', '/aprovacoes?simular=lento');
      const call = track(firstValueFrom(http.get('/api/grupos')));
      await vi.advanceTimersByTimeAsync(2999);
      expect(call.done).toBe(false);
      await vi.advanceTimersByTimeAsync(2001);
      expect(call.done).toBe(true);
    });
  });
});

describe('readSimulation', () => {
  it('só aceita os valores conhecidos', () => {
    expect(readSimulation('?simular=erro')).toBe('erro');
    expect(readSimulation('?filtro=todos&simular=vazio')).toBe('vazio');
    expect(readSimulation('?simular=sem-permissao')).toBe('sem-permissao');
    expect(readSimulation('?simular=decidido')).toBe('decidido');
    expect(readSimulation('?simular=quebrar')).toBeNull();
    expect(readSimulation('')).toBeNull();
  });
});

describe('readLiveDemo', () => {
  it('liga só com ?demo=ao-vivo', () => {
    expect(readLiveDemo('?demo=ao-vivo')).toBe(true);
    expect(readLiveDemo('?filtro=todos&demo=ao-vivo')).toBe(true);
    expect(readLiveDemo('?demo=1')).toBe(false);
    expect(readLiveDemo('')).toBe(false);
  });
});
