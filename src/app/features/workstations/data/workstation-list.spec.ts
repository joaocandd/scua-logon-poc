import { Employee, Group, WorkSchedule, WorkstationDetail } from '../../../shared/models';
import {
  countLabel,
  filterWorkstations,
  lastActivityLabel,
  workstationRows,
} from './workstation-list';

const employees = new Map<string, Employee>([
  [
    'col-08',
    { id: 'col-08', name: 'João Pedro Antunes', email: '', jobTitle: '', groupId: 'grp-comercial' },
  ],
  [
    'col-27',
    { id: 'col-27', name: 'Edson Pires', email: '', jobTitle: '', groupId: 'grp-operacoes' },
  ],
]);
const groups = new Map<string, Group>([
  ['grp-comercial', { id: 'grp-comercial', name: 'Comercial', approverIds: [] }],
  ['grp-operacoes', { id: 'grp-operacoes', name: 'Operações', approverIds: [] }],
]);
const schedules = [
  { id: 'regra-comercial', name: 'Comercial' },
  { id: 'regra-noturna', name: 'Noturna' },
] as WorkSchedule[];

const STATIONS: WorkstationDetail[] = [
  {
    employeeId: 'col-27',
    state: 'bloqueada',
    reason: 'Bloqueada: fora da jornada Noturna.',
    observed: true,
    hostname: 'OPS-PC-027',
    scheduleId: 'regra-noturna',
  },
  {
    employeeId: 'col-08',
    state: 'em_jornada',
    reason: 'Liberada: jornada Comercial.',
    hostname: 'COM-NB-008',
    scheduleId: 'regra-comercial',
    lastActivityAt: '2026-11-12T12:55:00Z',
  },
  // Sem colaborador: fica de fora.
  { employeeId: 'col-99', state: 'bloqueada', reason: '', hostname: 'X', scheduleId: '' },
];

const rows = () => workstationRows(STATIONS, employees, groups, schedules);

describe('lista de estações', () => {
  it('linhas por nome da máquina, com grupo, regra e o estado real', () => {
    expect(rows().map((r) => [r.hostname, r.employeeName, r.groupName, r.scheduleName])).toEqual([
      ['COM-NB-008', 'João Pedro Antunes', 'Comercial', 'Comercial'],
      ['OPS-PC-027', 'Edson Pires', 'Operações', 'Noturna'],
    ]);
    // Regra em observação: a estação está liberada de verdade.
    expect(rows()[1]).toMatchObject({ filter: 'sem_aprovacao', status: 'em_observacao' });
  });

  it('busca pelo nome ou pela máquina, sem acento; filtra por estado e grupo', () => {
    const all = rows();
    const none = { search: '', state: null, groupId: null };
    expect(filterWorkstations(all, { ...none, search: 'joao' })).toHaveLength(1);
    expect(filterWorkstations(all, { ...none, search: 'ops-pc' })[0].employeeName).toBe(
      'Edson Pires',
    );
    expect(filterWorkstations(all, { ...none, state: 'em_jornada' })).toHaveLength(1);
    expect(filterWorkstations(all, { ...none, groupId: 'grp-operacoes' })).toHaveLength(1);
    expect(filterWorkstations(all, { search: 'joao', state: 'bloqueada', groupId: null })).toEqual(
      [],
    );
  });

  it('última atividade em palavras', () => {
    const now = Date.parse('2026-11-12T13:00:00Z'); // 10h em São Paulo
    expect(lastActivityLabel('2026-11-12T12:59:40Z', now)).toBe('Agora mesmo');
    expect(lastActivityLabel('2026-11-12T12:55:00Z', now)).toBe('há 5 min');
    expect(lastActivityLabel('2026-11-12T11:00:00Z', now)).toBe('hoje às 8h');
    expect(lastActivityLabel('2026-11-12T01:00:00Z', now)).toBe('ontem às 22h');
    expect(lastActivityLabel('2026-11-09T20:00:00Z', now)).toBe('seg, 09/11 às 17h');
    expect(lastActivityLabel(null, now)).toBe('Sem atividade nos últimos 7 dias');
  });

  it('conta no singular e no plural', () => {
    expect(countLabel(1)).toBe('1 estação');
    expect(countLabel(12)).toBe('12 estações');
  });
});
