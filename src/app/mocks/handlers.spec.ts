import {
  ActivityEvent,
  ApprovalLink,
  ExtensionRequest,
  Settings,
  Workstation,
  WorkSchedule,
} from '../shared/models';
import { MockDb } from './db';
import { decideElsewhereFirst, handleApiRequest, MockRequest } from './handlers';

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

  it('diz quem está usando o app (usuária simulada)', () => {
    expect(get('/api/eu')).toMatchObject({ id: 'col-25', name: 'Renata Albuquerque' });
  });

  describe('login', () => {
    it('qualquer usuário e senha, e a conta corporativa, entram como a usuária da demonstração', () => {
      const renata = { status: 200, body: { id: 'col-25', name: 'Renata Albuquerque' } };
      expect(
        call('POST', '/api/sessao', { username: 'marina.alves', password: 'qualquer' }),
      ).toMatchObject(renata);
      expect(call('POST', '/api/sessao/corporativa', {})).toMatchObject(renata);
    });

    it('a senha "erro" simula credencial inválida', () => {
      expect(call('POST', '/api/sessao', { username: 'marina.alves', password: 'erro' })).toEqual({
        status: 401,
        body: { message: 'Usuário ou senha incorretos.' },
      });
    });

    it('usuário ou senha vazios não entram', () => {
      for (const body of [{ username: ' ', password: 'x' }, { username: 'ana' }, null]) {
        expect(call('POST', '/api/sessao', body).status).toBe(422);
      }
    });
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

  describe('decisão de uma etapa', () => {
    it('o gestor decide quem ainda aguarda o gestor; se outra pessoa passou na frente, 409', () => {
      // ped-09: Marina já aprovou como gestora; o pedido aguarda o RH.
      expect(call('POST', '/api/pedidos/ped-09/aprovar', { step: 'gestor' })).toEqual({
        status: 409,
        body: { message: 'Este pedido já foi aprovado por Marina às 8h10.' },
      });
      expect(call('POST', '/api/pedidos/ped-04/aprovar', { step: 'gestor' }).status).toBe(200);
    });

    it('?simular=decidido: o gestor da área aprova antes, e a tela recebe 409', () => {
      const approve = { method: 'POST', url: '/api/pedidos/ped-01/aprovar' };
      decideElsewhereFirst(db, approve, NOW);
      expect(call('POST', '/api/pedidos/ped-01/aprovar', { step: 'gestor' })).toEqual({
        status: 409,
        body: { message: 'Este pedido já foi aprovado por Marina às 9h58.' },
      });
      expect(get<ActivityEvent[]>('/api/historico?pedido=ped-01')[0].summary).toBe(
        'Marina Couto aprovou o pedido de João Pedro Antunes. Falta a validação do RH.',
      );
    });

    it('?simular=decidido não mexe em pedido que já fechou nem em leituras', () => {
      decideElsewhereFirst(db, { method: 'POST', url: '/api/pedidos/ped-13/aprovar' }, NOW);
      decideElsewhereFirst(db, { method: 'GET', url: '/api/pedidos/ped-02' }, NOW);
      expect(get<ExtensionRequest>('/api/pedidos/ped-13').decisions).toHaveLength(1);
      expect(get<ExtensionRequest>('/api/pedidos/ped-02').status).toBe('aguardando_gestor');
    });
  });

  describe('desfazer', () => {
    it('desfaz a aprovação: o pedido volta a aguardar o gestor e o histórico registra', () => {
      call('POST', '/api/pedidos/ped-04/aprovar', { step: 'gestor' });
      const response = call('POST', '/api/pedidos/ped-04/desfazer');
      expect(response).toMatchObject({
        status: 200,
        body: { status: 'aguardando_gestor', decisions: [] },
      });
      expect(get<ActivityEvent[]>('/api/historico?pedido=ped-04')[0]).toMatchObject({
        type: 'decisao_desfeita',
        actorId: 'col-25',
        summary: 'Renata Albuquerque desfez a aprovação do pedido de Mateus Farias.',
      });
    });

    it('desfaz a recusa, e também a aprovação que foi para o RH', () => {
      call('POST', '/api/pedidos/ped-05/recusar', { reason: 'Fila normalizada', step: 'gestor' });
      expect(call('POST', '/api/pedidos/ped-05/desfazer').body).toMatchObject({
        status: 'aguardando_gestor',
      });
      expect(get<ActivityEvent[]>('/api/historico?pedido=ped-05')[0].summary).toBe(
        'Renata Albuquerque desfez a recusa do pedido de Jéssica Moura.',
      );

      call('POST', '/api/pedidos/ped-01/aprovar', { step: 'gestor' });
      expect(call('POST', '/api/pedidos/ped-01/desfazer').body).toMatchObject({
        status: 'aguardando_gestor',
        decisions: [],
      });
    });

    it('depois que o RH decide, não dá mais', () => {
      call('POST', '/api/pedidos/ped-01/aprovar', { step: 'gestor' });
      call('POST', '/api/pedidos/ped-01/aprovar', { step: 'rh' });
      expect(call('POST', '/api/pedidos/ped-01/desfazer')).toEqual({
        status: 409,
        body: { message: 'Não dá mais para desfazer: o RH já validou o pedido.' },
      });
    });

    it('depois que o pedido vence, não dá mais', () => {
      call('POST', '/api/pedidos/ped-04/aprovar', { step: 'gestor' });
      const expiresAt = get<ExtensionRequest>('/api/pedidos/ped-04').expiresAt;
      const later = new Date(Date.parse(expiresAt) + 60_000);
      expect(call('POST', '/api/pedidos/ped-04/desfazer', undefined, later)).toEqual({
        status: 409,
        body: { message: 'Não dá mais para desfazer: o pedido venceu às 23h30.' },
      });
    });

    it('só desfaz a própria decisão', () => {
      expect(call('POST', '/api/pedidos/ped-13/desfazer')).toEqual({
        status: 409,
        body: { message: 'Não há decisão sua para desfazer neste pedido.' },
      });
      expect(call('POST', '/api/pedidos/ped-02/desfazer').status).toBe(409);
    });
  });

  describe('link do e-mail', () => {
    const link = (token: string, now = NOW) =>
      call('GET', `/api/aprovacao/${token}`, undefined, now);

    it('link válido: só o necessário para decidir, com o contexto calculado na API', () => {
      const response = link('valido-ped-02');
      expect(response.status).toBe(200);
      const body = response.body as ApprovalLink;
      // LGPD: nada de e-mail, cargo, exceções, feriados ou outros pedidos da pessoa.
      expect(Object.keys(body).sort()).toEqual([
        'approverId',
        'context',
        'employeeName',
        'groupName',
        'request',
        'timeline',
      ]);
      expect(body).toMatchObject({
        employeeName: 'Lucas Bittencourt',
        groupName: 'Comercial',
        approverId: 'col-25',
        request: { id: 'ped-02', status: 'aguardando_gestor' },
        context: { extraMinutes: 150, recentOvertimeMinutes: 90, needsHrValidation: true },
      });
      expect(body.context.alerts.map((a) => a.kind)).toEqual(['limite_diario']);
      expect(body.timeline.segments).toContainEqual({
        start: '17:00',
        end: '19:00',
        kind: 'requested',
        label: 'Hora extra pedida',
      });
      expect(body.timeline.notes[0]).toBe(
        'Se aprovar, a estação bloqueia às 19h, no limite de 2 h extras.',
      );
    });

    it('o link do ped-04 traz o alerta de interjornada', () => {
      const body = link('valido-ped-04').body as ApprovalLink;
      expect(body.context.alerts.map((a) => a.detail)).toEqual([
        'No dia seguinte, a estação só libera às 10h30, e não às 10h.',
      ]);
    });

    it('inválido (404), expirado (410) e já usado por outra pessoa (409), com frases humanas', () => {
      expect(link('nao-existe')).toEqual({
        status: 404,
        body: { message: 'Este link não é válido. Confira se ele veio completo do e-mail.' },
      });
      expect(link('expirado-ped-22')).toEqual({
        status: 410,
        body: { message: 'Este link expirou. O pedido de Ana Ribeiro venceu às 18h30.' },
      });
      expect(link('usado-ped-13')).toEqual({
        status: 409,
        body: { message: 'Este pedido já foi aprovado por Bianca às 9h10.' },
      });
    });

    it('decide pelas rotas da caixa de aprovações, no nome de quem recebeu o link', () => {
      const approve = call('POST', '/api/pedidos/ped-04/aprovar', {
        step: 'gestor',
        token: 'valido-ped-04',
      });
      expect(approve).toMatchObject({
        status: 200,
        body: { status: 'aprovado', decisions: [{ step: 'gestor', approverId: 'col-25' }] },
      });
      // Quem recebeu o link continua vendo a própria decisão, enquanto dá para desfazer.
      expect(link('valido-ped-04')).toMatchObject({
        status: 200,
        body: { request: { status: 'aprovado' } },
      });
      expect(
        call('POST', '/api/pedidos/ped-04/desfazer', { token: 'valido-ped-04' }).body,
      ).toMatchObject({ status: 'aguardando_gestor' });
    });

    it('depois que não dá mais para desfazer, a própria decisão vira "já usado", por você', () => {
      call('POST', '/api/pedidos/ped-04/aprovar', { step: 'gestor', token: 'valido-ped-04' });
      const expiresAt = get<ExtensionRequest>('/api/pedidos/ped-04').expiresAt;
      expect(link('valido-ped-04', new Date(Date.parse(expiresAt) + 60_000))).toEqual({
        status: 409,
        body: { message: 'Este pedido já foi aprovado por você às 10h.' },
      });
    });

    it('se outra pessoa decide antes, o link vira "já usado"', () => {
      decideElsewhereFirst(db, { method: 'POST', url: '/api/pedidos/ped-02/aprovar' }, NOW);
      expect(link('valido-ped-02')).toEqual({
        status: 409,
        body: { message: 'Este pedido já foi aprovado por Marina às 9h58.' },
      });
    });

    it('o token só vale para o pedido do link', () => {
      const forbidden = {
        status: 403,
        body: { message: 'Este link não vale para este pedido.' },
      };
      expect(
        call('POST', '/api/pedidos/ped-01/aprovar', { step: 'gestor', token: 'valido-ped-02' }),
      ).toEqual(forbidden);
      expect(
        call('POST', '/api/pedidos/ped-02/aprovar', { step: 'gestor', token: 'inventado' }),
      ).toEqual(forbidden);
      expect(get<ExtensionRequest>('/api/pedidos/ped-01').status).toBe('aguardando_gestor');
    });
  });

  describe('modo demo ao vivo', () => {
    const SECOND = 1000;
    const at = (seconds: number) => new Date(NOW.getTime() + seconds * SECOND);
    const requests = (seconds: number) => get<ExtensionRequest[]>('/api/pedidos', at(seconds));

    it('fica desligado por padrão', () => {
      expect(requests(10 * 60)).toHaveLength(25);
    });

    it('ligado, um pedido novo chega a cada 30 s, aguardando o gestor', () => {
      db.startLiveDemo(NOW);
      expect(requests(29)).toHaveLength(25);
      const [first] = requests(30).slice(25);
      expect(first).toMatchObject({
        id: 'ped-26',
        employeeId: 'col-10',
        requestedEnd: '18:00',
        status: 'aguardando_gestor',
        createdAt: at(30).toISOString(),
      });
      expect(get<ActivityEvent[]>('/api/historico?pedido=ped-26', at(30))[0].summary).toBe(
        'Felipe Guimarães pediu extensão até 18h (Visita a cliente no fim do dia).',
      );
      expect(requests(95)).toHaveLength(28);
    });

    it('ligar de novo não reinicia a conta; a fila acaba em 10 pedidos', () => {
      db.startLiveDemo(NOW);
      db.startLiveDemo(at(20));
      expect(requests(30)).toHaveLength(26);
      expect(requests(60 * 60)).toHaveLength(35);
    });

    it('os pedidos novos são de quem não tem pedido em aberto nem exceção de jornada', () => {
      const before = get<ExtensionRequest[]>('/api/pedidos');
      const open = new Set(
        before.filter((r) => r.status.startsWith('aguardando')).map((r) => r.employeeId),
      );
      const withException = new Set(db.data.exceptions.map((e) => e.employeeId));
      db.startLiveDemo(NOW);
      const live = requests(60 * 60).slice(25);
      expect(new Set(live.map((r) => r.employeeId)).size).toBe(live.length);
      for (const request of live) {
        expect(open.has(request.employeeId), request.employeeId).toBe(false);
        expect(withException.has(request.employeeId), request.employeeId).toBe(false);
      }
    });

    it('reset desliga o modo ao vivo', () => {
      db.startLiveDemo(NOW);
      db.reset(NOW);
      expect(requests(60)).toHaveLength(25);
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

    describe('modo observação', () => {
      const observed = (events: ActivityEvent[]) =>
        events.filter((e) => e.type === 'bloqueio_observado');
      const history = (now = NOW) => get<ActivityEvent[]>('/api/historico?regra=regra-tarde', now);

      it('dura 7 dias contando hoje; salvar de novo não muda o fim; desligar apaga', () => {
        const on = call('PUT', '/api/regras/regra-tarde', { ...tarde(), observationMode: true });
        expect((on.body as WorkSchedule).observationEndsOn).toBe('2026-11-18');

        const later = new Date('2026-11-14T10:00:00-03:00');
        call('PUT', '/api/regras/regra-tarde', { ...tarde(), end: '21:00' }, later);
        expect(tarde().observationEndsOn).toBe('2026-11-18');

        call('PUT', '/api/regras/regra-tarde', { ...tarde(), observationMode: false });
        expect(tarde().observationEndsOn).toBeUndefined();
      });

      it('registra quem seria bloqueado, uma vez por passagem, sem bloquear a estação', () => {
        // Quinta às 10h: a regra Tarde (14h às 22h) bloquearia o Atendimento, que fica sem regra
        // ativa enquanto ela é observada.
        call('PUT', '/api/regras/regra-tarde', { ...tarde(), observationMode: true });
        const first = observed(history());
        expect(first.map((e) => e.summary)).toContain(
          'Às 10h, a estação de Bianca Nogueira seria bloqueada. Motivo: fora da jornada Tarde (das 14h às 22h).',
        );
        expect(observed(history())).toHaveLength(first.length);

        const bianca = get<Workstation[]>('/api/estacoes').find((w) => w.employeeId === 'col-16');
        expect(bianca).toMatchObject({ state: 'bloqueada', observed: true });
      });

      it('quem está bloqueado de verdade pela regra ativa não entra no registro', () => {
        // Regra nova em observação para o Comercial, que segue na regra Comercial (8h às 17h).
        const comercial = get<WorkSchedule>('/api/regras/regra-comercial');
        const evening = new Date('2026-11-12T19:00:00-03:00');
        const created = call(
          'POST',
          '/api/regras',
          { ...comercial, id: '', name: 'Teste', observationMode: true },
          evening,
        ).body as WorkSchedule;
        // Só os registros da regra nova: a Noturna das fixtures também está em observação.
        const events = get<ActivityEvent[]>(`/api/historico?regra=${created.id}`, evening);
        expect(observed(events)).toEqual([]);
      });

      it('no dia seguinte ao fim, a regra passa a bloquear', () => {
        call('PUT', '/api/regras/regra-tarde', { ...tarde(), observationMode: true });
        const after = new Date('2026-11-19T08:00:00-03:00');
        expect(get<WorkSchedule>('/api/regras/regra-tarde', after)).toMatchObject({
          observationMode: false,
        });
        expect(history(after)[0].summary).toBe(
          'A observação da regra Tarde terminou. A partir de agora, ela bloqueia a estação.',
        );
      });
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

  describe('configurações', () => {
    it('começam com o custo médio da hora extra da demonstração', () => {
      expect(get<Settings>('/api/configuracoes')).toEqual({ overtimeHourlyCost: 45 });
    });

    it('salvam o custo médio, arredondado ao centavo', () => {
      const saved = call('PUT', '/api/configuracoes', { overtimeHourlyCost: 52.456 });
      expect(saved).toEqual({ status: 200, body: { overtimeHourlyCost: 52.46 } });
      expect(get<Settings>('/api/configuracoes')).toEqual({ overtimeHourlyCost: 52.46 });
    });

    it('recusam custo vazio, zero ou negativo, dizendo o que corrigir', () => {
      expect(call('PUT', '/api/configuracoes', {})).toEqual({
        status: 422,
        body: { message: 'Informe o custo médio da hora extra.' },
      });
      expect(call('PUT', '/api/configuracoes', { overtimeHourlyCost: 0 })).toEqual({
        status: 422,
        body: { message: 'O custo médio precisa ser maior que zero.' },
      });
      expect(get<Settings>('/api/configuracoes')).toEqual({ overtimeHourlyCost: 45 });
    });
  });
});
