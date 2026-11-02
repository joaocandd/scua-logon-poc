import { EMPLOYEES } from '../../../mocks/fixtures/employees';
import { WORK_SCHEDULES } from '../../../mocks/fixtures/work-schedules';
import { assignmentPreview } from './schedule-assignment';
import { newScheduleDraft, ScheduleDraft, toDraft, toSchedule } from './schedule-draft';
import { scheduleSummary } from './schedule-summary';
import { checkHours } from './schedule-validation';

function summary(draft: ScheduleDraft): string {
  return scheduleSummary(
    draft,
    checkHours(draft),
    assignmentPreview(toSchedule(draft), EMPLOYEES),
  ).join(' ');
}

const fixture = (id: string) => toDraft(WORK_SCHEDULES.find((s) => s.id === id)!);

describe('scheduleSummary', () => {
  it('regra Comercial, como no exemplo do CLAUDE.md', () => {
    expect(summary(fixture('regra-comercial'))).toBe(
      'Seg a sex, das 8h às 17h. Estação bloqueada no intervalo Almoço (12h–13h). Avisos 15 e 5 min antes. Hora extra precisa do gestor e do RH. Vale para 15 colaboradores de 2 grupos.',
    );
  });

  it('jornada noturna termina no dia seguinte', () => {
    expect(summary(fixture('regra-noturna'))).toBe(
      'Seg a sex, das 22h às 6h do dia seguinte. Estação bloqueada no intervalo Pausa (2h–3h). Avisos 30, 15 e 5 min antes. Hora extra precisa do gestor e do RH. Vale para 6 colaboradores de 1 grupo.',
    );
  });

  it('regra nova: sem grupo, ainda não vale para ninguém', () => {
    expect(summary(newScheduleDraft())).toBe(
      'Seg a sex, das 8h às 17h. Estação bloqueada no intervalo Almoço (12h–13h). Avisos 15 e 5 min antes. Hora extra precisa só do gestor. Ainda não vale para ninguém.',
    );
  });

  it('vários intervalos, em ordem, um aviso só', () => {
    const draft: ScheduleDraft = {
      ...newScheduleDraft(),
      breaks: [
        { label: 'Lanche', start: '15:00', end: '15:15' },
        { label: 'Almoço', start: '12:00', end: '13:00' },
      ],
      warningMinutes: [10],
    };
    expect(
      scheduleSummary(draft, checkHours(draft), assignmentPreview(toSchedule(draft), [])),
    ).toEqual([
      'Seg a sex, das 8h às 17h.',
      'Estação bloqueada nos intervalos Almoço (12h–13h) e Lanche (15h–15h15).',
      'Aviso 10 min antes.',
      'Hora extra precisa só do gestor.',
      'Ainda não vale para ninguém.',
    ]);
  });

  it('sem intervalo, sem aviso e sem dia', () => {
    const draft: ScheduleDraft = {
      ...newScheduleDraft(),
      end: '12:00',
      breaks: [],
      warningMinutes: [],
    };
    expect(summary(draft)).toContain('Sem intervalo. Sem aviso antes do bloqueio.');
    expect(summary({ ...draft, days: Array(7).fill(false) })).toMatch(
      /^Nenhum dia da semana escolhido\./,
    );
  });

  it('horário incompleto não entra no resumo', () => {
    expect(summary({ ...newScheduleDraft(), end: '' })).toMatch(
      /^Seg a sex, horário ainda incompleto\. Avisos/,
    );
  });
});
