import { createFixtures } from '../../../mocks/fixtures';
import { createHistory, historyDaysFor } from '../../../mocks/history';
import { DailyGroupStats } from '../../../shared/models';
import { byDay, inPeriod, total } from '../../reports/data/report-series';
import { estimatedCost, monthlyOvertime } from './monthly-overtime';

// Terça-feira, 24/11, 17h40: o horário do relógio de demonstração. A série é a mesma que a API
// simulada devolve em /api/relatorios/diario (desde 1º de outubro).
const NOW = new Date('2026-11-24T17:40:00-03:00');
const TODAY = '2026-11-24';
const ROWS = createHistory({ ...createFixtures(NOW), now: NOW }, historyDaysFor(NOW));

const sumOf = (rows: readonly DailyGroupStats[], prefix: string, groupId?: string) =>
  rows
    .filter((r) => r.date.startsWith(prefix) && (!groupId || r.groupId === groupId))
    .reduce((sum, r) => sum + r.overtimeMinutes, 0);

describe('monthlyOvertime', () => {
  it('a série cobre o mês anterior inteiro', () => {
    expect(historyDaysFor(NOW)).toBe(55);
    expect(ROWS[0].date).toBe('2026-10-01');
    expect(ROWS.at(-1)?.date).toBe(TODAY);
  });

  it('Hoje e Relatórios mostram o mesmo total de horas extras', () => {
    const { current, previous } = monthlyOvertime(ROWS, null, TODAY);
    // O que o relatório soma, pelos pontos do gráfico por dia, no mesmo intervalo.
    const reportNovember = byDay(
      ROWS.filter((r) => r.date >= '2026-11-01'),
      'overtimeMinutes',
    ).reduce((sum, d) => sum + d.value * 60, 0);
    expect(current.minutes).toBe(Math.round(reportNovember));
    expect(current.minutes).toBe(sumOf(ROWS, '2026-11-'));
    expect(previous.minutes).toBe(sumOf(ROWS, '2026-10-'));
    expect(current.minutes).toBeGreaterThan(0);
    expect(previous.minutes).toBeGreaterThan(0);
    // E o total de 30 dias dos Relatórios é a mesma série: o que cai em novembro bate com o mês.
    const last30 = inPeriod(ROWS, 30);
    expect(
      total(
        last30.filter((r) => r.date >= '2026-11-01'),
        'overtimeMinutes',
      ),
    ).toBe(current.minutes);
  });

  it('conta os pedidos aprovados do mês', () => {
    const { current } = monthlyOvertime(ROWS, null, TODAY);
    const approved = ROWS.filter((r) => r.date >= '2026-11-01').reduce(
      (sum, r) => sum + r.approvedCount,
      0,
    );
    expect(current.requestCount).toBe(approved);
    expect(current.requestCount).toBeGreaterThan(0);
  });

  it('rótulos do mês atual e do anterior', () => {
    const { current, previous } = monthlyOvertime(ROWS, null, TODAY);
    expect([current.label, previous.label]).toEqual(['Novembro até hoje', 'Outubro inteiro']);
  });

  it('só o grupo escolhido', () => {
    const { current } = monthlyOvertime(ROWS, 'grp-comercial', TODAY);
    expect(current.minutes).toBe(sumOf(ROWS, '2026-11-', 'grp-comercial'));
  });

  it('em janeiro, o mês anterior é dezembro do ano anterior', () => {
    const { current, previous } = monthlyOvertime([], null, '2027-01-05');
    expect([current.label, previous.label]).toEqual(['Janeiro até hoje', 'Dezembro inteiro']);
    expect(previous.minutes).toBe(0);
  });
});

describe('estimatedCost', () => {
  it('horas aprovadas vezes o custo médio da hora extra', () => {
    expect(estimatedCost(270, 45)).toBe(202.5);
    expect(estimatedCost(0, 45)).toBe(0);
  });
});
