import { formatClock, formatRange, MINUTES_PER_DAY, toMinutes } from './time';

describe('toMinutes', () => {
  it('converte HH:mm em minutos desde a meia-noite', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('aceita 24:00 como fim do dia', () => {
    expect(toMinutes('24:00')).toBe(MINUTES_PER_DAY);
  });

  it.each(['8:30', '08h30', '24:01', '25:00', '12:60', ''])('recusa "%s"', (time) => {
    expect(() => toMinutes(time)).toThrow('Horário inválido');
  });
});

describe('formatClock', () => {
  it('omite os minutos na hora cheia', () => {
    expect(formatClock(0)).toBe('0h');
    expect(formatClock(480)).toBe('8h');
    expect(formatClock(MINUTES_PER_DAY)).toBe('24h');
  });

  it('mostra os minutos com dois dígitos', () => {
    expect(formatClock(1170)).toBe('19h30');
    expect(formatClock(545)).toBe('9h05');
  });
});

describe('formatRange', () => {
  it('usa o plural na maioria das horas', () => {
    expect(formatRange(480, 720)).toBe('das 8h às 12h');
    expect(formatRange(1020, MINUTES_PER_DAY)).toBe('das 17h às 24h');
  });

  it('usa o singular para 0h e 1h', () => {
    expect(formatRange(0, 480)).toBe('da 0h às 8h');
    expect(formatRange(1320, 90)).toBe('das 22h à 1h30');
  });
});
