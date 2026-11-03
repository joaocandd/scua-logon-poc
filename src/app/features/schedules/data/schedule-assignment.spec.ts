import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { GROUPS } from '../../../mocks/fixtures/groups';
import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { WorkSchedule } from '../../../shared/models';
import {
  assignmentConflicts,
  assignmentPreview,
  groupOptions,
  listNames,
} from './schedule-assignment';

const comercial = WORK_SCHEDULES.find((s) => s.id === 'regra-comercial')!;
const others = WORK_SCHEDULES.filter((s) => s.id !== 'regra-nova');

/** Regra nova com os grupos e as exclusões dados. */
function rule(groupIds: string[], excludedEmployeeIds: string[] = []): WorkSchedule {
  return {
    ...comercial,
    id: 'regra-nova',
    name: 'Plantão',
    assignment: { groupIds, excludedEmployeeIds },
  };
}

describe('assignmentPreview', () => {
  it('conta colaboradores e grupos', () => {
    const preview = assignmentPreview(
      rule(['grp-comercial', 'grp-financeiro', 'grp-ti']),
      EMPLOYEES,
    );
    expect(preview.headline).toBe('Esta regra vai valer para 20 colaboradores de 3 grupos.');
    expect(preview.covered).toHaveLength(20);
  });

  it('desconta quem ficou de fora e diz quem é', () => {
    const preview = assignmentPreview(rule(['grp-operacoes'], ['col-25']), EMPLOYEES);
    expect(preview.headline).toBe('Esta regra vai valer para 6 colaboradores de 1 grupo.');
    expect(preview.excluded.map((e) => e.name)).toEqual(['Renata Albuquerque']);
  });

  it('no singular, com uma pessoa só', () => {
    const everyoneButOne = ['col-33', 'col-34', 'col-35', 'col-36'];
    expect(assignmentPreview(rule(['grp-ti'], everyoneButOne), EMPLOYEES).headline).toBe(
      'Esta regra vai valer para 1 colaborador de 1 grupo.',
    );
  });

  it('sem grupo, ou com todos de fora, ainda não vale para ninguém', () => {
    expect(assignmentPreview(rule([]), EMPLOYEES).headline).toBe(
      'Esta regra ainda não vale para ninguém. Escolha ao menos um grupo.',
    );
    const all = EMPLOYEES.filter((e) => e.groupId === 'grp-rh').map((e) => e.id);
    expect(assignmentPreview(rule(['grp-rh'], all), EMPLOYEES).headline).toBe(
      'Esta regra ainda não vale para ninguém: todos os colaboradores estão de fora. Marque ao menos um na lista.',
    );
  });
});

describe('assignmentConflicts', () => {
  it('diz quem já está em outra regra ativa, e qual', () => {
    const problems = assignmentConflicts(rule(['grp-ti']), EMPLOYEES, others);
    expect(problems).toEqual([
      {
        message:
          'André Seixas, Letícia Barros, Natália Coelho e mais 2 colaboradores já estão na regra Flexível. Cada colaborador segue uma regra só: tire o grupo de uma das regras ou deixe essas pessoas de fora desta.',
        target: { field: 'assignment' },
      },
    ]);
  });

  it('uma pessoa só, no singular', () => {
    const ti = EMPLOYEES.filter((e) => e.groupId === 'grp-ti' && e.id !== 'col-32').map(
      (e) => e.id,
    );
    expect(assignmentConflicts(rule(['grp-ti'], ti), EMPLOYEES, others)[0].message).toMatch(
      /^Thiago Moreira já está na regra Flexível\./,
    );
  });

  it('quem foi excluído da outra regra não conflita', () => {
    // Só a diretora (col-25) fica nesta regra, e ela está fora da Noturna.
    const allButRenata = EMPLOYEES.filter(
      (e) => e.groupId === 'grp-operacoes' && e.id !== 'col-25',
    );
    const problems = assignmentConflicts(
      rule(
        ['grp-operacoes'],
        allButRenata.map((e) => e.id),
      ),
      EMPLOYEES,
      others,
    );
    expect(problems).toEqual([]);
  });

  it('regra em observação não conta', () => {
    const observed = others.map((s) => ({ ...s, observationMode: true }));
    expect(assignmentConflicts(rule(['grp-ti']), EMPLOYEES, observed)).toEqual([]);
  });
});

describe('groupOptions', () => {
  it('lista os grupos em ordem, com as pessoas e a regra ativa de cada um', () => {
    const options = groupOptions(GROUPS, EMPLOYEES, others);
    expect(options.map((o) => [o.group.name, o.employees.length, o.otherRule])).toEqual([
      ['Atendimento', 9, 'Tarde'],
      ['Comercial', 9, 'Comercial'],
      ['Financeiro', 6, 'Comercial'],
      ['Operações', 7, 'Noturna'],
      ['RH', 4, 'Flexível'],
      ['TI', 5, 'Flexível'],
    ]);
  });
});

describe('listNames', () => {
  const people = (n: number) => EMPLOYEES.slice(0, n);

  it.each([
    [1, 'Paulo Siqueira'],
    [2, 'Paulo Siqueira e Larissa Fontes'],
    [3, 'Paulo Siqueira, Larissa Fontes e Gustavo Ramalho'],
    [4, 'Paulo Siqueira, Larissa Fontes, Gustavo Ramalho e mais 1 colaborador'],
  ])('%i pessoas → "%s"', (n, text) => {
    expect(listNames(people(n))).toBe(text);
  });
});
