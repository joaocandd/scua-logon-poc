import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { HOLIDAYS } from '../../../mocks/fixtures/holidays';
import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { ExtensionRequest, ScheduleException } from '../../../shared/models';
import { newScheduleDraft, ScheduleDraft, toDraft } from './schedule-draft';
import { simulate, SimulationContext, simulationSchedule } from './schedule-simulation';
import { checkHours } from './schedule-validation';

const joao = EMPLOYEES.find((e) => e.id === 'col-08')!;
const comercial = toDraft(WORK_SCHEDULES.find((s) => s.id === 'regra-comercial')!);

function context(draft: ScheduleDraft, extra: Partial<SimulationContext> = {}): SimulationContext {
  return {
    schedule: simulationSchedule(draft, checkHours(draft)),
    employees: [joao],
    exceptions: [],
    holidays: HOLIDAYS,
    extensions: [],
    ...extra,
  };
}

const at = (date: string, time: string) => ({ employeeId: 'col-08', date, time });

describe('simulate', () => {
  it('depois do fim da jornada, como no exemplo do prompt', () => {
    expect(simulate(context(comercial), at('2026-11-12', '18:10'))).toEqual({
      state: 'bloqueada',
      sentence:
        'Às 18h10 de qui, 12/11, a estação de João estaria bloqueada: fora da jornada Comercial (das 8h às 17h).',
    });
  });

  it('em jornada e no almoço', () => {
    expect(simulate(context(comercial), at('2026-11-12', '10:00'))?.sentence).toBe(
      'Às 10h de qui, 12/11, a estação de João estaria liberada: jornada Comercial (das 8h às 17h).',
    );
    expect(simulate(context(comercial), at('2026-11-12', '12:30'))).toMatchObject({
      state: 'intervalo',
      sentence:
        'Às 12h30 de qui, 12/11, a estação de João estaria bloqueada: intervalo da jornada Comercial (das 12h às 13h).',
    });
  });

  it('usa a regra como está no editor, mesmo antes de salvar', () => {
    const later = { ...comercial, end: '19:00' };
    expect(simulate(context(later), at('2026-11-12', '18:10'))?.state).toBe('em_jornada');
  });

  it('feriado e fim de semana ficam fora do expediente', () => {
    expect(simulate(context(comercial), at('2026-11-20', '10:00'))?.sentence).toBe(
      'Às 10h de sex, 20/11, a estação de João estaria bloqueada: feriado (Dia Nacional de Zumbi e da Consciência Negra).',
    );
    expect(simulate(context(comercial), at('2026-11-14', '10:00'))?.state).toBe('fora_expediente');
  });

  it('a exceção e a hora extra aprovada do colaborador contam', () => {
    const dayOff: ScheduleException = {
      id: 'exc',
      employeeId: 'col-08',
      date: '2026-11-12',
      kind: 'folga',
      reason: 'Consulta',
    };
    expect(
      simulate(context(comercial, { exceptions: [dayOff] }), at('2026-11-12', '10:00'))?.sentence,
    ).toBe('Às 10h de qui, 12/11, a estação de João estaria bloqueada: folga (Consulta).');

    const extension = {
      employeeId: 'col-08',
      date: '2026-11-12',
      requestedEnd: '19:00',
      status: 'aprovado',
    } as ExtensionRequest;
    expect(
      simulate(context(comercial, { extensions: [extension] }), at('2026-11-12', '18:10')),
    ).toMatchObject({ state: 'he_aprovada' });
  });

  it('meia-noite pede singular', () => {
    const night = toDraft(WORK_SCHEDULES.find((s) => s.id === 'regra-noturna')!);
    expect(simulate(context(night), at('2026-11-12', '00:30'))?.sentence).toMatch(
      /^À 0h30 de qui, 12\/11, a estação de João estaria liberada: jornada Noturna/,
    );
  });

  it('regra sem nome', () => {
    const unnamed = { ...newScheduleDraft(), name: '' };
    expect(simulate(context(unnamed), at('2026-11-12', '18:10'))?.sentence).toContain(
      'fora da jornada desta regra (das 8h às 17h).',
    );
  });

  it('sem resultado com horário errado, data incompleta ou pessoa fora da regra', () => {
    expect(simulate(context({ ...comercial, end: '' }), at('2026-11-12', '10:00'))).toBeNull();
    expect(simulate(context(comercial), at('', '10:00'))).toBeNull();
    expect(simulate(context(comercial), at('2026-11-12', ''))).toBeNull();
    expect(simulate(context(comercial, { employees: [] }), at('2026-11-12', '10:00'))).toBeNull();
  });

  it('o intervalo com problema não entra na simulação', () => {
    const outside = { ...comercial, breaks: [{ label: 'Almoço', start: '07:00', end: '08:00' }] };
    expect(simulate(context(outside), at('2026-11-12', '07:30'))?.sentence).toContain(
      'fora da jornada Comercial',
    );
  });
});
