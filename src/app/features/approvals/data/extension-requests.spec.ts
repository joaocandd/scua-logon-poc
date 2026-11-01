import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExtensionRequest } from '../../../shared/models';
import { ExtensionRequests } from './extension-requests';

function request(
  id: string,
  status: ExtensionRequest['status'],
  expiresAt: string,
): ExtensionRequest {
  return {
    id,
    employeeId: 'col-01',
    date: '2026-11-12',
    currentEnd: '17:00',
    requestedEnd: '18:30',
    reason: 'Fechamento do mês',
    status,
    createdAt: '2026-11-12T15:00:00.000Z',
    expiresAt,
    decisions: [],
  };
}

describe('ExtensionRequests', () => {
  let service: ExtensionRequests;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExtensionRequests);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http
      .expectOne('/api/pedidos')
      .flush([
        request('ped-a', 'aguardando_gestor', '2026-11-12T22:00:00.000Z'),
        request('ped-b', 'aprovado', '2026-11-12T20:00:00.000Z'),
        request('ped-c', 'aguardando_gestor', '2026-11-12T21:00:00.000Z'),
      ]);
    await TestBed.inject(ApplicationRef).whenStable();
  });

  afterEach(() => http.verify());

  it('pendentes: só os que aguardam o gestor, do que vence antes', () => {
    expect(service.pending().map((r) => r.id)).toEqual(['ped-c', 'ped-a']);
  });

  it('aprovar diz que é a etapa do gestor e troca o pedido na lista pela resposta', async () => {
    const approval = service.approve('ped-c');
    const call = http.expectOne({ method: 'POST', url: '/api/pedidos/ped-c/aprovar' });
    expect(call.request.body).toEqual({ step: 'gestor' });
    call.flush(request('ped-c', 'aprovado', '2026-11-12T21:00:00.000Z'));

    expect((await approval).status).toBe('aprovado');
    expect(service.list.value().find((r) => r.id === 'ped-c')?.status).toBe('aprovado');
    expect(service.pending().map((r) => r.id)).toEqual(['ped-a']);
  });

  it('recusar manda o motivo', async () => {
    const rejection = service.reject('ped-a', 'Fila normalizada');
    const call = http.expectOne({ method: 'POST', url: '/api/pedidos/ped-a/recusar' });
    expect(call.request.body).toEqual({ reason: 'Fila normalizada', step: 'gestor' });
    call.flush(request('ped-a', 'recusado', '2026-11-12T22:00:00.000Z'));
    expect((await rejection).status).toBe('recusado');
  });

  it('desfazer volta o pedido para os pendentes', async () => {
    const approval = service.approve('ped-c');
    http
      .expectOne('/api/pedidos/ped-c/aprovar')
      .flush(request('ped-c', 'aprovado', '2026-11-12T21:00:00.000Z'));
    await approval;

    const undo = service.undo('ped-c');
    http
      .expectOne({ method: 'POST', url: '/api/pedidos/ped-c/desfazer' })
      .flush(request('ped-c', 'aguardando_gestor', '2026-11-12T21:00:00.000Z'));
    await undo;
    expect(service.pending().map((r) => r.id)).toEqual(['ped-c', 'ped-a']);
  });

  it('a primeira carga marca a hora da atualização', () => {
    expect(service.refreshedAt()).not.toBeNull();
  });

  it('consulta de novo e devolve só os pedidos que chegaram', async () => {
    const poll = service.poll();
    http
      .expectOne('/api/pedidos')
      .flush([
        request('ped-a', 'aguardando_gestor', '2026-11-12T22:00:00.000Z'),
        request('ped-b', 'aprovado', '2026-11-12T20:00:00.000Z'),
        request('ped-c', 'aguardando_gestor', '2026-11-12T21:00:00.000Z'),
        request('ped-d', 'aguardando_gestor', '2026-11-12T20:30:00.000Z'),
      ]);
    expect((await poll).map((r) => r.id)).toEqual(['ped-d']);
    expect(service.pending().map((r) => r.id)).toEqual(['ped-d', 'ped-c', 'ped-a']);
  });

  it('se a consulta falhar, a lista continua na tela', async () => {
    const poll = service.poll();
    http
      .expectOne('/api/pedidos')
      .flush({ message: 'Fora do ar' }, { status: 503, statusText: '' });
    await expect(poll).rejects.toMatchObject({ status: 503 });
    expect(service.pending().map((r) => r.id)).toEqual(['ped-c', 'ped-a']);
  });

  it('busca de novo um pedido e troca na lista', async () => {
    const refresh = service.refresh('ped-a');
    http
      .expectOne({ method: 'GET', url: '/api/pedidos/ped-a' })
      .flush(request('ped-a', 'aguardando_rh', '2026-11-12T22:00:00.000Z'));
    await refresh;
    expect(service.list.value().find((r) => r.id === 'ped-a')?.status).toBe('aguardando_rh');
  });
});
