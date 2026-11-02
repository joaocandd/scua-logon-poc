import { Break } from '../../../shared/models';
import { newScheduleDraft, ScheduleDraft } from './schedule-draft';
import { checkHours, daysError, nameError, ruleProblems } from './schedule-validation';

describe('nameError', () => {
  const others = ['Comercial', 'Flexível'];

  it.each(['', '   '])('pede um nome quando vem "%s"', (name) => {
    expect(nameError(name, others)).toBe('Dê um nome para a regra.');
  });

  it('não aceita o nome de outra regra, sem diferenciar acento e maiúscula', () => {
    expect(nameError('flexivel ', others)).toBe(
      'Já existe uma regra chamada Flexível. Escolha outro nome.',
    );
  });

  it('aceita um nome novo', () => {
    expect(nameError('Plantão', others)).toBeNull();
  });
});

describe('daysError', () => {
  it('pede ao menos um dia', () => {
    expect(daysError([false, false, false, false, false, false, false])).toBe(
      'Escolha ao menos um dia da semana.',
    );
    expect(daysError([false, false, false, false, false, false, true])).toBeNull();
  });
});

/** Regra nova (8h às 17h, almoço das 12h às 13h) com os horários trocados. */
function draft(hours: Partial<ScheduleDraft>): ScheduleDraft {
  return { ...newScheduleDraft(), ...hours };
}

const lunch = (start: string, end: string, label = 'Almoço'): Break => ({ label, start, end });

const messages = (hours: Partial<ScheduleDraft>) =>
  ruleProblems(draft(hours)).map((p) => p.message);

describe('ruleProblems: jornada', () => {
  it('a regra nova não tem problema', () => {
    expect(messages({})).toEqual([]);
  });

  it('fim antes do início sem atravessar a meia-noite', () => {
    expect(ruleProblems(draft({ end: '07:00' }))).toEqual([
      {
        message:
          'O fim (7h) vem antes do início (8h). Corrija o fim ou marque “Atravessa a meia-noite”.',
        target: { field: 'end' },
      },
    ]);
  });

  it('atravessa a meia-noite: das 22h às 6h, com pausa às 2h', () => {
    expect(
      messages({
        start: '22:00',
        end: '06:00',
        overnight: true,
        breaks: [lunch('02:00', '03:00')],
      }),
    ).toEqual([]);
  });

  it('marcou a meia-noite, mas o fim vem depois do início', () => {
    expect(messages({ overnight: true })).toEqual([
      'Das 8h às 17h, a jornada não atravessa a meia-noite. Desmarque “Atravessa a meia-noite” ou corrija o fim.',
    ]);
  });

  it('fim igual ao início', () => {
    expect(messages({ end: '08:00' })).toEqual([
      'O fim é igual ao início (8h). Corrija um dos dois.',
    ]);
  });

  it('com o horário vazio ou pela metade, espera a pessoa terminar', () => {
    expect(messages({ end: '' })).toEqual([]);
    expect(messages({ breaks: [lunch('12:00', '')] })).toEqual([
      'Com 9h de trabalho, a jornada precisa de um intervalo de pelo menos 1 h (CLT art. 71). Adicione um intervalo.',
    ]);
  });
});

describe('ruleProblems: intervalos', () => {
  it('intervalo antes do início da jornada', () => {
    expect(ruleProblems(draft({ breaks: [lunch('07:00', '08:00')] }))[0]).toEqual({
      message: 'Almoço (7h–8h) precisa ficar dentro da jornada (8h–17h).',
      target: { field: 'breakStart', index: 0 },
    });
  });

  it('intervalo que passa do fim da jornada', () => {
    expect(messages({ breaks: [lunch('16:30', '17:30')] })[0]).toBe(
      'Almoço (16h30–17h30) precisa ficar dentro da jornada (8h–17h).',
    );
  });

  it('intervalo que começa junto com a jornada fica fora dela', () => {
    expect(messages({ breaks: [lunch('08:00', '09:00')] })[0]).toBe(
      'Almoço (8h–9h) precisa ficar dentro da jornada (8h–17h).',
    );
  });

  it('intervalo que termina antes de começar', () => {
    expect(ruleProblems(draft({ breaks: [lunch('13:00', '12:00')] }))[0]).toEqual({
      message: 'Almoço termina (12h) antes de começar (13h).',
      target: { field: 'breakEnd', index: 0 },
    });
  });

  it('intervalo sem nome é chamado pela posição', () => {
    expect(messages({ breaks: [lunch('12:00', '13:00'), lunch('18:00', '18:15', ' ')] })).toEqual([
      'Intervalo 2 (18h–18h15) precisa ficar dentro da jornada (8h–17h).',
    ]);
  });

  it('intervalos sobrepostos', () => {
    const breaks = [lunch('12:00', '13:00'), lunch('12:30', '12:45', 'Pausa')];
    expect(ruleProblems(draft({ breaks }))).toEqual([
      {
        message: 'Pausa (12h30–12h45) e Almoço (12h–13h) se sobrepõem. Ajuste um dos dois.',
        target: { field: 'breakStart', index: 1 },
      },
    ]);
  });

  it('intervalo dentro de jornada noturna, depois da meia-noite', () => {
    const night = { start: '22:00', end: '06:00', overnight: true };
    expect(messages({ ...night, breaks: [lunch('05:30', '06:30')] })[0]).toBe(
      'Almoço (5h30–6h30) precisa ficar dentro da jornada (22h–6h).',
    );
  });
});

describe('ruleProblems: intervalo mínimo (CLT art. 71)', () => {
  it('trabalho acima de 6 h sem intervalo', () => {
    expect(ruleProblems(draft({ breaks: [] }))).toEqual([
      {
        message:
          'Com 9h de trabalho, a jornada precisa de um intervalo de pelo menos 1 h (CLT art. 71). Adicione um intervalo.',
        target: { field: 'breaks' },
      },
    ]);
  });

  it('duas pausas de 30 min não fazem 1 h', () => {
    const breaks = [lunch('10:00', '10:30', 'Café'), lunch('15:00', '15:30', 'Lanche')];
    expect(ruleProblems(draft({ breaks }))).toEqual([
      {
        message:
          'Com 8h de trabalho, a jornada precisa de um intervalo de pelo menos 1 h (CLT art. 71). O maior intervalo tem 30 min.',
        target: { field: 'breakEnd', index: 0 },
      },
    ]);
  });

  it('o tempo de trabalho desconta os intervalos', () => {
    // Das 8h às 15h com 1 h de almoço: 6 h de trabalho, basta o intervalo de 15 min.
    expect(messages({ end: '15:00' })).toEqual([]);
    // Das 8h às 15h com 30 min: 6h30 de trabalho, precisa de 1 h.
    expect(messages({ end: '15:00', breaks: [lunch('12:00', '12:30')] })).toEqual([
      'Com 6h30 de trabalho, a jornada precisa de um intervalo de pelo menos 1 h (CLT art. 71). O maior intervalo tem 30 min.',
    ]);
  });

  it('trabalho entre 4 h e 6 h precisa de 15 min', () => {
    expect(messages({ end: '13:00', breaks: [] })).toEqual([
      'Com 5h de trabalho, a jornada precisa de um intervalo de pelo menos 15 min (CLT art. 71, §1º). Adicione um intervalo.',
    ]);
    expect(messages({ end: '13:00', breaks: [lunch('10:00', '10:15', 'Café')] })).toEqual([]);
  });

  it('até 4 h de trabalho não pede intervalo', () => {
    expect(messages({ end: '12:00', breaks: [] })).toEqual([]);
  });
});

describe('checkHours', () => {
  it('jornada noturna passa da meia-noite em minutos do dia em que começa', () => {
    const check = checkHours(
      draft({ start: '22:00', end: '06:00', overnight: true, breaks: [lunch('02:00', '03:00')] }),
    );
    expect(check.shift).toEqual({ start: 1320, end: 1800 });
    expect(check.breaks).toEqual([{ index: 0, label: 'Almoço', start: 1560, end: 1620 }]);
  });

  it('intervalo com problema fica fora da lista de intervalos certos', () => {
    const check = checkHours(draft({ breaks: [lunch('12:00', '13:00'), lunch('12:30', '13:30')] }));
    expect(check.breaks.map((b) => b.index)).toEqual([0]);
  });
});
