// Pedidos, exceções e histórico com datas relativas a "agora". Assim a demo e os testes sempre
// têm pedidos em aberto, qualquer que seja o dia ou a hora em que o app abre:
// - pedido em aberto ou decidido hoje vale para a próxima jornada da pessoa cujo fim pedido
//   ainda esteja a mais de 2 h de agora;
// - pedido fechado vale para uma jornada que já passou (`shiftsAgo`: quantas jornadas atrás).

import { addDays, toInstant, toLocal, weekdayOf } from '../../shared/date';
import {
  ActivityEvent,
  Employee,
  ExtensionDecision,
  ExtensionRequest,
  ExtensionRequestStatus,
  Group,
  Holiday,
  ScheduleException,
  WorkSchedule,
} from '../../shared/models';
import { appliesTo } from '../../shared/schedule-engine';
import { MINUTES_PER_DAY, toMinutes } from '../../shared/time';
import {
  NewActivityEvent,
  requestCancelled,
  requestCreated,
  requestDecided,
  requestExpired,
  scheduleSaved,
} from '../activity';
import { HR_VALIDATOR_ID } from './employees';

interface RequestSpec {
  id: string;
  employeeId: string;
  requestedEnd: string;
  reason: string;
  status: ExtensionRequestStatus;
  /** Pedido da próxima jornada: há quantos minutos foi criado. Cada decisão vem 10 min depois. */
  minutesAgo?: number;
  /** Pedido fechado: quantas jornadas atrás. */
  shiftsAgo?: number;
  /** Quem decidiu na etapa do gestor. Sem valor, é o gestor da área. */
  approverId?: string;
  /** Motivo da recusa. */
  rejection?: string;
  /** A recusa foi do RH, depois de o gestor aprovar. */
  rejectedByHr?: boolean;
}

// As decisões saem do status: "aprovado" passa pelo RH quando a regra pede, por exemplo.
const REQUESTS: RequestSpec[] = [
  // Aguardando o gestor
  {
    id: 'ped-01',
    employeeId: 'col-08',
    requestedEnd: '19:00',
    reason: 'Reunião com cliente no fim do dia',
    status: 'aguardando_gestor',
    minutesAgo: 12,
  },
  {
    // Passa do limite de 2 h extras (17h → 19h30).
    id: 'ped-02',
    employeeId: 'col-14',
    requestedEnd: '19:30',
    reason: 'Entrega de proposta comercial',
    status: 'aguardando_gestor',
    minutesAgo: 25,
  },
  {
    id: 'ped-03',
    employeeId: 'col-02',
    requestedEnd: '18:30',
    reason: 'Fechamento do mês',
    status: 'aguardando_gestor',
    minutesAgo: 41,
  },
  {
    // Quebra a interjornada se for aprovado: sai às 23h30 e entra às 10h do dia seguinte
    // (exceção exc-01). Com 11 h de descanso, a estação só libera às 10h30.
    id: 'ped-04',
    employeeId: 'col-17',
    requestedEnd: '23:30',
    reason: 'Atendimento a cliente',
    status: 'aguardando_gestor',
    minutesAgo: 8,
  },
  {
    id: 'ped-05',
    employeeId: 'col-18',
    requestedEnd: '23:00',
    reason: 'Fila de chamados acima do normal',
    status: 'aguardando_gestor',
    minutesAgo: 55,
  },
  {
    id: 'ped-06',
    employeeId: 'col-34',
    requestedEnd: '21:00',
    reason: 'Implantação agendada',
    status: 'aguardando_gestor',
    minutesAgo: 70,
  },
  {
    id: 'ped-07',
    employeeId: 'col-27',
    requestedEnd: '07:30',
    reason: 'Cobrir colega na troca de turno',
    status: 'aguardando_gestor',
    minutesAgo: 33,
  },
  {
    id: 'ped-08',
    employeeId: 'col-38',
    requestedEnd: '20:00',
    reason: 'Folha de pagamento',
    status: 'aguardando_gestor',
    minutesAgo: 95,
  },

  // Aguardando o RH (o gestor já aprovou)
  {
    id: 'ped-09',
    employeeId: 'col-11',
    requestedEnd: '18:30',
    reason: 'Atendimento a cliente',
    status: 'aguardando_rh',
    minutesAgo: 120,
  },
  {
    id: 'ped-10',
    employeeId: 'col-03',
    requestedEnd: '19:00',
    reason: 'Conferência de notas fiscais',
    status: 'aguardando_rh',
    minutesAgo: 150,
  },
  {
    id: 'ped-11',
    employeeId: 'col-28',
    requestedEnd: '07:00',
    reason: 'Inventário de equipamentos',
    status: 'aguardando_rh',
    minutesAgo: 80,
  },
  {
    id: 'ped-12',
    employeeId: 'col-06',
    requestedEnd: '18:00',
    reason: 'Auditoria externa',
    status: 'aguardando_rh',
    minutesAgo: 200,
  },

  // Aprovados: três hoje, para a próxima jornada, e três em jornadas que já passaram
  {
    id: 'ped-13',
    employeeId: 'col-19',
    requestedEnd: '23:00',
    reason: 'Atendimento a cliente',
    status: 'aprovado',
    minutesAgo: 60,
  },
  {
    id: 'ped-14',
    employeeId: 'col-33',
    requestedEnd: '21:00',
    reason: 'Janela de manutenção',
    status: 'aprovado',
    minutesAgo: 90,
  },
  {
    id: 'ped-15',
    employeeId: 'col-20',
    requestedEnd: '23:30',
    reason: 'Treinamento de novos atendentes',
    status: 'aprovado',
    minutesAgo: 45,
    approverId: 'col-25',
  },
  {
    id: 'ped-16',
    employeeId: 'col-10',
    requestedEnd: '18:30',
    reason: 'Fechamento do mês',
    status: 'aprovado',
    shiftsAgo: 1,
  },
  {
    id: 'ped-17',
    employeeId: 'col-29',
    requestedEnd: '08:00',
    reason: 'Janela de manutenção dos servidores',
    status: 'aprovado',
    shiftsAgo: 2,
  },
  {
    id: 'ped-18',
    employeeId: 'col-13',
    requestedEnd: '19:00',
    reason: 'Fechamento do mês',
    status: 'aprovado',
    shiftsAgo: 4,
  },

  // Recusados
  {
    id: 'ped-19',
    employeeId: 'col-12',
    requestedEnd: '19:00',
    reason: 'Visita a cliente',
    status: 'recusado',
    minutesAgo: 35,
    rejection: 'A visita pode ficar para amanhã de manhã.',
  },
  {
    id: 'ped-20',
    employeeId: 'col-23',
    requestedEnd: '23:00',
    reason: 'Cobrir colega em falta',
    status: 'recusado',
    shiftsAgo: 1,
    rejection: 'A fila já está coberta por outra pessoa da equipe.',
  },
  {
    id: 'ped-21',
    employeeId: 'col-05',
    requestedEnd: '19:00',
    reason: 'Conciliação bancária',
    status: 'recusado',
    shiftsAgo: 3,
    rejection: 'Limite de horas extras do mês atingido. Vamos redistribuir a conciliação.',
    rejectedByHr: true,
  },

  // Expirados, sem decisão
  {
    id: 'ped-22',
    employeeId: 'col-09',
    requestedEnd: '18:30',
    reason: 'Atendimento a cliente',
    status: 'expirado',
    shiftsAgo: 2,
  },
  {
    id: 'ped-23',
    employeeId: 'col-31',
    requestedEnd: '07:00',
    reason: 'Passagem de turno',
    status: 'expirado',
    shiftsAgo: 5,
  },

  // Cancelados pelo colaborador
  {
    id: 'ped-24',
    employeeId: 'col-15',
    requestedEnd: '18:00',
    reason: 'Reunião com cliente no fim do dia',
    status: 'cancelado',
    shiftsAgo: 1,
  },
  {
    id: 'ped-25',
    employeeId: 'col-35',
    requestedEnd: '20:00',
    reason: 'Suporte a evento interno',
    status: 'cancelado',
    shiftsAgo: 3,
  },
];

const MINUTE = 60_000;

export interface ScenarioContext {
  now: Date;
  employees: readonly Employee[];
  groups: readonly Group[];
  schedules: readonly WorkSchedule[];
  holidays: readonly Holiday[];
}

export interface Scenario {
  exceptions: ScheduleException[];
  requests: ExtensionRequest[];
  events: ActivityEvent[];
}

export function createScenario(context: ScenarioContext): Scenario {
  const calendar = new Calendar(context);
  const requests = REQUESTS.map((spec) => buildRequest(spec, context, calendar));
  const exceptions = buildExceptions(requests, context, calendar);
  return { exceptions, requests, events: buildHistory(requests, context) };
}

function buildRequest(
  spec: RequestSpec,
  context: ScenarioContext,
  calendar: Calendar,
): ExtensionRequest {
  const employee = byId(context.employees, spec.employeeId);
  const schedule = calendar.scheduleOf(employee);
  const date =
    spec.shiftsAgo === undefined
      ? calendar.upcoming(schedule, spec.requestedEnd)
      : calendar.past(schedule, spec.requestedEnd, spec.shiftsAgo);
  const end = calendar.endOf(schedule, schedule.end);

  // Pedido aberto: criado há `minutesAgo`. Pedido fechado: 2 h antes do fim da jornada.
  const createdAt =
    spec.shiftsAgo === undefined
      ? context.now.getTime() - (spec.minutesAgo ?? 0) * MINUTE
      : Date.parse(toInstant(date, end - 120));
  const gap = spec.shiftsAgo === undefined ? 10 * MINUTE : 30 * MINUTE;
  const at = (i: number) => new Date(createdAt + (i + 1) * gap).toISOString();

  const manager = spec.approverId ?? byId(context.groups, employee.groupId).approverIds[0];
  const decisions: Omit<ExtensionDecision, 'at'>[] = [];
  const approve = (step: ExtensionDecision['step'], approverId: string) =>
    decisions.push({ step, outcome: 'aprovado', approverId });
  const reject = (step: ExtensionDecision['step'], approverId: string) =>
    decisions.push({ step, outcome: 'recusado', approverId, reason: spec.rejection });

  if (spec.status === 'aguardando_rh') approve('gestor', manager);
  if (spec.status === 'aprovado') {
    approve('gestor', manager);
    if (schedule.requiresHrValidation) approve('rh', HR_VALIDATOR_ID);
  }
  if (spec.status === 'recusado' && spec.rejectedByHr) {
    approve('gestor', manager);
    reject('rh', HR_VALIDATOR_ID);
  } else if (spec.status === 'recusado') {
    reject('gestor', manager);
  }

  return {
    id: spec.id,
    employeeId: employee.id,
    date,
    currentEnd: schedule.end,
    requestedEnd: spec.requestedEnd,
    reason: spec.reason,
    status: spec.status,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: toInstant(date, calendar.endOf(schedule, spec.requestedEnd)),
    decisions: decisions.map((decision, i) => ({ ...decision, at: at(i) })),
  };
}

function buildExceptions(
  requests: readonly ExtensionRequest[],
  context: ScenarioContext,
  calendar: Calendar,
): ScheduleException[] {
  const today = toLocal(context.now).date;
  const schedule = (id: string) => byId(context.schedules, id);
  const interjornada = byId(requests, 'ped-04');
  return [
    {
      // Dia seguinte ao pedido ped-04: entrada às 10h, em vez das 14h da regra Tarde.
      id: 'exc-01',
      employeeId: interjornada.employeeId,
      date: addDays(interjornada.date, 1),
      kind: 'horario',
      start: '10:00',
      end: '18:00',
      breaks: [{ label: 'Almoço', start: '13:00', end: '14:00' }],
      reason: 'Treinamento da nova central de atendimento',
    },
    {
      id: 'exc-02',
      employeeId: 'col-04',
      date: calendar.nextShift(schedule('regra-comercial'), addDays(today, 1)),
      kind: 'horario',
      start: '07:00',
      end: '16:00',
      breaks: [{ label: 'Almoço', start: '11:00', end: '12:00' }],
      reason: 'Auditoria externa',
    },
    {
      id: 'exc-03',
      employeeId: 'col-35',
      date: calendar.nextShift(schedule('regra-flexivel'), addDays(today, 2)),
      kind: 'folga',
      reason: 'Doação de sangue',
    },
    {
      id: 'exc-04',
      employeeId: 'col-30',
      date: calendar.nextShift(schedule('regra-noturna'), addDays(today, 3)),
      kind: 'folga',
      reason: 'Compensação de banco de horas',
    },
  ];
}

function buildHistory(
  requests: readonly ExtensionRequest[],
  context: ScenarioContext,
): ActivityEvent[] {
  const person = (id: string) => byId(context.employees, id);
  const events: NewActivityEvent[] = [];

  for (const request of requests) {
    const employee = person(request.employeeId);
    events.push(requestCreated(request, employee));
    request.decisions.forEach((decision, i) => {
      // A frase depende do status logo depois da decisão: só a última fecha o pedido.
      const status = i < request.decisions.length - 1 ? 'aguardando_rh' : request.status;
      events.push(
        requestDecided({ ...request, status }, decision, employee, person(decision.approverId)),
      );
    });
    if (request.status === 'expirado') events.push(requestExpired(request, employee));
    if (request.status === 'cancelado') {
      const at = new Date(Date.parse(request.createdAt) + 40 * MINUTE).toISOString();
      events.push(requestCancelled(request, employee, at));
    }
  }

  const daysAgo = (days: number) =>
    new Date(context.now.getTime() - days * MINUTES_PER_DAY * MINUTE).toISOString();
  const hr = person(HR_VALIDATOR_ID);
  events.push(scheduleSaved(byId(context.schedules, 'regra-flexivel'), hr, daysAgo(20), true));
  events.push(scheduleSaved(byId(context.schedules, 'regra-tarde'), hr, daysAgo(3), false));

  return events
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((event, i) => ({ id: `evt-${String(i + 1).padStart(3, '0')}`, ...event }));
}

/** Contas de calendário das fixtures: em que dias cada regra tem jornada. */
class Calendar {
  private readonly now: number;
  private readonly today: string;

  constructor(private readonly context: ScenarioContext) {
    this.now = context.now.getTime();
    this.today = toLocal(context.now).date;
  }

  scheduleOf(employee: Employee): WorkSchedule {
    const schedule = this.context.schedules.find((s) => appliesTo(s, employee));
    if (!schedule) throw new Error(`Fixture: ${employee.name} não tem regra de jornada.`);
    return schedule;
  }

  /** Minutos de `time` contados da meia-noite do dia em que a jornada começa (6h na Noturna = 30h). */
  endOf(schedule: WorkSchedule, time: string): number {
    const start = toMinutes(schedule.start);
    const minutes = toMinutes(time);
    return minutes <= start ? minutes + MINUTES_PER_DAY : minutes;
  }

  /** Primeira jornada, a partir de ontem, em que `time` ainda está a mais de 2 h de agora. */
  upcoming(schedule: WorkSchedule, time: string): string {
    return this.find(addDays(this.today, -1), 1, (date) => {
      const end = Date.parse(toInstant(date, this.endOf(schedule, time)));
      return this.hasShift(schedule, date) && end > this.now + 2 * 60 * MINUTE;
    });
  }

  /** A jornada `shiftsAgo` vezes atrás, contando só as que já terminaram, inclusive o `time`. */
  past(schedule: WorkSchedule, time: string, shiftsAgo: number): string {
    let count = 0;
    return this.find(this.today, -1, (date) => {
      const end = Date.parse(toInstant(date, this.endOf(schedule, time)));
      if (this.hasShift(schedule, date) && end < this.now) count++;
      return count === shiftsAgo;
    });
  }

  /** Primeiro dia com jornada a partir de `from`. */
  nextShift(schedule: WorkSchedule, from: string): string {
    return this.find(from, 1, (date) => this.hasShift(schedule, date));
  }

  private hasShift(schedule: WorkSchedule, date: string): boolean {
    const holiday = this.context.holidays.some((h) => h.date === date);
    return schedule.weekdays.includes(weekdayOf(date)) && !holiday;
  }

  /** Anda de um em um dia a partir de `from` até achar. Um mês sem achar é erro na fixture. */
  private find(from: string, direction: 1 | -1, found: (date: string) => boolean): string {
    for (let i = 0, date = from; i < 31; i++, date = addDays(date, direction)) {
      if (found(date)) return date;
    }
    throw new Error(`Fixture: nenhum dia encontrado a partir de ${from}.`);
  }
}

function byId<T extends { id: string }>(list: readonly T[], id: string): T {
  const item = list.find((i) => i.id === id);
  if (!item) throw new Error(`Fixture: ${id} não existe.`);
  return item;
}
