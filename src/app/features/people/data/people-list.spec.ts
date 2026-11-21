import { Employee, Group, WorkSchedule, WorkstationDetail } from '../../../shared/models';
import {
  countLabel,
  filterPeople,
  hoursLabel,
  initialsOf,
  parseOrder,
  PeopleFilters,
  personRows,
} from './people-list';

const person = (id: string, name: string, groupId: string, registration: string): Employee => ({
  id,
  name,
  email: '',
  jobTitle: 'Analista',
  groupId,
  registration,
});

const EMPLOYEES = [
  person('col-08', 'João Pedro Antunes', 'grp-comercial', '20296'),
  person('col-27', 'Edson Pires', 'grp-operacoes', '20999'),
  person('col-25', 'Renata Albuquerque', 'grp-operacoes', '20925'),
];
const groupById = new Map<string, Group>([
  ['grp-comercial', { id: 'grp-comercial', name: 'Comercial', approverIds: [] }],
  ['grp-operacoes', { id: 'grp-operacoes', name: 'Operações', approverIds: [] }],
]);
const assignment = (groupIds: string[], excludedEmployeeIds: string[] = []) => ({
  groupIds,
  excludedEmployeeIds,
});
const SCHEDULES = [
  { id: 'regra-comercial', name: 'Comercial', assignment: assignment(['grp-comercial']) },
  {
    id: 'regra-noturna',
    name: 'Noturna',
    observationMode: true,
    assignment: assignment(['grp-operacoes'], ['col-25']),
  },
] as WorkSchedule[];
const STATIONS: WorkstationDetail[] = [
  {
    employeeId: 'col-08',
    state: 'bloqueada',
    reason: 'Bloqueada: fora da jornada Comercial (das 8h às 17h).',
    hostname: 'COM-NB-008',
    scheduleId: 'regra-comercial',
  },
  {
    employeeId: 'col-27',
    state: 'fora_expediente',
    reason: 'Fora do expediente: dia sem jornada Noturna.',
    observed: true,
    hostname: 'OPS-PC-027',
    scheduleId: 'regra-noturna',
  },
];
const OVERTIME = [
  { date: '2026-11-02', employeeId: 'col-08', overtimeMinutes: 60 },
  { date: '2026-11-03', employeeId: 'col-08', overtimeMinutes: 90 },
];

const rows = personRows({
  employees: EMPLOYEES,
  groupById,
  schedules: SCHEDULES,
  workstations: STATIONS,
  overtime: OVERTIME,
});
const NO_FILTERS: PeopleFilters = {
  search: '',
  groupId: null,
  scheduleId: null,
  state: null,
  order: 'asc',
};
const names = (list: { name: string }[]) => list.map((r) => r.name);

describe('lista de colaboradores', () => {
  it('uma linha por colaborador, em ordem alfabética, com a estação e as horas extras', () => {
    expect(names(rows)).toEqual(['Edson Pires', 'João Pedro Antunes', 'Renata Albuquerque']);
    const joao = rows.find((r) => r.id === 'col-08')!;
    expect(joao).toMatchObject({
      initials: 'JA',
      registration: '20296',
      groupName: 'Comercial',
      scheduleId: 'regra-comercial',
      scheduleName: 'Comercial',
      station: { status: 'bloqueada', filter: 'bloqueada', hostname: 'COM-NB-008' },
      overtimeMinutes: 150,
    });
  });

  it('regra em observação que bloquearia: "Liberada sem aprovação", como em /estacoes', () => {
    const edson = rows.find((r) => r.id === 'col-27')!;
    expect(edson.station).toMatchObject({ status: 'em_observacao', filter: 'sem_aprovacao' });
  });

  it('sem regra de jornada, a estação não é controlada', () => {
    const renata = rows.find((r) => r.id === 'col-25')!;
    expect(renata).toMatchObject({ scheduleId: null, station: null, overtimeMinutes: 0 });
  });

  it('busca por nome (sem acento) ou matrícula', () => {
    expect(names(filterPeople(rows, { ...NO_FILTERS, search: 'joao' }))).toEqual([
      'João Pedro Antunes',
    ]);
    expect(names(filterPeople(rows, { ...NO_FILTERS, search: '20999' }))).toEqual(['Edson Pires']);
  });

  it('filtra por grupo, regra e estado, e inverte a ordem', () => {
    expect(names(filterPeople(rows, { ...NO_FILTERS, groupId: 'grp-operacoes' }))).toEqual([
      'Edson Pires',
      'Renata Albuquerque',
    ]);
    expect(names(filterPeople(rows, { ...NO_FILTERS, scheduleId: 'regra-noturna' }))).toEqual([
      'Edson Pires',
    ]);
    expect(names(filterPeople(rows, { ...NO_FILTERS, state: 'bloqueada' }))).toEqual([
      'João Pedro Antunes',
    ]);
    expect(names(filterPeople(rows, { ...NO_FILTERS, order: 'desc' }))).toEqual([
      'Renata Albuquerque',
      'João Pedro Antunes',
      'Edson Pires',
    ]);
  });

  it('iniciais, ordem, contador e horas', () => {
    expect(initialsOf('Ana Ribeiro')).toBe('AR');
    expect(initialsOf('João Pedro Antunes')).toBe('JA');
    expect(initialsOf('Ana')).toBe('A');
    expect(parseOrder('desc')).toBe('desc');
    expect(parseOrder('qualquer')).toBe('asc');
    expect(countLabel(1)).toBe('1 colaborador');
    expect(countLabel(40)).toBe('40 colaboradores');
    expect(hoursLabel(0)).toBe('0 h');
    expect(hoursLabel(150)).toBe('2,5 h');
  });
});
