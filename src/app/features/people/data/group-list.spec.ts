import { Employee, Group, WorkSchedule } from '../../../shared/models';
import { groupCards } from './group-list';

const person = (id: string, name: string, groupId: string) =>
  ({ id, name, email: '', jobTitle: '', groupId }) as Employee;

const GROUPS: Group[] = [
  { id: 'grp-ti', name: 'TI', approverIds: ['col-32', 'col-25'] },
  { id: 'grp-financeiro', name: 'Financeiro', approverIds: ['col-01'] },
];
const EMPLOYEES = [
  person('col-01', 'Paulo Siqueira', 'grp-financeiro'),
  person('col-25', 'Renata Albuquerque', 'grp-operacoes'),
  person('col-32', 'Thiago Moreira', 'grp-ti'),
  person('col-33', 'Natália Coelho', 'grp-ti'),
];
const SCHEDULES = [
  {
    id: 'regra-fechamento',
    name: 'Fechamento do mês',
    observationMode: true,
    assignment: { groupIds: ['grp-financeiro'], excludedEmployeeIds: [] },
  },
  {
    id: 'regra-comercial',
    name: 'Comercial',
    assignment: { groupIds: ['grp-financeiro'], excludedEmployeeIds: [] },
  },
] as unknown as WorkSchedule[];

describe('cartões dos grupos', () => {
  const cards = groupCards(GROUPS, EMPLOYEES, SCHEDULES);

  it('em ordem alfabética, com gestor, aprovadores e quantos colaboradores', () => {
    expect(cards.map((c) => c.name)).toEqual(['Financeiro', 'TI']);
    expect(cards[1]).toMatchObject({
      manager: { id: 'col-32', name: 'Thiago Moreira' },
      approvers: [{ id: 'col-25', name: 'Renata Albuquerque' }],
      employeeCount: 2,
      schedules: [],
    });
  });

  it('a regra ativa vem antes da que está em observação', () => {
    expect(cards[0].approvers).toEqual([]);
    expect(cards[0].schedules).toEqual([
      { id: 'regra-comercial', name: 'Comercial', observation: false },
      { id: 'regra-fechamento', name: 'Fechamento do mês', observation: true },
    ]);
  });
});
