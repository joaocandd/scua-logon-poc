import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { newScheduleDraft, toDraft, toSchedule } from './schedule-draft';

const byId = (id: string) => WORK_SCHEDULES.find((s) => s.id === id)!;

describe('newScheduleDraft', () => {
  it('começa em seg a sex, das 8h às 17h, com almoço e avisos 15 e 5 min antes', () => {
    const draft = newScheduleDraft();
    expect(toSchedule(draft)).toEqual({
      id: '',
      name: '',
      weekdays: [1, 2, 3, 4, 5],
      start: '08:00',
      end: '17:00',
      breaks: [{ label: 'Almoço', start: '12:00', end: '13:00' }],
      warningMinutes: [15, 5],
      requiresHrValidation: false,
      observationMode: false,
      assignment: { groupIds: [], excludedEmployeeIds: [] },
    });
    expect(draft.overnight).toBe(false);
  });
});

describe('toDraft e toSchedule', () => {
  it.each(WORK_SCHEDULES.map((s) => [s.name, s]))('a regra %s volta igual', (_, schedule) => {
    expect(toSchedule(toDraft(schedule), schedule.id)).toEqual(schedule);
  });

  it('marca "atravessa a meia-noite" quando o fim vem antes do início', () => {
    expect(toDraft(byId('regra-noturna')).overnight).toBe(true);
    expect(toDraft(byId('regra-comercial')).overnight).toBe(false);
  });

  it('uma caixa por dia, na posição do Weekday (0 é domingo)', () => {
    expect(toDraft(byId('regra-tarde')).days).toEqual([false, true, true, true, true, true, true]);
  });

  it('editar o rascunho não altera a regra salva', () => {
    const schedule = structuredClone(byId('regra-comercial'));
    const draft = toDraft(schedule);
    draft.breaks[0].start = '11:00';
    draft.assignment.groupIds.push('grp-ti');
    expect(schedule.breaks[0].start).toBe('12:00');
    expect(schedule.assignment.groupIds).toEqual(['grp-comercial', 'grp-financeiro']);
  });

  it('salva os dias na ordem da semana, com domingo por último', () => {
    const draft = { ...newScheduleDraft(), days: [true, false, false, false, false, false, true] };
    expect(toSchedule(draft).weekdays).toEqual([6, 0]);
  });

  it('tira os espaços do nome e dá nome ao intervalo sem nome', () => {
    const draft = {
      ...newScheduleDraft(),
      name: '  Plantão  ',
      breaks: [{ label: ' ', start: '12:00', end: '13:00' }],
    };
    const schedule = toSchedule(draft);
    expect(schedule.name).toBe('Plantão');
    expect(schedule.breaks[0].label).toBe('Intervalo');
  });
});
