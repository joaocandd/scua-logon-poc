import { addDays, weekdayOf } from '../shared/date';
import { DailyGroupStats } from '../shared/models';
import { createFixtures } from './fixtures';
import { createEmployeeOvertime, createHistory, HISTORY_DAYS, seededRandom } from './history';

const NOW = new Date('2026-11-12T10:00:00-03:00'); // quinta-feira de manhã

function history(now = NOW, change?: (f: ReturnType<typeof createFixtures>) => void) {
  const fixtures = createFixtures(now);
  change?.(fixtures);
  return createHistory({ ...fixtures, now });
}

const sum = (rows: DailyGroupStats[], key: keyof DailyGroupStats) =>
  rows.reduce((total, row) => total + (row[key] as number), 0);

describe('série histórica fictícia', () => {
  it('uma linha por grupo e por dia, dos últimos 30 dias até hoje', () => {
    const rows = history();
    expect(rows).toHaveLength(HISTORY_DAYS * 6);
    expect(rows[0].date).toBe(addDays('2026-11-12', -29));
    expect(rows.at(-1)?.date).toBe('2026-11-12');
  });

  it('é determinística: o mesmo dia dá os mesmos números, abrindo o app em outra hora', () => {
    // Os mesmos dados (os pedidos das fixtures também andam com "agora"), em horas diferentes.
    const fixtures = createFixtures(NOW);
    const morning = createHistory({ ...fixtures, now: NOW });
    const evening = createHistory({ ...fixtures, now: new Date('2026-11-12T23:30:00-03:00') });
    const yesterday = (rows: DailyGroupStats[]) => rows.filter((r) => r.date === '2026-11-11');
    expect(yesterday(evening)).toEqual(yesterday(morning));
    expect(history()).toEqual(morning);
  });

  it('a janela anda com "agora"', () => {
    const tomorrow = history(new Date('2026-11-13T10:00:00-03:00'));
    expect(tomorrow[0].date).toBe(addDays('2026-11-13', -29));
    const same = (rows: DailyGroupStats[]) => rows.filter((r) => r.date === '2026-11-05');
    expect(same(tomorrow).map((r) => r.blockedMinutes)).toEqual(
      same(history()).map((r) => r.blockedMinutes),
    );
  });

  it('domingo não tem jornada em nenhuma regra: tudo zero', () => {
    const sundays = history().filter((r) => weekdayOf(r.date) === 0);
    expect(sundays.length).toBeGreaterThan(0);
    expect(sum(sundays, 'scheduledCount') + sum(sundays, 'blockedMinutes')).toBe(0);
  });

  it('feriado não tem jornada (Finados, 02/11)', () => {
    const finados = history().filter((r) => r.date === '2026-11-02');
    expect(sum(finados, 'scheduledCount')).toBe(0);
  });

  it('hoje só conta as jornadas que já terminaram', () => {
    // Às 10h, nenhuma jornada de hoje terminou (a Noturna de ontem termina às 6h de hoje, mas é
    // do dia de ontem).
    const today = history().filter((r) => r.date === '2026-11-12');
    expect(sum(today, 'scheduledCount')).toBe(0);
    expect(sum(today, 'absentCount')).toBe(0);
  });

  it('tem números de verdade em dia útil: ausências, bloqueios e horas extras', () => {
    const rows = history();
    expect(sum(rows, 'absentCount')).toBeGreaterThan(0);
    expect(sum(rows, 'blockedMinutes')).toBeGreaterThan(0);
    expect(sum(rows, 'overtimeMinutes')).toBeGreaterThan(0);
    for (const row of rows) expect(row.absentCount).toBeLessThanOrEqual(row.scheduledCount);
  });

  it('sem regra, a estação não é controlada: a diretora (sem regra) não entra na base', () => {
    const operations = history().filter((r) => r.groupId === 'grp-operacoes');
    // Operações tem 7 pessoas; a diretora fica de fora da regra Noturna.
    expect(Math.max(...operations.map((r) => r.scheduledCount))).toBeLessThanOrEqual(6);
  });

  it('regra em observação não bloqueia: Operações (Noturna) sem minutos bloqueados', () => {
    const operations = history().filter((r) => r.groupId === 'grp-operacoes');
    expect(sum(operations, 'blockedMinutes')).toBe(0);
  });

  it('pedido aprovado conta nas horas extras do dia dele', () => {
    const date = '2026-11-10'; // terça
    const base = history(NOW, (f) => {
      f.requests = [];
    });
    const withRequest = history(NOW, (f) => {
      f.requests = [
        {
          id: 'ped-x',
          employeeId: 'col-08', // Comercial, 8h às 17h
          date,
          currentEnd: '17:00',
          requestedEnd: '18:30',
          reason: 'Teste',
          status: 'aprovado',
          createdAt: '2026-11-10T19:00:00Z',
          expiresAt: '2026-11-10T21:30:00Z',
          decisions: [],
        },
      ];
    });
    const day = (rows: DailyGroupStats[]) =>
      rows.find((r) => r.date === date && r.groupId === 'grp-comercial')!;
    // O sorteio de hora extra de quem tem pedido é trocado pelo pedido: a diferença é de até 90 min.
    expect(day(withRequest).overtimeMinutes).toBeGreaterThanOrEqual(90);
    expect(day(withRequest).overtimeMinutes - day(base).overtimeMinutes).toBeLessThanOrEqual(90);
  });
});

describe('seededRandom', () => {
  it('mesma semente, mesma sequência; entre 0 e 1', () => {
    const a = seededRandom('x');
    const b = seededRandom('x');
    const values = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(values);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(seededRandom('y')()).not.toBe(values[0]);
  });
});

describe('horas extras por colaborador', () => {
  it('somam, em cada grupo e dia, o mesmo que a série dos relatórios', () => {
    const fixtures = createFixtures(NOW);
    const groups = createHistory({ ...fixtures, now: NOW });
    const people = createEmployeeOvertime({ ...fixtures, now: NOW });
    const groupOf = new Map(fixtures.employees.map((e) => [e.id, e.groupId]));
    for (const row of groups) {
      const sumOfPeople = people
        .filter((p) => p.date === row.date && groupOf.get(p.employeeId) === row.groupId)
        .reduce((total, p) => total + p.overtimeMinutes, 0);
      expect(sumOfPeople).toBe(row.overtimeMinutes);
    }
    expect(people.length).toBeGreaterThan(0);
    expect(people.every((p) => p.overtimeMinutes > 0 && p.overtimeMinutes <= 120)).toBe(true);
  });
});
