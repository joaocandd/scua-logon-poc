import { DailyGroupStats, Group } from '../../../shared/models';
import {
  absenceRate,
  byDay,
  byGroup,
  inGroup,
  inPeriod,
  parsePeriod,
  reportCsv,
  total,
} from './report-series';

const GROUPS: Group[] = [
  { id: 'grp-ti', name: 'TI', approverIds: [] },
  { id: 'grp-atendimento', name: 'Atendimento', approverIds: [] },
];

function row(
  date: string,
  groupId: string,
  values: Partial<DailyGroupStats> = {},
): DailyGroupStats {
  return {
    date,
    groupId,
    overtimeMinutes: 0,
    approvedCount: 0,
    blockedMinutes: 0,
    absentCount: 0,
    scheduledCount: 0,
    ...values,
  };
}

// 10 dias, dois grupos.
const ROWS = Array.from({ length: 10 }, (_, i) => {
  const date = `2026-11-${String(i + 1).padStart(2, '0')}`;
  return [
    row(date, 'grp-ti', {
      overtimeMinutes: 60,
      blockedMinutes: i,
      absentCount: 1,
      scheduledCount: 5,
    }),
    row(date, 'grp-atendimento', { overtimeMinutes: 30, blockedMinutes: 10, scheduledCount: 5 }),
  ];
}).flat();

describe('relatórios', () => {
  it('período da URL: 7 ou 30 dias; o resto vira 30', () => {
    expect(parsePeriod('7')).toBe(7);
    expect(parsePeriod('30')).toBe(30);
    expect(parsePeriod(null)).toBe(30);
    expect(parsePeriod('90')).toBe(30);
  });

  it('o período pega os últimos dias; o grupo filtra', () => {
    const week = inPeriod(ROWS, 7);
    expect(new Set(week.map((r) => r.date)).size).toBe(7);
    expect(week[0].date).toBe('2026-11-04');
    expect(inGroup(week, 'grp-ti')).toHaveLength(7);
    expect(inGroup(week, null)).toHaveLength(14);
  });

  it('por dia: soma os grupos, horas extras em horas, rótulo curto e longo', () => {
    const days = byDay(inPeriod(ROWS, 7), 'overtimeMinutes');
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ label: '04/11', longLabel: 'qua, 04/11', value: 1.5 });
    expect(days.at(-1)?.longLabel).toBe('ter, 10/11 (até agora)');
  });

  it('por grupo: em ordem alfabética', () => {
    expect(byGroup(ROWS, GROUPS, 'blockedMinutes')).toEqual([
      { label: 'Atendimento', value: 100 },
      { label: 'TI', value: 45 },
    ]);
  });

  it('total e taxa de ausência', () => {
    expect(total(ROWS, 'absentCount')).toBe(10);
    expect(absenceRate(ROWS)).toBe(0.1);
    expect(absenceRate([])).toBe(0);
  });

  it('CSV com uma linha por dia e grupo, horas com vírgula', () => {
    const csv = reportCsv(ROWS.slice(0, 2), GROUPS, 'overtimeMinutes').split('\r\n');
    expect(csv).toEqual([
      'Dia;Grupo;Horas extras aprovadas (h)',
      '2026-11-01;TI;1,0',
      '2026-11-01;Atendimento;0,5',
    ]);
    expect(reportCsv(ROWS.slice(0, 1), GROUPS, 'absentCount').split('\r\n')).toEqual([
      'Dia;Grupo;Ausentes;Com jornada',
      '2026-11-01;TI;1;5',
    ]);
  });
});
