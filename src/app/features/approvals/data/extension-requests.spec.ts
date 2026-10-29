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

  it('aprovar troca o pedido na lista pela resposta do servidor', async () => {
    const approval = service.approve('ped-c');
    http
      .expectOne({ method: 'POST', url: '/api/pedidos/ped-c/aprovar' })
      .flush(request('ped-c', 'aprovado', '2026-11-12T21:00:00.000Z'));

    expect((await approval).status).toBe('aprovado');
    expect(service.list.value().find((r) => r.id === 'ped-c')?.status).toBe('aprovado');
    expect(service.pending().map((r) => r.id)).toEqual(['ped-a']);
  });

  it('recusar manda o motivo', async () => {
    const rejection = service.reject('ped-a', 'Fila normalizada');
    const call = http.expectOne({ method: 'POST', url: '/api/pedidos/ped-a/recusar' });
    expect(call.request.body).toEqual({ reason: 'Fila normalizada' });
    call.flush(request('ped-a', 'recusado', '2026-11-12T22:00:00.000Z'));
    expect((await rejection).status).toBe('recusado');
  });
});
