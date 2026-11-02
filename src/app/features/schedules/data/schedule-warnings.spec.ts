import { newScheduleDraft, ScheduleDraft } from './schedule-draft';
import { checkHours } from './schedule-validation';
import { formatWarnings, warningPreview } from './schedule-warnings';

function preview(changes: Partial<ScheduleDraft>) {
  const draft = { ...newScheduleDraft(), name: 'Comercial', ...changes };
  return warningPreview(draft, checkHours(draft));
}

describe('formatWarnings', () => {
  it.each([
    [[15, 5], '15 e 5 min'],
    [[5, 30, 15], '30, 15 e 5 min'],
    [[10], '10 min'],
    [[], ''],
  ])('%j → "%s"', (minutes, text) => {
    expect(formatWarnings(minutes)).toBe(text);
  });
});

describe('warningPreview', () => {
  it('mostra o aviso do fim da jornada, com o maior tempo, em tom neutro', () => {
    expect(preview({})?.notice).toEqual({
      title: 'Sua estação bloqueia às 17h',
      body: 'Faltam 15 min para o fim da jornada Comercial. Salve o que estiver fazendo. Se precisar de mais tempo, peça uma extensão ao seu gestor.',
    });
  });

  it('diz quando cada aviso chega: antes de cada intervalo e do fim da jornada', () => {
    expect(preview({})?.times).toEqual([
      'Antes do intervalo Almoço (12h): às 11h45 e às 11h55.',
      'Antes do fim da jornada (17h): às 16h45 e às 16h55.',
    ]);
  });

  it('jornada que atravessa a meia-noite volta ao relógio', () => {
    const night = preview({
      start: '22:00',
      end: '06:00',
      overnight: true,
      breaks: [{ label: 'Pausa', start: '02:00', end: '03:00' }],
      warningMinutes: [30],
    });
    expect(night?.times).toEqual([
      'Antes do intervalo Pausa (2h): às 1h30.',
      'Antes do fim da jornada (6h): às 5h30.',
    ]);
  });

  it('não manda aviso antes de a jornada começar', () => {
    const early = preview({ breaks: [{ label: 'Café', start: '08:30', end: '08:45' }] });
    expect(early?.times[0]).toBe('Antes do intervalo Café (8h30): às 8h15 e às 8h25.');
    const tooEarly = preview({
      breaks: [{ label: 'Café', start: '08:30', end: '08:45' }],
      warningMinutes: [60],
    });
    expect(tooEarly?.times).toEqual(['Antes do fim da jornada (17h): às 16h.']);
  });

  it('sem nome, fala da "sua jornada"; sem aviso, não há prévia do aviso', () => {
    expect(preview({ name: ' ' })?.notice?.body).toContain('para o fim da sua jornada.');
    expect(preview({ warningMinutes: [] })).toEqual({ notice: null, times: [] });
  });

  it('sem início e fim certos, não há prévia', () => {
    expect(preview({ end: '' })).toBeNull();
  });
});
