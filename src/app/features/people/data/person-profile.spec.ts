import { ActivityEvent, ExtensionRequest, WorkSchedule } from '../../../shared/models';
import {
  formatFullDate,
  overtimeByDay,
  overtimeTotal,
  recentEvents,
  recentRequests,
  todayTimeline,
} from './person-profile';

const TUESDAY_EVENING = Date.parse('2026-11-03T18:20:00-03:00');

const COMERCIAL = {
  id: 'regra-comercial',
  name: 'Comercial',
  start: '08:00',
  end: '17:00',
  weekdays: [1, 2, 3, 4, 5],
  breaks: [{ label: 'Almoço', start: '12:00', end: '13:00' }],
} as unknown as WorkSchedule;

const request = (id: string, patch: Partial<ExtensionRequest>): ExtensionRequest => ({
  id,
  employeeId: 'col-08',
  date: '2026-11-03',
  currentEnd: '17:00',
  requestedEnd: '19:00',
  reason: 'Fechamento',
  status: 'aprovado',
  createdAt: '2026-11-03T19:00:00Z',
  expiresAt: '2026-11-03T22:00:00Z',
  decisions: [],
  ...patch,
});

describe('perfil do colaborador', () => {
  it('jornada de hoje: jornada, intervalo e a hora extra aprovada', () => {
    const day = todayTimeline('João', COMERCIAL, [], [], [request('ped-1', {})], TUESDAY_EVENING)!;
    expect(day.label).toBe('Jornada de João hoje, ter, 03/11');
    expect(day.segments).toEqual([
      { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
      { start: '12:00', end: '13:00', kind: 'locked', label: 'Almoço' },
      { start: '17:00', end: '19:00', kind: 'unlocked', label: 'Hora extra aprovada' },
    ]);
    expect(day.summary).toBe('Jornada Comercial, das 8h às 17h, com hora extra aprovada até 19h.');
  });

  it('pedido aguardando aparece como hora extra pedida, no limite de 2 h', () => {
    const pending = request('ped-2', { status: 'aguardando_gestor', requestedEnd: '20:00' });
    const day = todayTimeline('João', COMERCIAL, [], [], [pending], TUESDAY_EVENING)!;
    expect(day.segments.at(-1)).toEqual({
      start: '17:00',
      end: '19:00',
      kind: 'requested',
      label: 'Hora extra pedida',
    });
  });

  it('feriado: sem jornada, com o motivo; sem regra: nulo', () => {
    const holidays = [{ date: '2026-11-03', name: 'Feriado de teste' }];
    const day = todayTimeline('João', COMERCIAL, [], holidays as never, [], TUESDAY_EVENING)!;
    expect(day.segments).toEqual([]);
    expect(day.summary).toBe('Sem jornada hoje: feriado (Feriado de teste).');
    expect(todayTimeline('João', undefined, [], [], [], TUESDAY_EVENING)).toBeNull();
  });

  it('horas extras: 30 barras, zero nos dias sem hora extra, hoje "(até agora)"', () => {
    const rows = [
      { date: '2026-11-03', employeeId: 'col-08', overtimeMinutes: 90 },
      { date: '2026-10-20', employeeId: 'col-08', overtimeMinutes: 60 },
      { date: '2026-10-20', employeeId: 'col-09', overtimeMinutes: 120 },
    ];
    const days = overtimeByDay(rows, 'col-08', TUESDAY_EVENING);
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toEqual({
      label: '03/11',
      longLabel: 'ter, 03/11 (até agora)',
      value: 1.5,
    });
    expect(days.find((d) => d.label === '20/10')?.value).toBe(1);
    expect(days.filter((d) => d.value > 0)).toHaveLength(2);
    expect(overtimeTotal(rows, 'col-08')).toBe(150);
  });

  it('pedidos recentes: os mais novos primeiro, no máximo 5', () => {
    const list = [
      request('ped-a', { date: '2026-10-30' }),
      request('ped-b', { date: '2026-11-03', status: 'recusado' }),
      request('ped-c', { date: '2026-11-03', employeeId: 'col-09' }),
      ...['d', 'e', 'f', 'g'].map((x) => request(`ped-${x}`, { date: '2026-10-01' })),
    ];
    const recent = recentRequests(list, 'col-08');
    expect(recent).toHaveLength(5);
    expect(recent[0]).toEqual({
      id: 'ped-b',
      day: 'ter, 03/11',
      until: 'Até 19h (+2h)',
      status: 'recusado',
    });
    expect(recent[1].id).toBe('ped-a');
  });

  it('eventos: quem fez ou foi afetado, na ordem da API', () => {
    const events = [
      { id: 'e3', at: '2026-11-03T21:10:00Z', employeeId: 'col-08', summary: 'C' },
      { id: 'e2', at: '2026-11-03T20:00:00Z', actorId: 'col-09', summary: 'B' },
      { id: 'e1', at: '2026-11-03T19:15:00Z', actorId: 'col-08', summary: 'A' },
    ] as ActivityEvent[];
    expect(recentEvents(events, 'col-08')).toEqual([
      { id: 'e3', at: '2026-11-03T21:10:00Z', when: 'ter, 03/11 às 18h10', summary: 'C' },
      { id: 'e1', at: '2026-11-03T19:15:00Z', when: 'ter, 03/11 às 16h15', summary: 'A' },
    ]);
  });

  it('data de admissão completa', () => {
    expect(formatFullDate('2019-03-04')).toBe('04/03/2019');
  });
});
