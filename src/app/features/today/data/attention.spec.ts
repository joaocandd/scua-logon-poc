import { createFixtures } from '../../../mocks/fixtures';
import { ExtensionRequest } from '../../../shared/models';
import { pendingSummary, todayAlerts } from './attention';
import { StationRow } from './stations';

// Terça-feira, 18h20 em São Paulo. Os pedidos das fixtures são relativos a este instante.
const NOW = new Date('2026-11-03T18:20:00-03:00');
const data = createFixtures(NOW);
const employeeById = new Map(data.employees.map((e) => [e.id, e]));
const at = (time: string) => Date.parse(`2026-11-03T${time}:00-03:00`);

/** Estação de cada colaborador com regra: a Renata (col-25) fica sem regra. */
function stations(unapproved: string[] = []): StationRow[] {
  return data.employees
    .filter((e) => e.id !== 'col-25')
    .map((e) => ({
      employeeId: e.id,
      name: e.name,
      groupId: e.groupId,
      groupName: '',
      filter: unapproved.includes(e.id) ? 'sem_aprovacao' : 'em_jornada',
      status: unapproved.includes(e.id) ? 'em_observacao' : 'em_jornada',
      reason: '',
    }));
}

describe('pendingSummary', () => {
  it('quantos aguardam o gestor e o RH, e o que vence antes', () => {
    expect(pendingSummary(data.requests, employeeById, null, NOW.getTime())).toEqual({
      count: 8,
      hrCount: 4,
      next: 'O próximo é de Vinícius Amaral. Expira em 2h40.',
    });
  });

  it('só os do grupo escolhido', () => {
    expect(pendingSummary(data.requests, employeeById, 'grp-comercial', NOW.getTime())).toEqual({
      count: 2,
      hrCount: 1,
      next: 'O próximo é de João Pedro Antunes. Expira amanhã às 19h.',
    });
  });

  it('sem pedidos', () => {
    expect(pendingSummary([], employeeById, null, NOW.getTime())).toEqual({
      count: 0,
      hrCount: 0,
      next: null,
    });
  });
});

describe('todayAlerts', () => {
  const input = {
    stations: stations(),
    employees: data.employees,
    requests: data.requests,
    schedules: data.schedules,
    now: NOW.getTime(),
  };

  it('estações liberadas sem aprovação: quantas e a regra em observação, com o último dia', () => {
    const [alert] = todayAlerts({ ...input, stations: stations(['col-27', 'col-28']) });
    expect(alert).toEqual({
      kind: 'sem_aprovacao',
      title: '2 estações liberadas sem aprovação',
      detail:
        'A regra Noturna está em observação até sáb, 07/11: ela bloquearia estas estações agora, mas não bloqueia.',
    });
  });

  it('com mais de uma regra em observação, cita as duas', () => {
    const schedules = data.schedules.map((s) =>
      s.id === 'regra-tarde' ? { ...s, observationMode: true } : s,
    );
    const [alert] = todayAlerts({
      ...input,
      schedules,
      stations: stations(['col-27', 'col-17']),
    });
    expect(alert.detail).toBe(
      'As regras Tarde e Noturna estão em observação: elas bloqueariam estas estações agora, mas não bloqueiam.',
    );
  });

  it('pedidos que vencem na próxima hora, do que vence antes', () => {
    const alerts = todayAlerts({ ...input, now: at('20:10') });
    expect(alerts.find((a) => a.kind === 'vencendo')).toEqual({
      kind: 'vencendo',
      title: '1 pedido vence na próxima hora',
      detail: 'Vinícius Amaral às 21h.',
    });
  });

  it('mais de três pedidos vencendo: os três primeiros e quantos mais', () => {
    const soon = (id: string, employeeId: string, minutes: number): ExtensionRequest => ({
      ...data.requests[0],
      id,
      employeeId,
      status: 'aguardando_gestor',
      expiresAt: new Date(NOW.getTime() + minutes * 60_000).toISOString(),
    });
    const requests = [
      soon('a', 'col-08', 50),
      soon('b', 'col-09', 10),
      soon('c', 'col-10', 20),
      soon('d', 'col-11', 30),
      soon('e', 'col-12', 40),
    ];
    const alert = todayAlerts({ ...input, requests }).find((a) => a.kind === 'vencendo');
    expect(alert?.title).toBe('5 pedidos vencem na próxima hora');
    expect(alert?.detail).toBe(
      'Ana Ribeiro às 18h30, Felipe Guimarães às 18h40, Camila Vasconcelos às 18h50 e mais 2 pedidos.',
    );
  });

  it('colaborador sem regra de jornada: a estação não é controlada', () => {
    expect(todayAlerts(input)).toEqual([
      {
        kind: 'sem_regra',
        title: '1 colaborador sem regra de jornada',
        detail: 'A estação de Renata Albuquerque não é bloqueada em nenhum horário.',
      },
    ]);
  });

  it('no grupo escolhido, só os alertas dele', () => {
    const comercial = data.employees.filter((e) => e.groupId === 'grp-comercial');
    const inComercial = stations(['col-27']).filter((s) => s.groupId === 'grp-comercial');
    expect(todayAlerts({ ...input, employees: comercial, stations: inComercial })).toEqual([]);
  });
});
