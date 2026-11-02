import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApprovalLinkDecisions } from './approval-link';

describe('ApprovalLinkDecisions', () => {
  let decisions: ApprovalLinkDecisions;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    decisions = TestBed.inject(ApprovalLinkDecisions);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa as rotas da caixa de aprovações, com o token do link no corpo', () => {
    void decisions.approve('ped-02', 'valido-ped-02');
    void decisions.reject('ped-02', 'Pode ficar para amanhã', 'valido-ped-02');
    void decisions.undo('ped-02', 'valido-ped-02');

    const bodies = Object.fromEntries(
      http.match({ method: 'POST' }).map((call) => [call.request.url, call.request.body]),
    );
    expect(bodies).toEqual({
      '/api/pedidos/ped-02/aprovar': { step: 'gestor', token: 'valido-ped-02' },
      '/api/pedidos/ped-02/recusar': {
        reason: 'Pode ficar para amanhã',
        step: 'gestor',
        token: 'valido-ped-02',
      },
      '/api/pedidos/ped-02/desfazer': { token: 'valido-ped-02' },
    });
  });
});
