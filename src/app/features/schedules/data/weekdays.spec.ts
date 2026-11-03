import { formatWeekdays } from './weekdays';

describe('formatWeekdays', () => {
  it.each([
    [[1, 2, 3, 4, 5], 'Seg a sex'],
    [[1, 2, 3, 4, 5, 6], 'Seg a sáb'],
    [[1, 3, 5], 'Seg, qua e sex'],
    [[6, 0], 'Sáb e dom'],
    [[1, 2], 'Seg e ter'],
    [[1, 2, 3, 5], 'Seg a qua e sex'],
    [[5, 6, 0], 'Sex a dom'],
    [[3], 'Qua'],
    [[0, 1, 2, 3, 4, 5, 6], 'Todos os dias'],
    [[], 'Nenhum dia'],
  ] as const)('%j → "%s"', (weekdays, text) => {
    expect(formatWeekdays(weekdays)).toBe(text);
  });

  it('não depende da ordem em que os dias vêm', () => {
    expect(formatWeekdays([5, 1, 3, 2, 4])).toBe('Seg a sex');
  });
});
