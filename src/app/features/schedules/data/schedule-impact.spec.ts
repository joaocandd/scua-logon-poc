import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { WorkSchedule } from '../../../shared/models';
import { ImpactInput, saveImpact } from './schedule-impact';

const comercial = WORK_SCHEDULES.find((s) => s.id === 'regra-comercial')!;
// Quinta, 12/11/2026. Sem feriado, exceção nem pedido nas entradas abaixo.
const at = (time: string) => Date.parse(`2026-11-12T${time}:00-03:00`);

function impact(
  before: WorkSchedule | null,
  after: WorkSchedule,
  now = at('10:00'),
): ReturnType<typeof saveImpact> {
  const input: ImpactInput = {
    before,
    after,
    employees: EMPLOYEES,
    exceptions: [],
    holidays: [],
    extensions: [],
    now,
  };
  return saveImpact(input);
}

describe('saveImpact', () => {
  it('nada mudou: não há o que salvar', () => {
    expect(impact(comercial, { ...comercial })).toBeNull();
  });

  it('lista o que muda, na ordem das seções', () => {
    const after: WorkSchedule = {
      ...comercial,
      end: '18:00',
      weekdays: [1, 2, 3, 4, 5, 6],
      breaks: [{ label: 'Almoço', start: '12:00', end: '13:30' }],
      warningMinutes: [30, 15, 5],
      requiresHrValidation: false,
    };
    expect(impact(comercial, after)).toEqual({
      title: 'Salvar a regra Comercial?',
      message: 'A mudança vale para 15 colaboradores assim que você salvar.',
      items: [
        'Dias: Seg a sex → Seg a sáb',
        'Horário: das 8h às 17h → das 8h às 18h',
        'Intervalos: Almoço (12h–13h) → Almoço (12h–13h30)',
        'Avisos: 15 e 5 min → 30, 15 e 5 min',
        'Aprovação: gestor e RH → só o gestor',
        'Agora mesmo, ninguém fica com a estação bloqueada por causa disso.',
      ],
      confirmLabel: 'Salvar regra',
    });
  });

  it('diz quem entra, quem sai e de quem a estação bloqueia agora', () => {
    // Às 16h30, o Comercial está em jornada; com fim às 16h, todos bloqueiam.
    const after: WorkSchedule = {
      ...comercial,
      end: '16:00',
      assignment: { groupIds: ['grp-comercial'], excludedEmployeeIds: [] },
    };
    const items = impact(comercial, after, at('16:30'))!.items;
    expect(items).toContain(
      'Saem da regra e ficam sem controle de jornada: Aline Cardoso, Diego Arantes, Gustavo Ramalho e mais 3 colaboradores.',
    );
    expect(items.at(-1)).toBe(
      'Agora mesmo, Ana Ribeiro, Beatriz Monteiro, Camila Vasconcelos e mais 6 colaboradores ficam com a estação bloqueada.',
    );
  });

  it('regra nova: quem não tinha regra estava com a estação livre', () => {
    const nova: WorkSchedule = {
      ...comercial,
      id: '',
      name: 'Diretoria',
      assignment: { groupIds: ['grp-operacoes'], excludedEmployeeIds: [] },
    };
    expect(impact(null, nova, at('19:00'))).toMatchObject({
      title: 'Criar a regra Diretoria?',
      message: 'A regra passa a valer para 7 colaboradores assim que você salvar.',
      confirmLabel: 'Criar regra',
    });
    expect(impact(null, nova, at('19:00'))!.items).toEqual([
      'Agora mesmo, Carlos Teixeira, Edson Pires, Fabiana Leal e mais 4 colaboradores ficam com a estação bloqueada.',
    ]);
  });

  it('em observação, nada bloqueia: só registra', () => {
    const observed = { ...comercial, end: '16:00', observationMode: true };
    expect(impact(comercial, observed, at('16:30'))).toMatchObject({
      message:
        'Por 7 dias, a regra não bloqueia ninguém: o Scua Logon só registra quem seria bloqueado. Depois disso, ela passa a bloquear 15 colaboradores.',
      confirmLabel: 'Salvar e observar',
    });
    expect(impact(comercial, observed, at('16:30'))!.items.at(-1)).toMatch(
      /^Agora mesmo, a regra bloquearia a estação de .+ e mais 12 colaboradores\. Na observação, isso só fica registrado\.$/,
    );
  });

  it('regra que já está em observação, e o fim da observação', () => {
    const observing = { ...comercial, observationMode: true, observationEndsOn: '2026-11-18' };
    expect(impact(observing, { ...observing, end: '18:00' })?.message).toBe(
      'A regra continua em observação até qua, 18/11: ela não bloqueia ninguém, o Scua Logon só registra quem seria bloqueado.',
    );
    expect(impact(observing, { ...comercial })?.message).toBe(
      'A observação termina agora: a regra passa a bloquear 15 colaboradores assim que você salvar.',
    );
  });

  it('regra que não vale para ninguém', () => {
    const nobody = { ...comercial, assignment: { groupIds: [], excludedEmployeeIds: [] } };
    const result = impact(null, nobody)!;
    expect(result.message).toBe('A regra ainda não vale para ninguém.');
    expect(result.items).toEqual([]);
  });
});
