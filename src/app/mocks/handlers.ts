// Rotas da API simulada. Cada rota recebe o banco em memória e devolve status e corpo, como um
// servidor faria. Erros sempre vêm como { message } em português, pronto para a tela.

import { toLocal } from '../shared/date';
import { ExtensionDecision, ExtensionRequest, Workstation, WorkSchedule } from '../shared/models';
import { evaluateWorkstation } from '../shared/schedule-engine';
import { formatClock, toMinutes } from '../shared/time';
import { requestDecided, scheduleSaved } from './activity';
import { MockDb } from './db';

export interface MockRequest {
  method: string;
  /** Caminho com a query, como "/api/historico?pedido=ped-01". */
  url: string;
  body?: unknown;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

/** Corpo de toda resposta de erro. */
export interface ApiError {
  message: string;
}

interface Context {
  db: MockDb;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  now: Date;
}

type Handler = (context: Context) => MockResponse;

const ROUTES: [method: string, path: string, handler: Handler][] = [
  ['GET', '/api/colaboradores', ({ db }) => ok(db.data.employees)],
  ['GET', '/api/grupos', ({ db }) => ok(db.data.groups)],
  ['GET', '/api/feriados', ({ db }) => ok(db.data.holidays)],
  ['GET', '/api/excecoes', ({ db }) => ok(db.data.exceptions)],

  ['GET', '/api/regras', ({ db }) => ok(db.data.schedules)],
  [
    'GET',
    '/api/regras/:id',
    ({ db, params }) => found(db.data.schedules, params['id'], 'Não encontramos esta regra.'),
  ],
  ['POST', '/api/regras', (context) => saveSchedule(context)],
  ['PUT', '/api/regras/:id', (context) => saveSchedule(context, context.params['id'])],

  ['GET', '/api/pedidos', ({ db }) => ok(db.data.requests)],
  [
    'GET',
    '/api/pedidos/:id',
    ({ db, params }) => found(db.data.requests, params['id'], 'Não encontramos este pedido.'),
  ],
  ['POST', '/api/pedidos/:id/aprovar', (context) => decide(context, 'aprovado')],
  ['POST', '/api/pedidos/:id/recusar', (context) => decide(context, 'recusado')],

  ['GET', '/api/historico', listActivity],
  ['GET', '/api/estacoes', listWorkstations],
];

/** Responde a uma chamada a /api/... a partir do banco em memória. */
export function handleApiRequest(db: MockDb, request: MockRequest, now = new Date()): MockResponse {
  const url = new URL(request.url, 'http://localhost');
  db.expirePending(now);
  for (const [method, path, handler] of ROUTES) {
    const params = matchPath(path, url.pathname);
    if (method === request.method && params) {
      return handler({ db, params, query: url.searchParams, body: request.body, now });
    }
  }
  return fail(404, 'Não encontramos o que você procurou.');
}

function decide(
  { db, params, body, now }: Context,
  outcome: ExtensionDecision['outcome'],
): MockResponse {
  const request = db.data.requests.find((r) => r.id === params['id']);
  const employee = request && db.employee(request.employeeId);
  const approver = db.employee(db.currentUserId);
  if (!request || !employee || !approver) return fail(404, 'Não encontramos este pedido.');
  if (request.status !== 'aguardando_gestor' && request.status !== 'aguardando_rh') {
    return fail(409, alreadyClosed(db, request));
  }

  const reason = readReason(body);
  if (outcome === 'recusado' && !reason) return fail(422, 'Escreva o motivo da recusa.');

  const step = request.status === 'aguardando_gestor' ? 'gestor' : 'rh';
  const decision: ExtensionDecision = {
    step,
    outcome,
    approverId: approver.id,
    at: now.toISOString(),
    ...(reason && { reason }),
  };
  const needsHr =
    step === 'gestor' && outcome === 'aprovado' && db.scheduleFor(employee)?.requiresHrValidation;
  request.decisions.push(decision);
  request.status = needsHr ? 'aguardando_rh' : outcome;
  db.log(requestDecided(request, decision, employee, approver));
  return ok(request);
}

/** "Este pedido já foi aprovado por Carlos às 17h52." */
function alreadyClosed(db: MockDb, request: ExtensionRequest): string {
  const firstName = (id: string) => db.employee(id)?.name.split(' ')[0] ?? 'outra pessoa';
  const clock = (instant: string) => formatClock(toLocal(instant).minutes);
  const last = request.decisions.at(-1);
  switch (request.status) {
    case 'expirado':
      return `Este pedido expirou às ${clock(request.expiresAt)}, sem decisão.`;
    case 'cancelado':
      return `${firstName(request.employeeId)} cancelou este pedido.`;
    default:
      return last
        ? `Este pedido já foi ${request.status} por ${firstName(last.approverId)} às ${clock(last.at)}.`
        : 'Este pedido já foi decidido.';
  }
}

function saveSchedule({ db, body, now }: Context, id?: string): MockResponse {
  const problem = scheduleProblem(body);
  if (problem) return fail(422, problem);
  const index = db.data.schedules.findIndex((s) => s.id === id);
  if (id && index < 0) return fail(404, 'Não encontramos esta regra.');

  const saved: WorkSchedule = {
    ...structuredClone(body as WorkSchedule),
    id: id ?? `regra-${crypto.randomUUID().slice(0, 8)}`,
  };
  if (id) db.data.schedules[index] = saved;
  else db.data.schedules.push(saved);

  const actor = db.employee(db.currentUserId);
  if (actor) db.log(scheduleSaved(saved, actor, now.toISOString(), !id));
  return ok(saved, id ? 200 : 201);
}

/** Conferência mínima do formato. As validações de negócio ficam no editor de regras. */
function scheduleProblem(body: unknown): string | null {
  const schedule = body as Partial<WorkSchedule> | null;
  if (!schedule?.name?.trim()) return 'Dê um nome para a regra.';
  if (!schedule.weekdays?.length) return 'Escolha ao menos um dia da semana.';
  const times = [
    schedule.start,
    schedule.end,
    ...(schedule.breaks ?? []).flatMap((b) => [b.start, b.end]),
  ];
  try {
    times.forEach((time) => toMinutes(time ?? ''));
  } catch {
    return 'Confira os horários. Use o formato 08:00.';
  }
  return null;
}

/** Histórico, do mais novo para o mais antigo. Filtros: ?pedido=ped-01 e ?regra=regra-tarde. */
function listActivity({ db, query }: Context): MockResponse {
  const requestId = query.get('pedido');
  const scheduleId = query.get('regra');
  const events = db.data.events
    .filter((e) => !requestId || e.requestId === requestId)
    .filter((e) => !scheduleId || e.scheduleId === scheduleId)
    .sort((a, b) => b.at.localeCompare(a.at));
  return ok(events);
}

/** Estação de cada colaborador agora. Quem não tem regra de jornada fica de fora (sem controle). */
function listWorkstations({ db, now }: Context): MockResponse {
  const workstations: Workstation[] = db.data.employees.flatMap((employee) => {
    const schedule = db.scheduleFor(employee);
    if (!schedule) return [];
    const status = evaluateWorkstation({
      schedule,
      exceptions: db.data.exceptions.filter((e) => e.employeeId === employee.id),
      holidays: db.data.holidays,
      extensions: db.data.requests.filter((r) => r.employeeId === employee.id),
      at: now,
    });
    return [{ employeeId: employee.id, ...status }];
  });
  return ok(workstations);
}

/** "/api/pedidos/:id" casa com "/api/pedidos/ped-01" e devolve { id: "ped-01" }. */
function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const expected = pattern.split('/');
  const actual = pathname.split('/');
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (const [i, part] of expected.entries()) {
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(actual[i]);
    else if (part !== actual[i]) return null;
  }
  return params;
}

function readReason(body: unknown): string {
  const reason = (body as { reason?: unknown } | null)?.reason;
  return typeof reason === 'string' ? reason.trim() : '';
}

function found<T extends { id: string }>(list: T[], id: string, notFound: string): MockResponse {
  const item = list.find((i) => i.id === id);
  return item ? ok(item) : fail(404, notFound);
}

/** Copia o corpo, como se tivesse passado pela rede: a tela não altera o banco sem querer. */
function ok(body: unknown, status = 200): MockResponse {
  return { status, body: structuredClone(body) };
}

function fail(status: number, message: string): MockResponse {
  const body: ApiError = { message };
  return { status, body };
}
