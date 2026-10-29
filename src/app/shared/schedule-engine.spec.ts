import { ExtensionRequest, Holiday, ScheduleException, WorkSchedule } from './models';
import { appliesTo, evaluateWorkstation, WorkstationInput } from './schedule-engine';

// Datas de referência (novembro de 2026): 02 é segunda (Finados), 11 é quarta, 12 é quinta,
// 13 é sexta e 14 é sábado. Os instantes estão no horário de São Paulo (-03:00).

function schedule(overrides: Partial<WorkSchedule>): WorkSchedule {
  return {
    id: 'regra',
    name: 'Regra',
    weekdays: [1, 2, 3, 4, 5],
    start: '08:00',
    end: '17:00',
    breaks: [],
    warningMinutes: [15, 5],
    requiresHrValidation: false,
    observationMode: false,
    assignment: { groupIds: [], excludedEmployeeIds: [] },
    ...overrides,
  };
}

const COMERCIAL = schedule({
  name: 'Comercial',
  breaks: [{ label: 'Almoço', start: '12:00', end: '13:00' }],
});
const TARDE = schedule({
  name: 'Tarde',
  weekdays: [1, 2, 3, 4, 5, 6],
  start: '14:00',
  end: '22:00',
  breaks: [{ label: 'Pausa', start: '18:00', end: '19:00' }],
});
const NOTURNA = schedule({
  name: 'Noturna',
  start: '22:00',
  end: '06:00',
  breaks: [{ label: 'Pausa', start: '02:00', end: '03:00' }],
});

const HOLIDAYS: Holiday[] = [{ date: '2026-11-02', name: 'Finados' }];

function extension(
  date: string,
  currentEnd: string,
  requestedEnd: string,
  status: ExtensionRequest['status'] = 'aprovado',
): ExtensionRequest {
  return {
    id: `ped-${date}-${requestedEnd}`,
    employeeId: 'col-01',
    date,
    currentEnd,
    requestedEnd,
    reason: 'Fechamento do mês',
    status,
    createdAt: `${date}T15:00:00-03:00`,
    expiresAt: `${date}T${requestedEnd}:00-03:00`,
    decisions: [],
  };
}

function evaluate(at: string, input: Partial<WorkstationInput> = {}) {
  return evaluateWorkstation({
    schedule: COMERCIAL,
    exceptions: [],
    holidays: HOLIDAYS,
    extensions: [],
    at,
    ...input,
  });
}

describe('evaluateWorkstation', () => {
  it('antes do início: bloqueada', () => {
    expect(evaluate('2026-11-12T07:59:00-03:00')).toEqual({
      state: 'bloqueada',
      reason: 'Bloqueada: fora da jornada Comercial (das 8h às 17h).',
    });
  });

  it('durante a jornada: liberada', () => {
    expect(evaluate('2026-11-12T08:00:00-03:00')).toEqual({
      state: 'em_jornada',
      reason: 'Liberada: jornada Comercial (das 8h às 17h).',
    });
    expect(evaluate('2026-11-12T16:59:00-03:00').state).toBe('em_jornada');
  });

  it('no intervalo: bloqueada até o fim do intervalo', () => {
    expect(evaluate('2026-11-12T12:30:00-03:00')).toEqual({
      state: 'intervalo',
      reason: 'Bloqueada: intervalo da jornada Comercial (das 12h às 13h).',
    });
    expect(evaluate('2026-11-12T13:00:00-03:00').state).toBe('em_jornada');
  });

  it('depois do fim: bloqueada', () => {
    expect(evaluate('2026-11-12T17:00:00-03:00')).toEqual({
      state: 'bloqueada',
      reason: 'Bloqueada: fora da jornada Comercial (das 8h às 17h).',
    });
  });

  describe('extensão aprovada', () => {
    const extensions = [extension('2026-11-12', '17:00', '18:30')];

    it('libera do fim da jornada até o novo fim', () => {
      expect(evaluate('2026-11-12T17:00:00-03:00', { extensions })).toEqual({
        state: 'he_aprovada',
        reason: 'Liberada: hora extra aprovada até 18h30.',
      });
      expect(evaluate('2026-11-12T18:30:00-03:00', { extensions }).state).toBe('bloqueada');
    });

    it('só conta pedido aprovado', () => {
      for (const status of ['aguardando_gestor', 'aguardando_rh', 'recusado'] as const) {
        const pending = [extension('2026-11-12', '17:00', '18:30', status)];
        expect(evaluate('2026-11-12T18:00:00-03:00', { extensions: pending }).state).toBe(
          'bloqueada',
        );
      }
    });

    it('com dois pedidos aprovados no mesmo dia, vale o maior fim', () => {
      const two = [
        extension('2026-11-12', '17:00', '18:30'),
        extension('2026-11-12', '17:00', '18:00'),
      ];
      expect(evaluate('2026-11-12T18:15:00-03:00', { extensions: two }).reason).toBe(
        'Liberada: hora extra aprovada até 18h30.',
      );
    });

    it('pedido de outro dia não libera', () => {
      expect(evaluate('2026-11-13T18:00:00-03:00', { extensions }).state).toBe('bloqueada');
    });
  });

  it('feriado: fora do expediente', () => {
    expect(evaluate('2026-11-02T10:00:00-03:00')).toEqual({
      state: 'fora_expediente',
      reason: 'Fora do expediente: feriado (Finados).',
    });
  });

  it('dia da semana fora da regra: fora do expediente', () => {
    expect(evaluate('2026-11-14T10:00:00-03:00')).toEqual({
      state: 'fora_expediente',
      reason: 'Fora do expediente: dia sem jornada Comercial.',
    });
  });

  describe('exceção', () => {
    it('folga bloqueia o dia todo', () => {
      const exceptions: ScheduleException[] = [
        {
          id: 'exc',
          employeeId: 'col-01',
          date: '2026-11-12',
          kind: 'folga',
          reason: 'Doação de sangue',
        },
      ];
      expect(evaluate('2026-11-12T10:00:00-03:00', { exceptions })).toEqual({
        state: 'fora_expediente',
        reason: 'Fora do expediente: folga (Doação de sangue).',
      });
    });

    it('horário alternativo substitui a jornada da regra', () => {
      const exceptions: ScheduleException[] = [
        {
          id: 'exc',
          employeeId: 'col-01',
          date: '2026-11-12',
          kind: 'horario',
          start: '10:00',
          end: '19:00',
          breaks: [],
          reason: 'Inventário',
        },
      ];
      expect(evaluate('2026-11-12T09:00:00-03:00', { exceptions })).toEqual({
        state: 'bloqueada',
        reason: 'Bloqueada: fora da jornada especial (das 10h às 19h).',
      });
      expect(evaluate('2026-11-12T18:00:00-03:00', { exceptions })).toEqual({
        state: 'em_jornada',
        reason: 'Liberada: jornada especial (das 10h às 19h).',
      });
    });

    it('vale mais que o feriado (plantão)', () => {
      const exceptions: ScheduleException[] = [
        {
          id: 'exc',
          employeeId: 'col-01',
          date: '2026-11-02',
          kind: 'horario',
          start: '08:00',
          end: '12:00',
          breaks: [],
          reason: 'Plantão',
        },
      ];
      expect(evaluate('2026-11-02T10:00:00-03:00', { exceptions }).state).toBe('em_jornada');
    });
  });

  describe('jornada que atravessa a meia-noite (22h–6h)', () => {
    const noturna = (at: string, input: Partial<WorkstationInput> = {}) =>
      evaluate(at, { schedule: NOTURNA, ...input });

    it('a jornada começa às 22h e continua depois da meia-noite', () => {
      expect(noturna('2026-11-12T23:00:00-03:00')).toEqual({
        state: 'em_jornada',
        reason: 'Liberada: jornada Noturna (das 22h às 6h).',
      });
      expect(noturna('2026-11-13T05:59:00-03:00').state).toBe('em_jornada');
    });

    it('o intervalo da madrugada bloqueia', () => {
      expect(noturna('2026-11-13T02:30:00-03:00')).toEqual({
        state: 'intervalo',
        reason: 'Bloqueada: intervalo da jornada Noturna (das 2h às 3h).',
      });
    });

    it('bloqueia às 6h, até a próxima jornada', () => {
      expect(noturna('2026-11-13T06:00:00-03:00')).toEqual({
        state: 'bloqueada',
        reason: 'Bloqueada: fora da jornada Noturna (das 22h às 6h).',
      });
    });

    it('a jornada de sexta entra pelo sábado, que não tem jornada própria', () => {
      expect(noturna('2026-11-14T03:00:00-03:00').state).toBe('em_jornada');
      expect(noturna('2026-11-14T23:00:00-03:00')).toEqual({
        state: 'fora_expediente',
        reason: 'Fora do expediente: dia sem jornada Noturna.',
      });
    });

    it('hora extra depois das 6h fica no pedido do dia em que a jornada começou', () => {
      const extensions = [extension('2026-11-12', '06:00', '07:30')];
      expect(noturna('2026-11-13T07:00:00-03:00', { extensions })).toEqual({
        state: 'he_aprovada',
        reason: 'Liberada: hora extra aprovada até 7h30.',
      });
    });
  });

  describe('interjornada de 11 h', () => {
    // Colaborador da Tarde (14h–22h) com hora extra aprovada até 23h30 na quarta e entrada
    // às 10h na quinta, por exceção. 23h30 + 11 h = 10h30: a quinta só libera às 10h30.
    const exceptions: ScheduleException[] = [
      {
        id: 'exc',
        employeeId: 'col-01',
        date: '2026-11-12',
        kind: 'horario',
        start: '10:00',
        end: '18:00',
        breaks: [{ label: 'Almoço', start: '13:00', end: '14:00' }],
        reason: 'Treinamento da nova central',
      },
    ];
    const tarde = (at: string, extensions: ExtensionRequest[]) =>
      evaluate(at, { schedule: TARDE, exceptions, extensions });

    it('bloqueia o começo da jornada seguinte até completar 11 h de descanso', () => {
      const approved = [extension('2026-11-11', '22:00', '23:30')];
      expect(tarde('2026-11-11T23:00:00-03:00', approved).state).toBe('he_aprovada');
      expect(tarde('2026-11-12T10:15:00-03:00', approved)).toEqual({
        state: 'bloqueada',
        reason: 'Bloqueada: descanso de 11 h entre jornadas. Libera às 10h30.',
      });
      expect(tarde('2026-11-12T10:30:00-03:00', approved)).toEqual({
        state: 'em_jornada',
        reason: 'Liberada: jornada especial (das 10h às 18h).',
      });
    });

    it('enquanto o pedido não é aprovado, a jornada seguinte começa no horário', () => {
      const pending = [extension('2026-11-11', '22:00', '23:30', 'aguardando_gestor')];
      expect(tarde('2026-11-12T10:00:00-03:00', pending).state).toBe('em_jornada');
    });
  });

  describe('limite de 2 h extras por dia', () => {
    const extensions = [extension('2026-11-12', '17:00', '20:00')];

    it('a hora extra aprovada libera no máximo 2 h depois do fim', () => {
      expect(evaluate('2026-11-12T18:59:00-03:00', { extensions })).toEqual({
        state: 'he_aprovada',
        reason: 'Liberada: hora extra aprovada até 19h.',
      });
      expect(evaluate('2026-11-12T19:30:00-03:00', { extensions })).toEqual({
        state: 'bloqueada',
        reason: 'Bloqueada: limite de 2 h extras por dia (até 19h).',
      });
    });

    it('depois do fim pedido, volta ao motivo de sempre', () => {
      expect(evaluate('2026-11-12T20:00:00-03:00', { extensions }).reason).toBe(
        'Bloqueada: fora da jornada Comercial (das 8h às 17h).',
      );
    });
  });

  it('lê o instante no fuso de São Paulo, qualquer que seja o formato', () => {
    // 13h UTC = 10h em São Paulo; 10h30 UTC = 7h30.
    expect(evaluate('2026-11-12T13:00:00Z').state).toBe('em_jornada');
    expect(evaluate('2026-11-12T10:30:00Z').state).toBe('bloqueada');
    expect(
      evaluateWorkstation({ ...baseInput(), at: new Date('2026-11-12T13:00:00Z') }).state,
    ).toBe('em_jornada');
  });

  function baseInput(): WorkstationInput {
    return { schedule: COMERCIAL, exceptions: [], holidays: HOLIDAYS, extensions: [], at: 0 };
  }
});

describe('appliesTo', () => {
  const rule = schedule({
    assignment: { groupIds: ['grp-comercial'], excludedEmployeeIds: ['col-02'] },
  });
  const employee = (id: string, groupId: string) => ({
    id,
    groupId,
    name: 'Fulano',
    email: 'fulano@empresa.example',
    jobTitle: 'Analista',
  });

  it('vale para quem é dos grupos da regra, menos os excluídos', () => {
    expect(appliesTo(rule, employee('col-01', 'grp-comercial'))).toBe(true);
    expect(appliesTo(rule, employee('col-02', 'grp-comercial'))).toBe(false);
    expect(appliesTo(rule, employee('col-03', 'grp-ti'))).toBe(false);
  });
});
