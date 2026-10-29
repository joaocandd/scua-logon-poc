import { toInstant } from '../../shared/date';
import { EXTENSION_REQUEST_STATUSES, ExtensionRequest } from '../../shared/models';
import { appliesTo, evaluateWorkstation } from '../../shared/schedule-engine';
import { toMinutes } from '../../shared/time';
import { createFixtures, CURRENT_USER_ID } from '.';

const NOW = new Date('2026-11-12T10:00:00-03:00'); // quinta-feira de manhã

describe('fixtures', () => {
  const data = createFixtures(NOW);
  const ids = <T extends { id: string }>(list: T[]) => new Set(list.map((item) => item.id));

  it('têm 40 colaboradores, 6 grupos, 4 regras e os 10 feriados nacionais de 2026', () => {
    expect(data.employees).toHaveLength(40);
    expect(data.groups.map((g) => g.name)).toEqual([
      'Financeiro',
      'Comercial',
      'Atendimento',
      'Operações',
      'TI',
      'RH',
    ]);
    expect(data.schedules.map((s) => `${s.name} ${s.start}–${s.end}`)).toEqual([
      'Comercial 08:00–17:00',
      'Flexível 10:00–19:00',
      'Tarde 14:00–22:00',
      'Noturna 22:00–06:00',
    ]);
    expect(data.holidays).toHaveLength(10);
    expect(data.holidays.every((h) => h.date.startsWith('2026-'))).toBe(true);
  });

  it('têm 25 pedidos cobrindo todos os status', () => {
    expect(data.requests).toHaveLength(25);
    expect(new Set(data.requests.map((r) => r.status))).toEqual(
      new Set(EXTENSION_REQUEST_STATUSES),
    );
  });

  it('não repetem ids nem e-mails, e as referências existem', () => {
    const employees = ids(data.employees);
    const groups = ids(data.groups);
    expect(employees.size).toBe(40);
    expect(new Set(data.employees.map((e) => e.email)).size).toBe(40);
    expect(data.employees.every((e) => groups.has(e.groupId))).toBe(true);
    expect(data.groups.flatMap((g) => g.approverIds).every((id) => employees.has(id))).toBe(true);
    expect(data.schedules.flatMap((s) => s.assignment.groupIds).every((id) => groups.has(id))).toBe(
      true,
    );
    expect(data.requests.every((r) => employees.has(r.employeeId))).toBe(true);
    expect(data.exceptions.every((e) => employees.has(e.employeeId))).toBe(true);
    expect(data.events.every((e) => !e.actorId || employees.has(e.actorId))).toBe(true);
  });

  it('cada colaborador tem uma regra só; a diretora de operações fica sem regra', () => {
    for (const employee of data.employees) {
      const rules = data.schedules.filter((s) => appliesTo(s, employee));
      expect(rules.length, employee.name).toBe(employee.id === CURRENT_USER_ID ? 0 : 1);
    }
  });

  it('as decisões seguem a regra: o RH só entra onde a regra pede', () => {
    for (const request of data.requests) {
      const employee = data.employees.find((e) => e.id === request.employeeId)!;
      const schedule = data.schedules.find((s) => appliesTo(s, employee))!;
      const steps = request.decisions.map((d) => d.step);
      if (request.status === 'aguardando_rh') expect(schedule.requiresHrValidation).toBe(true);
      if (request.status === 'aprovado') {
        expect(steps).toEqual(schedule.requiresHrValidation ? ['gestor', 'rh'] : ['gestor']);
      }
      if (request.status === 'recusado') expect(request.decisions.at(-1)?.reason).toBeTruthy();
    }
  });

  it('têm um pedido aguardando o gestor que passa do limite de 2 h extras', () => {
    const overtime = (r: ExtensionRequest) => toMinutes(r.requestedEnd) - toMinutes(r.currentEnd);
    const over = data.requests.filter((r) => r.status === 'aguardando_gestor' && overtime(r) > 120);
    expect(over.map((r) => r.id)).toContain('ped-02');
  });

  describe('pedido que quebra a interjornada se for aprovado (ped-04)', () => {
    const request = data.requests.find((r) => r.id === 'ped-04')!;
    const exception = data.exceptions.find((e) => e.id === 'exc-01')!;
    const employee = data.employees.find((e) => e.id === request.employeeId)!;
    const schedule = data.schedules.find((s) => appliesTo(s, employee))!;
    const evaluateAt = (time: string, extensions: ExtensionRequest[]) =>
      evaluateWorkstation({
        schedule,
        exceptions: [exception],
        holidays: data.holidays,
        extensions,
        at: toInstant(exception.date, toMinutes(time)),
      });

    it('é da regra Tarde, até 23h30, com entrada às 10h no dia seguinte', () => {
      expect(request.status).toBe('aguardando_gestor');
      expect(schedule.name).toBe('Tarde');
      expect(request.requestedEnd).toBe('23:30');
      expect(exception).toMatchObject({ employeeId: employee.id, kind: 'horario', start: '10:00' });
    });

    it('enquanto aguarda, a estação libera às 10h do dia seguinte', () => {
      expect(evaluateAt('10:00', [request]).state).toBe('em_jornada');
    });

    it('aprovado, a estação só libera às 10h30 (11 h depois das 23h30)', () => {
      const approved = { ...request, status: 'aprovado' as const };
      expect(evaluateAt('10:00', [approved])).toEqual({
        state: 'bloqueada',
        reason: 'Bloqueada: descanso de 11 h entre jornadas. Libera às 10h30.',
      });
      expect(evaluateAt('10:30', [approved]).state).toBe('em_jornada');
    });
  });

  // As datas são relativas a "agora": a demo e o CI precisam de pedidos em aberto em qualquer dia.
  describe.each([
    ['quinta de manhã', '2026-11-12T10:00:00-03:00'],
    ['sexta à noite', '2026-11-13T21:30:00-03:00'],
    ['sábado', '2026-11-14T12:00:00-03:00'],
    ['domingo antes do feriado de Finados', '2026-11-01T23:50:00-03:00'],
    ['véspera de Ano-Novo', '2026-12-31T23:00:00-03:00'],
  ])('criadas na %s', (_, instant) => {
    const now = Date.parse(instant);
    const fixtures = createFixtures(new Date(now));
    const open = (r: ExtensionRequest) =>
      r.status === 'aguardando_gestor' || r.status === 'aguardando_rh';

    it('pedidos em aberto vencem mais de 2 h depois de agora', () => {
      const pending = fixtures.requests.filter(open);
      expect(pending).toHaveLength(12);
      for (const r of pending)
        expect(Date.parse(r.expiresAt), r.id).toBeGreaterThan(now + 2 * 3600_000);
    });

    it('pedidos fechados sem decisão já venceram', () => {
      for (const r of fixtures.requests.filter((r) => r.status === 'expirado')) {
        expect(Date.parse(r.expiresAt), r.id).toBeLessThan(now);
      }
    });

    it('nada acontece no futuro: criação, decisões e histórico são até agora', () => {
      for (const r of fixtures.requests) {
        expect(Date.parse(r.createdAt), r.id).toBeLessThanOrEqual(now);
        for (const d of r.decisions) {
          expect(Date.parse(d.at), r.id).toBeGreaterThan(Date.parse(r.createdAt));
          expect(Date.parse(d.at), r.id).toBeLessThanOrEqual(now);
        }
      }
      for (const e of fixtures.events) expect(Date.parse(e.at), e.id).toBeLessThanOrEqual(now);
    });

    it('todo pedido cai num dia de jornada do colaborador', () => {
      for (const r of fixtures.requests) {
        const employee = fixtures.employees.find((e) => e.id === r.employeeId)!;
        const schedule = fixtures.schedules.find((s) => appliesTo(s, employee))!;
        const status = evaluateWorkstation({
          schedule,
          exceptions: [],
          holidays: fixtures.holidays,
          extensions: [],
          at: toInstant(r.date, toMinutes(schedule.start)),
        });
        expect(status.state, r.id).toBe('em_jornada');
      }
    });
  });
});
