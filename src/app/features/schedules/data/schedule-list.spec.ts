import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { GROUPS } from '../../../mocks/fixtures/groups';
import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { WorkSchedule } from '../../../shared/models';
import { scheduleRows } from './schedule-list';

const groupById = new Map(GROUPS.map((g) => [g.id, g]));

function rows(schedules: readonly WorkSchedule[] = WORK_SCHEDULES) {
  return scheduleRows(schedules, EMPLOYEES, groupById);
}

describe('scheduleRows', () => {
  it('ordena as regras pelo nome', () => {
    expect(rows().map((r) => r.name)).toEqual(['Comercial', 'Flexível', 'Noturna', 'Tarde']);
  });

  it('mostra horário, dias, grupos e status da regra', () => {
    expect(rows()[0]).toEqual({
      id: 'regra-comercial',
      name: 'Comercial',
      hours: 'Das 8h às 17h',
      days: 'Seg a sex',
      groups: ['Comercial', 'Financeiro'],
      employeeCount: 15,
      status: 'ativa',
    });
  });

  it('jornada que atravessa a meia-noite mostra o fim no dia seguinte', () => {
    const noturna = rows().find((r) => r.id === 'regra-noturna');
    expect(noturna?.hours).toBe('Das 22h às 6h');
  });

  it('conta os colaboradores dos grupos, menos os excluídos', () => {
    // Operações tem 7 pessoas; a diretora está excluída da Noturna.
    expect(rows().find((r) => r.id === 'regra-noturna')?.employeeCount).toBe(6);
    expect(rows().find((r) => r.id === 'regra-tarde')?.employeeCount).toBe(9);
  });

  it('regra em modo observação aparece "em observação"', () => {
    const observed = { ...WORK_SCHEDULES[0], observationMode: true };
    expect(rows([observed])[0].status).toBe('em_observacao');
  });

  it('regra sem grupo não controla ninguém', () => {
    const empty = { ...WORK_SCHEDULES[0], assignment: { groupIds: [], excludedEmployeeIds: [] } };
    expect(rows([empty])[0]).toMatchObject({ groups: [], employeeCount: 0 });
  });
});
