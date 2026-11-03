// Rotas da API simulada. Cada rota recebe o banco em memória e devolve status e corpo, como um
// servidor faria. Erros sempre vêm como { message } em português, pronto para a tela.

import { addDays, toLocal } from '../shared/date';
import {
  ApprovalLink,
  Employee,
  ExtensionDecision,
  ExtensionRequest,
  OBSERVATION_DAYS,
  Workstation,
  WorkSchedule,
} from '../shared/models';
import { requestContext } from '../shared/request-context';
import { requestTimeline } from '../shared/request-timeline';
import { isShift, plannedShift } from '../shared/schedule-engine';
import { formatClock, toMinutes } from '../shared/time';
import { undoBlocker } from '../shared/undo-decision';
import { decisionUndone, requestDecided, scheduleSaved } from './activity';
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

/** Senha que simula credencial inválida na demonstração. */
export const DEMO_INVALID_PASSWORD = 'erro';

const ROUTES: [method: string, path: string, handler: Handler][] = [
  ['GET', '/api/eu', currentUser],
  ['POST', '/api/sessao', signIn],
  ['POST', '/api/sessao/corporativa', currentUser],
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
  ['POST', '/api/pedidos/:id/desfazer', undo],

  ['GET', '/api/aprovacao/:token', approvalLink],

  ['GET', '/api/historico', listActivity],
  ['GET', '/api/estacoes', listWorkstations],
];

/** Responde a uma chamada a /api/... a partir do banco em memória. */
export function handleApiRequest(db: MockDb, request: MockRequest, now = new Date()): MockResponse {
  const url = new URL(request.url, 'http://localhost');
  db.expirePending(now);
  db.deliverLiveRequests(now);
  db.endObservations(now);
  db.recordObservations(now);
  for (const [method, path, handler] of ROUTES) {
    const params = matchPath(path, url.pathname);
    if (method === request.method && params) {
      return handler({ db, params, query: url.searchParams, body: request.body, now });
    }
  }
  return fail(404, 'Não encontramos o que você procurou. Confira o endereço.');
}

/** Quem está usando o app (a sessão aberta). */
function currentUser({ db }: Context): MockResponse {
  return found(
    db.data.employees,
    db.currentUserId,
    'Não encontramos o seu usuário. Entre de novo.',
  );
}

/**
 * Login simulado: qualquer usuário e senha preenchidos entram como a usuária da demonstração
 * (Renata Albuquerque, que aprova todos os grupos). A senha "erro" simula credencial inválida.
 */
function signIn(context: Context): MockResponse {
  const { username, password } = (context.body ?? {}) as Record<string, unknown>;
  const filled = (value: unknown) => typeof value === 'string' && value.trim() !== '';
  if (!filled(username) || !filled(password)) return fail(422, 'Informe o usuário e a senha.');
  if (password === DEMO_INVALID_PASSWORD) return fail(401, 'Usuário ou senha incorretos.');
  return currentUser(context);
}

/**
 * Aprova ou recusa a etapa atual do pedido. O corpo pode dizer qual etapa a tela está decidindo
 * (`step`): se outra pessoa já passou dessa etapa, a resposta é 409 dizendo quem decidiu e quando.
 */
function decide(
  { db, params, body, now }: Context,
  outcome: ExtensionDecision['outcome'],
): MockResponse {
  const request = db.data.requests.find((r) => r.id === params['id']);
  const employee = request && db.employee(request.employeeId);
  if (!request || !employee) return fail(404, 'Não encontramos este pedido.');
  const approver = approverFor(db, request.id, body);
  if ('status' in approver) return approver;
  const step = currentStep(request);
  const expected = readStep(body);
  if (!step || (expected && expected !== step)) {
    return fail(409, alreadyDecided(db, request, approver.id));
  }

  const reason = readReason(body);
  if (outcome === 'recusado' && !reason) return fail(422, 'Escreva o motivo da recusa.');

  applyDecision(
    db,
    request,
    { step, outcome, approverId: approver.id, at: now.toISOString() },
    reason,
  );
  return ok(request);
}

/** Etapa em que o pedido está: gestor ou RH. Nulo quando o pedido já fechou. */
function currentStep(request: ExtensionRequest): ExtensionDecision['step'] | null {
  if (request.status === 'aguardando_gestor') return 'gestor';
  if (request.status === 'aguardando_rh') return 'rh';
  return null;
}

/** Registra a decisão: muda o status (para o RH, se a regra pedir) e anota no histórico. */
function applyDecision(
  db: MockDb,
  request: ExtensionRequest,
  decision: ExtensionDecision,
  reason?: string,
): void {
  const employee = db.employee(request.employeeId)!;
  const needsHr =
    decision.step === 'gestor' &&
    decision.outcome === 'aprovado' &&
    db.scheduleFor(employee)?.requiresHrValidation;
  request.decisions.push({ ...decision, ...(reason && { reason }) });
  request.status = needsHr ? 'aguardando_rh' : decision.outcome;
  db.log(
    requestDecided(request, request.decisions.at(-1)!, employee, db.employee(decision.approverId)!),
  );
}

/**
 * Desfaz a decisão do gestor: o pedido volta a aguardar o gestor e o histórico registra. Não dá
 * depois que o RH decidiu nem depois que o pedido venceu (mesma regra da tela, em undoBlocker).
 */
function undo({ db, params, body, now }: Context): MockResponse {
  const request = db.data.requests.find((r) => r.id === params['id']);
  const employee = request && db.employee(request.employeeId);
  if (!request || !employee) return fail(404, 'Não encontramos este pedido.');
  const approver = approverFor(db, request.id, body);
  if ('status' in approver) return approver;
  const mine = request.decisions.find((d) => d.step === 'gestor' && d.approverId === approver.id);
  if (!mine) return fail(409, 'Não há decisão sua para desfazer neste pedido.');
  const blocker = undoBlocker(request, now);
  if (blocker) return fail(409, blocker);

  request.decisions = request.decisions.filter((d) => d !== mine);
  request.status = 'aguardando_gestor';
  db.log(decisionUndone(request, mine, employee, approver, now.toISOString()));
  return ok(request);
}

/**
 * Simulação `?simular=decidido`: antes de a decisão chegar, o gestor da área (o primeiro aprovador
 * do grupo) aprova o pedido. A tela recebe 409, "Este pedido já foi aprovado por Marina às 18h03.",
 * como aconteceria com dois gestores decidindo ao mesmo tempo.
 */
export function decideElsewhereFirst(db: MockDb, request: MockRequest, now = new Date()): void {
  const { pathname } = new URL(request.url, 'http://localhost');
  const params = matchPath('/api/pedidos/:id/:action', pathname);
  const target = db.data.requests.find((r) => r.id === params?.['id']);
  const employee = target && db.employee(target.employeeId);
  const group = employee && db.data.groups.find((g) => g.id === employee.groupId);
  if (request.method !== 'POST' || !target || !group || target.status !== 'aguardando_gestor') {
    return;
  }
  if (params?.['action'] !== 'aprovar' && params?.['action'] !== 'recusar') return;
  const at = new Date(now.getTime() - 2 * 60_000).toISOString();
  applyDecision(db, target, {
    step: 'gestor',
    outcome: 'aprovado',
    approverId: group.approverIds[0],
    at,
  });
}

/**
 * "Este pedido já foi aprovado por Carlos às 17h52." Para quem decidiu (`viewerId`), "por você".
 */
function alreadyDecided(db: MockDb, request: ExtensionRequest, viewerId?: string): string {
  const firstName = (id: string) =>
    id === viewerId ? 'você' : (db.employee(id)?.name.split(' ')[0] ?? 'outra pessoa');
  const last = request.decisions.at(-1);
  switch (request.status) {
    case 'expirado':
      return `Este pedido expirou às ${clockOf(request.expiresAt)}, sem decisão.`;
    case 'cancelado':
      return `${firstName(request.employeeId)} cancelou este pedido.`;
    default:
      return last
        ? `Este pedido já foi ${last.outcome} por ${firstName(last.approverId)} às ${clockOf(last.at)}.`
        : 'Este pedido já foi decidido.';
  }
}

/** Link do e-mail que não existe, ou que veio cortado. */
const INVALID_LINK = 'Este link não é válido. Confira se ele veio completo do e-mail.';

/**
 * Página pública do link do e-mail (/aprovacao/:token). O link pode ser encaminhado, então a
 * resposta traz só o necessário para decidir (LGPD): o pedido, o nome e o grupo do colaborador e
 * o contexto já calculado aqui, com as mesmas funções puras da caixa de aprovações.
 *
 * - 404: link inválido;
 * - 410: o pedido venceu sem decisão;
 * - 409: o pedido já foi decidido, com a mesma frase da caixa de aprovações.
 *
 * Quem recebeu o link continua vendo a própria decisão enquanto ainda dá para desfazer.
 */
function approvalLink({ db, params, now }: Context): MockResponse {
  const link = db.data.tokens.find((t) => t.token === params['token']);
  const request = link && db.data.requests.find((r) => r.id === link.requestId);
  const employee = request && db.employee(request.employeeId);
  const schedule = employee && db.scheduleFor(employee);
  if (!link || !request || !employee || !schedule) return fail(404, INVALID_LINK);

  const own = request.decisions.some(
    (d) => d.step === 'gestor' && d.approverId === link.approverId,
  );
  const open = request.status === 'aguardando_gestor' || (own && !undoBlocker(request, now));
  if (!open && request.status === 'expirado') {
    return fail(
      410,
      `Este link expirou. O pedido de ${employee.name} venceu às ${clockOf(request.expiresAt)}.`,
    );
  }
  if (!open) return fail(409, alreadyDecided(db, request, link.approverId));

  const { holidays } = db.data;
  const exceptions = db.data.exceptions.filter((e) => e.employeeId === employee.id);
  const day = plannedShift(schedule, exceptions, holidays, request.date);
  const body: ApprovalLink = {
    request,
    employeeName: employee.name,
    groupName: db.data.groups.find((g) => g.id === employee.groupId)?.name ?? '',
    approverId: link.approverId,
    context: requestContext({
      request,
      schedule,
      exceptions,
      holidays,
      history: db.data.requests.filter((r) => r.employeeId === employee.id),
    }),
    timeline: requestTimeline(request, employee.name, isShift(day) ? day : null),
  };
  return ok(body);
}

/**
 * Quem decide: quem recebeu o link do e-mail, se o corpo traz o token dele, ou quem está usando o
 * app. O token só vale para o pedido do link.
 */
function approverFor(db: MockDb, requestId: string, body: unknown): Employee | MockResponse {
  const token = (body as { token?: unknown } | null)?.token;
  if (token === undefined) {
    return (
      db.employee(db.currentUserId) ?? fail(404, 'Não encontramos o seu usuário. Entre de novo.')
    );
  }
  const link = db.data.tokens.find((t) => t.token === token && t.requestId === requestId);
  return (
    (link && db.employee(link.approverId)) ??
    fail(403, 'Este link é de outro pedido. Use o link do e-mail deste pedido.')
  );
}

/** Hora de um instante no relógio de São Paulo: "18h03". */
function clockOf(instant: string): string {
  return formatClock(toLocal(instant).minutes);
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
  // A observação dura OBSERVATION_DAYS dias, contando o dia em que foi ligada. Salvar de novo uma
  // regra que já estava em observação não muda o fim.
  const previous = id ? db.data.schedules[index] : undefined;
  delete saved.observationEndsOn;
  if (saved.observationMode) {
    saved.observationEndsOn =
      (previous?.observationMode && previous.observationEndsOn) ||
      addDays(toLocal(now).date, OBSERVATION_DAYS - 1);
  }
  if (id) db.data.schedules[index] = saved;
  else db.data.schedules.push(saved);

  const actor = db.employee(db.currentUserId);
  if (actor) db.log(scheduleSaved(saved, actor, now.toISOString(), !id));
  // Quem a regra em observação bloquearia já no momento em que é salva.
  db.recordObservations(now);
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

/**
 * Histórico, do mais novo para o mais antigo; no mesmo instante, o último registrado vem antes.
 * Filtros: ?pedido=ped-01 e ?regra=regra-tarde.
 */
function listActivity({ db, query }: Context): MockResponse {
  const requestId = query.get('pedido');
  const scheduleId = query.get('regra');
  const events = db.data.events
    .map((event, order) => ({ event, order }))
    .filter(({ event }) => !requestId || event.requestId === requestId)
    .filter(({ event }) => !scheduleId || event.scheduleId === scheduleId)
    .sort((a, b) => b.event.at.localeCompare(a.event.at) || b.order - a.order)
    .map(({ event }) => event);
  return ok(events);
}

/**
 * Estação de cada colaborador agora. Quem não tem regra de jornada fica de fora (sem controle).
 * Quem só está numa regra em observação vem marcado: o estado é o que a regra faria, sem bloquear.
 */
function listWorkstations({ db, now }: Context): MockResponse {
  const workstations: Workstation[] = db.data.employees.flatMap((employee) => {
    const schedule = db.scheduleFor(employee);
    if (!schedule) return [];
    const status = db.evaluate(schedule, employee, now);
    const observed = schedule.observationMode ? { observed: true } : {};
    return [{ employeeId: employee.id, ...status, ...observed }];
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

/** Etapa que a tela diz estar decidindo. Sem etapa, vale a etapa atual do pedido. */
function readStep(body: unknown): ExtensionDecision['step'] | null {
  const step = (body as { step?: unknown } | null)?.step;
  return step === 'gestor' || step === 'rh' ? step : null;
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
