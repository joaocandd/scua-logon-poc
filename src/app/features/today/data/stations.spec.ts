import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { GROUPS } from '../../../mocks/fixtures/groups';
import { Workstation } from '../../../shared/models';
import {
  countByFilter,
  emptyListText,
  inGroup,
  isUnapproved,
  parseFilter,
  stationRows,
} from './stations';

const employeeById = new Map(EMPLOYEES.map((e) => [e.id, e]));
const groupById = new Map(GROUPS.map((g) => [g.id, g]));

const WORKSTATIONS: Workstation[] = [
  // Comercial
  { employeeId: 'col-14', state: 'em_jornada', reason: 'Liberada: jornada Comercial.' },
  { employeeId: 'col-08', state: 'intervalo', reason: 'Bloqueada: intervalo da jornada.' },
  // Atendimento
  { employeeId: 'col-19', state: 'he_aprovada', reason: 'Liberada: hora extra aprovada.' },
  // Operações, na Noturna em observação
  {
    employeeId: 'col-27',
    state: 'bloqueada',
    reason: 'Bloqueada: fora da jornada Noturna (das 22h às 6h).',
    observed: true,
  },
  {
    employeeId: 'col-26',
    state: 'em_jornada',
    reason: 'Liberada: jornada Noturna (das 22h às 6h).',
    observed: true,
  },
  // Sem colaborador nas fixtures: fica de fora.
  { employeeId: 'col-99', state: 'bloqueada', reason: 'Bloqueada.' },
];

describe('isUnapproved', () => {
  const observed = (state: Workstation['state']): Workstation => ({
    employeeId: 'col-27',
    state,
    reason: '',
    observed: true,
  });

  it('regra em observação que bloquearia: estação liberada sem aprovação', () => {
    expect(isUnapproved(observed('bloqueada'))).toBe(true);
    expect(isUnapproved(observed('intervalo'))).toBe(true);
    expect(isUnapproved(observed('fora_expediente'))).toBe(true);
  });

  it('em observação, mas dentro da jornada ou com hora extra aprovada: liberada pela regra', () => {
    expect(isUnapproved(observed('em_jornada'))).toBe(false);
    expect(isUnapproved(observed('he_aprovada'))).toBe(false);
  });

  it('regra ativa bloqueia de verdade', () => {
    expect(isUnapproved({ employeeId: 'col-08', state: 'bloqueada', reason: '' })).toBe(false);
  });
});

describe('stationRows', () => {
  const rows = stationRows(WORKSTATIONS, employeeById, groupById);

  it('uma linha por estação com colaborador, em ordem alfabética, com o grupo', () => {
    expect(rows.map((r) => [r.name, r.groupName])).toEqual([
      ['Carlos Teixeira', 'Operações'],
      ['Edson Pires', 'Operações'],
      ['Igor Sampaio', 'Atendimento'],
      ['João Pedro Antunes', 'Comercial'],
      ['Lucas Bittencourt', 'Comercial'],
    ]);
  });

  it('a estação liberada sem aprovação entra na lista própria, com o motivo explicado', () => {
    const edson = rows.find((r) => r.employeeId === 'col-27');
    expect(edson).toMatchObject({ filter: 'sem_aprovacao', status: 'em_observacao' });
    expect(edson?.reason).toBe(
      'Liberada sem aprovação. Pela regra em observação, estaria bloqueada: fora da jornada Noturna (das 22h às 6h).',
    );
    const carlos = rows.find((r) => r.employeeId === 'col-26');
    expect(carlos).toMatchObject({ filter: 'em_jornada', status: 'em_jornada' });
  });

  it('conta cada lista e filtra por grupo', () => {
    expect(countByFilter(rows)).toEqual({
      em_jornada: 2,
      intervalo: 1,
      he_aprovada: 1,
      bloqueada: 0,
      fora_expediente: 0,
      sem_aprovacao: 1,
    });
    expect(inGroup(rows, 'grp-comercial').map((r) => r.name)).toEqual([
      'João Pedro Antunes',
      'Lucas Bittencourt',
    ]);
    expect(inGroup(rows, null)).toHaveLength(5);
  });
});

describe('parseFilter e emptyListText', () => {
  it('só aceita as listas conhecidas', () => {
    expect(parseFilter('bloqueada')).toBe('bloqueada');
    expect(parseFilter('sem_aprovacao')).toBe('sem_aprovacao');
    expect(parseFilter('qualquer')).toBeNull();
    expect(parseFilter(null)).toBeNull();
  });

  it('diz que ninguém está naquela lista, no grupo escolhido', () => {
    expect(emptyListText('intervalo', 'TI')).toBe('Nenhuma estação em intervalo agora em TI.');
    expect(emptyListText('he_aprovada', null)).toBe(
      'Nenhuma estação com hora extra aprovada agora.',
    );
  });
});
