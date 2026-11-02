import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { HOLIDAYS } from '../../../mocks/fixtures/holidays';
import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { ScheduleException } from '../../../shared/models';
import { periodNotes } from './schedule-period';

const comercial = WORK_SCHEDULES.find((s) => s.id === 'regra-comercial')!;
const tarde = WORK_SCHEDULES.find((s) => s.id === 'regra-tarde')!;
const person = (id: string) => EMPLOYEES.find((e) => e.id === id)!;

const exceptions: ScheduleException[] = [
  {
    id: 'exc-a',
    employeeId: 'col-04',
    date: '2026-11-04',
    kind: 'horario',
    start: '07:00',
    end: '16:00',
    breaks: [],
    reason: 'Auditoria externa',
  },
  { id: 'exc-b', employeeId: 'col-02', date: '2026-11-03', kind: 'folga', reason: 'Consulta' },
  // Fora do período e de alguém fora da regra.
  { id: 'exc-c', employeeId: 'col-02', date: '2026-12-10', kind: 'folga', reason: 'Férias' },
  { id: 'exc-d', employeeId: 'col-33', date: '2026-11-05', kind: 'folga', reason: 'Curso' },
];

describe('periodNotes', () => {
  it('feriados dos próximos 30 dias que caem em dia de jornada', () => {
    // De 02/11 a 01/12: Finados (seg) e Consciência Negra (sex). O dia 15/11 é domingo.
    const notes = periodNotes(comercial, [], HOLIDAYS, [], '2026-11-02');
    expect(notes.holidays).toEqual([
      'Finados, seg, 02/11',
      'Dia Nacional de Zumbi e da Consciência Negra, sex, 20/11',
    ]);
  });

  it('regra que trabalha aos sábados não vê o feriado de domingo', () => {
    expect(periodNotes(tarde, [], HOLIDAYS, [], '2026-11-03').holidays).toEqual([
      'Dia Nacional de Zumbi e da Consciência Negra, sex, 20/11',
    ]);
  });

  it('exceções de quem está na regra, por data', () => {
    const covered = [person('col-02'), person('col-04')];
    expect(periodNotes(comercial, covered, [], exceptions, '2026-11-02').exceptions).toEqual([
      'Larissa Fontes, ter, 03/11: folga (Consulta)',
      'Patrícia Lemos, qua, 04/11: horário especial das 7h às 16h (Auditoria externa)',
    ]);
  });

  it('nada no período', () => {
    expect(periodNotes(comercial, [], HOLIDAYS, exceptions, '2026-12-26')).toEqual({
      holidays: [],
      exceptions: [],
    });
  });
});
