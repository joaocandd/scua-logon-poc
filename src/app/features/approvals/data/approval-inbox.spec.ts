import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createFixtures } from '../../../mocks/fixtures';
import { Employee, ExtensionRequest } from '../../../shared/models';
import { ApprovalInbox, InboxItem, visibleItems, VisibleOptions } from './approval-inbox';

const TODAY = '2026-11-12';

function item(
  id: string,
  status: ExtensionRequest['status'],
  overrides: Partial<ExtensionRequest> = {},
  groupId = 'grp-comercial',
): InboxItem {
  const employee: Employee = {
    id: `col-${id}`,
    name: `Pessoa ${id}`,
    email: `${id}@empresa.example`,
    jobTitle: 'Analista',
    groupId,
  };
  return {
    request: {
      id,
      employeeId: employee.id,
      date: TODAY,
      currentEnd: '17:00',
      requestedEnd: '18:00',
      reason: 'Fechamento do mês',
      status,
      createdAt: `${TODAY}T15:00:00-03:00`,
      expiresAt: `${TODAY}T18:00:00-03:00`,
      decisions: [],
      ...overrides,
    },
    employee,
    group: undefined,
    schedule: undefined,
    shift: null,
    context: null,
  };
}

const decidedAt = (at: string) => ({
  decisions: [{ step: 'gestor' as const, outcome: 'aprovado' as const, approverId: 'col-07', at }],
});

const ITEMS = [
  item('a', 'aguardando_gestor', { expiresAt: `${TODAY}T20:00:00-03:00` }),
  item('b', 'aguardando_gestor', { expiresAt: `${TODAY}T19:00:00-03:00` }, 'grp-ti'),
  item('c', 'aprovado', {
    ...decidedAt(`${TODAY}T10:00:00-03:00`),
    createdAt: `${TODAY}T09:00:00-03:00`,
  }),
  item('d', 'aguardando_rh', {
    ...decidedAt(`${TODAY}T11:00:00-03:00`),
    createdAt: `${TODAY}T08:00:00-03:00`,
  }),
  item('e', 'recusado', {
    ...decidedAt('2026-11-11T11:00:00-03:00'),
    createdAt: '2026-11-11T09:00:00-03:00',
  }),
];

const ids = (items: InboxItem[]) => items.map((i) => i.request.id);
const options = (overrides: Partial<VisibleOptions>): VisibleOptions => ({
  filter: 'aguardando',
  groupId: null,
  today: TODAY,
  kept: new Set(),
  ...overrides,
});

describe('visibleItems', () => {
  it('Aguardando: só os que aguardam o gestor, do que expira antes', () => {
    expect(ids(visibleItems(ITEMS, options({})))).toEqual(['b', 'a']);
  });

  it('o pedido que a pessoa acabou de decidir continua na tela, no mesmo lugar', () => {
    const decided = ITEMS.map((i) =>
      i.request.id === 'b' ? { ...i, request: { ...i.request, status: 'aprovado' as const } } : i,
    );
    expect(ids(visibleItems(decided, options({ kept: new Set(['b']) })))).toEqual(['b', 'a']);
  });

  it('Decididos hoje: decisão do gestor hoje, da mais recente para a mais antiga', () => {
    expect(ids(visibleItems(ITEMS, options({ filter: 'decididos-hoje' })))).toEqual(['d', 'c']);
  });

  it('Todos: os que aguardam o gestor primeiro, depois do mais novo para o mais antigo', () => {
    expect(ids(visibleItems(ITEMS, options({ filter: 'todos' })))).toEqual([
      'b',
      'a',
      'c',
      'd',
      'e',
    ]);
  });

  it('filtra pelo grupo do colaborador', () => {
    expect(ids(visibleItems(ITEMS, options({ filter: 'todos', groupId: 'grp-ti' })))).toEqual([
      'b',
    ]);
  });
});

describe('ApprovalInbox', () => {
  const URLS = [
    '/api/pedidos',
    '/api/colaboradores',
    '/api/grupos',
    '/api/regras',
    '/api/feriados',
    '/api/excecoes',
  ];
  let inbox: ApprovalInbox;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    inbox = TestBed.inject(ApprovalInbox);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  /** Responde a cada chamada com as fixtures, ou com o erro dado para uma delas. */
  async function respond(failing?: { url: string; status: number }): Promise<void> {
    const data = createFixtures(new Date('2026-11-12T10:00:00-03:00'));
    const bodies: Record<string, object[]> = {
      '/api/pedidos': data.requests,
      '/api/colaboradores': data.employees,
      '/api/grupos': data.groups,
      '/api/regras': data.schedules,
      '/api/feriados': data.holidays,
      '/api/excecoes': data.exceptions,
    };
    for (const url of URLS) {
      const call = http.expectOne(url);
      if (failing?.url === url) {
        call.flush({ message: 'Erro' }, { status: failing.status, statusText: '' });
      } else {
        call.flush(bodies[url]);
      }
    }
    http.match('/api/eu').forEach((call) => call.flush({ id: 'col-25', name: 'Renata' }));
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('carrega e depois fica pronta, com o contexto de cada pedido', async () => {
    expect(inbox.state()).toBe('loading');
    await respond();

    expect(inbox.state()).toBe('ready');
    expect(inbox.items()).toHaveLength(25);
    const lucas = inbox.items().find((i) => i.request.id === 'ped-02')!;
    expect(lucas.employee.name).toBe('Lucas Bittencourt');
    expect(lucas.group?.name).toBe('Comercial');
    expect(lucas.context?.alerts.map((a) => a.kind)).toEqual(['limite_diario']);
    expect(inbox.groups().map((g) => g.name)).toEqual([
      'Atendimento',
      'Comercial',
      'Financeiro',
      'Operações',
      'RH',
      'TI',
    ]);
  });

  it('403 em qualquer chamada: sem permissão', async () => {
    await respond({ url: '/api/pedidos', status: 403 });
    expect(inbox.state()).toBe('forbidden');
  });

  it('outro erro: erro, e "Tentar de novo" recarrega só o que falhou', async () => {
    await respond({ url: '/api/regras', status: 503 });
    expect(inbox.state()).toBe('error');

    inbox.retry();
    TestBed.tick();
    expect(inbox.state()).toBe('error');
    expect(inbox.retrying()).toBe(true);
    http.expectOne('/api/regras').flush([]);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(inbox.state()).toBe('ready');
    expect(inbox.retrying()).toBe(false);
  });
});
