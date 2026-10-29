import { ActivityEvent, ExtensionRequest, Workstation, WorkSchedule } from '../shared/models';
import { MockDb } from './db';
import { handleApiRequest, MockRequest } from './handlers';

const NOW = new Date('2026-11-12T10:00:00-03:00'); // quinta-feira de manhã

describe('API simulada', () => {
  let db: MockDb;

  beforeEach(() => {
    db = new MockDb();
    db.reset(NOW);
  });

  const call = (method: string, url: string, body?: unknown, now = NOW) =>
    handleApiRequest(db, { method, url, body } satisfies MockRequest, now);
  const get = <T>(url: string, now = NOW) => call('GET', url, undefined, now).body as T;

  it('lista as coleções', () => {
    expect(get<unknown[]>('/api/colaboradores')).toHaveLength(40);
    expect(get<unknown[]>('/api/grupos')).toHaveLength(6);
    expect(get<unknown[]>('/api/regras')).toHaveLength(4);
    expect(get<unknown[]>('/api/feriados')).toHaveLength(10);
    expect(get<unknown[]>('/api/excecoes')).toHaveLength(4);
    expect(get<unknown[]>('/api/pedidos')).toHaveLength(25);
  });

  it('busca por id e responde 404 com mensagem humana', () => {
    expect(call('GET', '/api/pedidos/ped-04')).toMatchObject({
      status: 200,
      body: { id: 'ped-04' },
    });
    expect(call('GET', '/api/pedidos/ped-99')).toEqual({
      status: 404,
      body: { message: 'Não encontramos este pedido.' },
    });
    expect(call('GET', '/api/nada')).toEqual({
      status: 404,
      body: { message: 'Não encontramos o que você procurou.' },
    });
  });

  it('devolve cópias: mexer na resposta não altera o banco', () => {
    get<ExtensionRequest>('/api/pedidos/ped-01').status = 'cancelado';
    expect(get<ExtensionRequest>('/api/pedidos/ped-01').status).toBe('aguardando_gestor');
  });

  describe('aprovar', () => {
    it('regra com validação do RH: passa para aguardando_rh e depois para aprovado', () => {
      const first = call('POST', '/api/pedidos/ped-01/aprovar');
      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({
        status: 'aguardando_rh',
        decisions: [
          { step: 'gestor', outcome: 'aprovado', approverId: 'col-25', at: NOW.toISOString() },
        ],
      });

      const second = call('POST', '/api/pedidos/ped-01/aprovar');
      expect((second.body as ExtensionRequest).status).toBe('aprovado');
      expect((second.body as ExtensionRequest).decisions.map((d) => d.step)).toEqual([
        'gestor',
        'rh',
      ]);
    });

    it('regra sem validação do RH: aprova direto', () => {
      expect(call('POST', '/api/pedidos/ped-04/aprovar').body).toMatchObject({
        status: 'aprovado',
      });
    });

    it('registra no histórico', () => {
      call('POST', '/api/pedidos/ped-01/aprovar');
      const [latest] = get<ActivityEvent[]>('/api/historico?pedido=ped-01');
      expect(latest).toMatchObject({
        type: 'pedido_aprovado',
        actorId: 'col-25',
        summary:
          'Renata Albuquerque aprovou o pedido de João Pedro Antunes. Falta a validação do RH.',
      });
    });

    it('pedido já decidido: 409 dizendo quem decidiu e quando', () => {
      expect(call('POST', '/api/pedidos/ped-13/aprovar')).toEqual({
        status: 409,
        body: { message: 'Este pedido já foi aprovado por Bianca às 9h10.' },
      });
      expect(call('POST', '/api/pedidos/ped-22/aprovar').body).toEqual({
        message: 'Este pedido expirou às 18h30, sem decisão.',
      });
      expect(call('POST', '/api/pedidos/ped-24/aprovar').body).toEqual({
        message: 'Vanessa cancelou este pedido.',
      });
    });
  });

  describe('recusar', () => {
    it('exige motivo', () => {
      for (const body of [{}, { reason: '   ' }, null]) {
        expect(call('POST', '/api/pedidos/ped-05/recusar', body)).toEqual({
          status: 422,
          body: { message: 'Escreva o motivo da recusa.' },
        });
      }
      expect(get<ExtensionRequest>('/api/pedidos/ped-05').status).toBe('aguardando_gestor');
    });

    it('guarda o motivo na decisão e no histórico', () => {
      const response = call('POST', '/api/pedidos/ped-05/recusar', {
        reason: ' Fila normalizada ',
      });
      expect(response.body).toMatchObject({
        status: 'recusado',
        decisions: [{ step: 'gestor', outcome: 'recusado', reason: 'Fila normalizada' }],
      });
      expect(get<ActivityEvent[]>('/api/historico?pedido=ped-05')[0].summary).toBe(
        'Renata Albuquerque recusou o pedido de Jéssica Moura. Motivo: Fila normalizada.',
      );
    });
  });

  it('pedido em aberto vira expirado quando o prazo passa', () => {
    const expiresAt = get<ExtensionRequest>('/api/pedidos/ped-01').expiresAt;
    const later = new Date(Date.parse(expiresAt) + 60_000);
    expect(get<ExtensionRequest>('/api/pedidos/ped-01', later).status).toBe('expirado');
    expect(get<ActivityEvent[]>('/api/historico?pedido=ped-01', later)[0]).toMatchObject({
      type: 'pedido_expirado',
      summary: 'O pedido de João Pedro Antunes expirou sem decisão.',
    });
  });

  it('o histórico vem do mais novo para o mais antigo e filtra por pedido', () => {
    const events = get<ActivityEvent[]>('/api/historico?pedido=ped-21');
    expect(events.map((e) => e.type)).toEqual([
      'pedido_recusado',
      'pedido_aprovado',
      'pedido_criado',
    ]);
    expect(events[0].summary).toBe(
      'Juliana Prado recusou pelo RH o pedido de Diego Arantes. Motivo: Limite de horas extras do mês atingido. Vamos redistribuir a conciliação.',
    );
  });

  describe('regras', () => {
    const tarde = () => get<WorkSchedule>('/api/regras/regra-tarde');

    it('salva alterações e registra no histórico', () => {
      const response = call('PUT', '/api/regras/regra-tarde', { ...tarde(), end: '21:00' });
      expect(response.status).toBe(200);
      expect(tarde().end).toBe('21:00');
      expect(get<ActivityEvent[]>('/api/historico?regra=regra-tarde')[0].summary).toBe(
        'Renata Albuquerque salvou a regra Tarde.',
      );
    });

    it('cria regra nova com id', () => {
      const response = call('POST', '/api/regras', { ...tarde(), id: '', name: 'Plantão' });
      expect(response.status).toBe(201);
      expect((response.body as WorkSchedule).id).toMatch(/^regra-/);
      expect(get<unknown[]>('/api/regras')).toHaveLength(5);
    });

    it('recusa regra sem nome, sem dias ou com horário inválido', () => {
      expect(call('PUT', '/api/regras/regra-tarde', { ...tarde(), name: ' ' }).body).toEqual({
        message: 'Dê um nome para a regra.',
      });
      expect(call('PUT', '/api/regras/regra-tarde', { ...tarde(), weekdays: [] }).body).toEqual({
        message: 'Escolha ao menos um dia da semana.',
      });
      expect(call('PUT', '/api/regras/regra-tarde', { ...tarde(), end: '25:00' }).body).toEqual({
        message: 'Confira os horários. Use o formato 08:00.',
      });
      expect(call('PUT', '/api/regras/regra-x', tarde()).status).toBe(404);
    });
  });

  it('calcula a estação de cada colaborador com regra', () => {
    const workstations = get<Workstation[]>('/api/estacoes');
    const of = (id: string) => workstations.find((w) => w.employeeId === id);
    expect(workstations).toHaveLength(39);
    expect(of('col-25')).toBeUndefined();
    expect(of('col-08')).toEqual({
      employeeId: 'col-08',
      state: 'em_jornada',
      reason: 'Liberada: jornada Comercial (das 8h às 17h).',
    });
    expect(of('col-17')?.reason).toBe('Bloqueada: fora da jornada Tarde (das 14h às 22h).');
  });
});
