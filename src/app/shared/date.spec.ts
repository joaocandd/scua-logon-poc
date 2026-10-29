import { addDays, toInstant, toLocal, weekdayOf } from './date';

describe('toLocal', () => {
  it('lê o instante no relógio de São Paulo (UTC-3)', () => {
    expect(toLocal('2026-11-12T21:30:00Z')).toEqual({ date: '2026-11-12', minutes: 18 * 60 + 30 });
    expect(toLocal('2026-11-12T18:30:00-03:00')).toEqual({ date: '2026-11-12', minutes: 1110 });
  });

  it('muda de dia na meia-noite de São Paulo, não na de UTC', () => {
    expect(toLocal('2026-11-13T02:00:00Z')).toEqual({ date: '2026-11-12', minutes: 23 * 60 });
    expect(toLocal('2026-11-13T03:00:00Z')).toEqual({ date: '2026-11-13', minutes: 0 });
  });

  it('aceita Date e milissegundos', () => {
    const instant = Date.parse('2026-11-12T13:00:00Z');
    expect(toLocal(instant)).toEqual({ date: '2026-11-12', minutes: 600 });
    expect(toLocal(new Date(instant))).toEqual({ date: '2026-11-12', minutes: 600 });
  });
});

describe('toInstant', () => {
  it('converte data e hora de São Paulo em instante UTC', () => {
    expect(toInstant('2026-11-12', 17 * 60)).toBe('2026-11-12T20:00:00.000Z');
  });

  it('minutos além de 24 h caem no dia seguinte', () => {
    expect(toInstant('2026-11-12', 24 * 60 + 6 * 60)).toBe('2026-11-13T09:00:00.000Z');
  });

  it('é o inverso de toLocal', () => {
    expect(toLocal(toInstant('2026-02-17', 22 * 60 + 15))).toEqual({
      date: '2026-02-17',
      minutes: 22 * 60 + 15,
    });
  });
});

describe('addDays', () => {
  it('soma e subtrai dias, virando mês e ano', () => {
    expect(addDays('2026-11-12', 3)).toBe('2026-11-15');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('weekdayOf', () => {
  it('0 é domingo e 6 é sábado', () => {
    expect(weekdayOf('2026-11-15')).toBe(0);
    expect(weekdayOf('2026-11-12')).toBe(4);
    expect(weekdayOf('2026-11-14')).toBe(6);
  });
});
