import { Employee, Group, WorkSchedule } from '../../shared/models';
import { NAV_ITEMS } from './nav-items';
import { MAX_RESULTS_PER_SECTION, normalize, search, SearchSources } from './search';

function employee(id: string, name: string, jobTitle: string, groupId: string): Employee {
  return { id, name, jobTitle, groupId, email: `${id}@empresa.example` };
}

const groups: Group[] = [
  { id: 'grp-financeiro', name: 'Financeiro', approverIds: [] },
  { id: 'grp-ti', name: 'TI', approverIds: [] },
];

const employees: Employee[] = [
  employee('col-01', 'João Pedro Antunes', 'Executivo de contas', 'grp-financeiro'),
  employee('col-02', 'Ana Ribeiro', 'Analista financeira', 'grp-financeiro'),
  employee('col-03', 'Mariana Lopes', 'Desenvolvedora', 'grp-ti'),
];

const schedule: WorkSchedule = {
  id: 'regra-noturna',
  name: 'Noturna',
  weekdays: [1, 2, 3, 4, 5],
  start: '22:00',
  end: '06:00',
  breaks: [],
  warningMinutes: [15, 5],
  requiresHrValidation: false,
  observationMode: false,
  assignment: { groupIds: ['grp-ti'], excludedEmployeeIds: [] },
};

const sources: SearchSources = { pages: NAV_ITEMS, employees, groups, schedules: [schedule] };

const labels = (query: string) =>
  search(query, sources).map((section) => [section.heading, section.results.map((r) => r.label)]);

describe('Busca da paleta de comandos', () => {
  it('sem texto, mostra só as páginas', () => {
    expect(labels('  ')).toEqual([
      [
        'Páginas',
        ['Hoje', 'Aprovações', 'Pessoas', 'Regras de jornada', 'Relatórios', 'Configurações'],
      ],
    ]);
  });

  it('ignora acentos e maiúsculas', () => {
    expect(labels('JOAO')).toEqual([['Colaboradores', ['João Pedro Antunes']]]);
    expect(labels('aprovacoes')).toEqual([['Páginas', ['Aprovações']]]);
  });

  it('cada palavra precisa aparecer, no nome, no cargo ou no grupo', () => {
    expect(labels('ana fin')).toEqual([['Colaboradores', ['Ana Ribeiro']]]);
    expect(labels('mariana ti')).toEqual([['Colaboradores', ['Mariana Lopes']]]);
  });

  it('separa em seções e põe primeiro quem começa com o texto digitado', () => {
    expect(labels('financ')).toEqual([
      ['Colaboradores', ['João Pedro Antunes', 'Ana Ribeiro']],
      ['Grupos', ['Financeiro']],
    ]);
    expect(labels('ana')).toEqual([['Colaboradores', ['Ana Ribeiro', 'Mariana Lopes']]]);
  });

  it('cada resultado leva à página certa, com o parâmetro de busca', () => {
    const [employeeResult] = search('ribeiro', sources)[0].results;
    expect(employeeResult).toMatchObject({
      id: 'employee-col-02',
      detail: 'Analista financeira · Financeiro',
      path: '/pessoas',
      queryParams: { colaborador: 'col-02' },
    });

    const [groupResult] = search('financeiro', sources).find((s) => s.kind === 'group')!.results;
    expect(groupResult).toMatchObject({
      detail: '2 colaboradores',
      path: '/pessoas',
      queryParams: { grupo: 'grp-financeiro' },
    });

    const [scheduleResult] = search('noturna', sources)[0].results;
    expect(scheduleResult).toMatchObject({
      detail: 'Das 22h às 6h',
      path: '/regras',
      queryParams: { regra: 'regra-noturna' },
    });

    const [pageResult] = search('hoje', sources)[0].results;
    expect(pageResult).toMatchObject({ id: 'page-hoje', path: '/hoje' });
    expect(pageResult.queryParams).toBeUndefined();
  });

  it(`mostra no máximo ${MAX_RESULTS_PER_SECTION} resultados por seção`, () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      employee(`col-${i}`, `Pessoa ${i}`, 'Analista', 'grp-ti'),
    );
    const sections = search('pessoa', { ...sources, employees: many });
    const section = sections.find((s) => s.kind === 'employee');
    expect(section?.results).toHaveLength(MAX_RESULTS_PER_SECTION);
  });

  it('nada encontrado devolve lista vazia', () => {
    expect(search('xyz', sources)).toEqual([]);
  });

  it('normalize tira acento e maiúscula', () => {
    expect(normalize('  Configurações ')).toBe('configuracoes');
  });
});
