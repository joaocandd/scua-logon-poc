// Relatórios (/relatorios): período, grupo e as séries dos gráficos a partir da série diária da API.
// Funções puras. Os números vêm de /api/relatorios/diario, que na PoC é fictício (mocks/history.ts).

import { ChartDatum } from '../../../design-system';
import { formatDate } from '../../../shared/date';
import { csvNumber, CsvCell, toCsv } from '../../../shared/csv';
import { DailyGroupStats, Group } from '../../../shared/models';

/** Período do filtro, em dias, contando hoje. Vai na URL como `?periodo=`. */
export type ReportPeriod = 7 | 30;

export const REPORT_PERIODS: readonly ReportPeriod[] = [7, 30];

/** Sem período na URL (ou com um que não existe), o relatório mostra 30 dias. */
export function parsePeriod(value: string | null): ReportPeriod {
  return value === '7' ? 7 : 30;
}

/** O que cada bloco do relatório mede. */
export type ReportMetric = 'overtimeMinutes' | 'blockedMinutes' | 'absentCount';

/** Só os últimos `period` dias da série (que vem do mais antigo para hoje). */
export function inPeriod(rows: readonly DailyGroupStats[], period: ReportPeriod) {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const from = dates.at(-period) ?? dates[0];
  return rows.filter((r) => r.date >= from);
}

/** Só o grupo escolhido. Nulo: todos os grupos. */
export function inGroup(rows: readonly DailyGroupStats[], groupId: string | null) {
  return groupId ? rows.filter((r) => r.groupId === groupId) : [...rows];
}

export function total(rows: readonly DailyGroupStats[], metric: ReportMetric): number {
  return rows.reduce((sum, row) => sum + row[metric], 0);
}

/** Minutos em horas, com uma casa: 150 → 2,5. */
export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/** Valor do gráfico: horas extras viram horas; o resto fica como está. */
export function chartValue(metric: ReportMetric, value: number): number {
  return metric === 'overtimeMinutes' ? toHours(value) : value;
}

/**
 * Um ponto por dia: "18/11" no eixo, "qua, 18/11" no tooltip e na tabela. O último dia da série é
 * hoje, que ainda não acabou: ganha "(até agora)".
 */
export function byDay(rows: readonly DailyGroupStats[], metric: ReportMetric): ChartDatum[] {
  const days = new Map<string, number>();
  for (const row of rows) days.set(row.date, (days.get(row.date) ?? 0) + row[metric]);
  const sorted = [...days].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([date, value], i) => ({
    label: shortDate(date),
    longLabel: `${formatDate(date)}${i === sorted.length - 1 ? ' (até agora)' : ''}`,
    value: chartValue(metric, value),
  }));
}

/** Uma barra por grupo, em ordem alfabética. */
export function byGroup(
  rows: readonly DailyGroupStats[],
  groups: readonly Group[],
  metric: ReportMetric,
): ChartDatum[] {
  return [...groups]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((group) => ({
      label: group.name,
      value: chartValue(
        metric,
        total(
          rows.filter((r) => r.groupId === group.id),
          metric,
        ),
      ),
    }));
}

/** Taxa de ausência no período: ausentes ÷ colaboradores com jornada. Zero sem ninguém na base. */
export function absenceRate(rows: readonly DailyGroupStats[]): number {
  const scheduled = rows.reduce((sum, r) => sum + r.scheduledCount, 0);
  return scheduled === 0 ? 0 : total(rows, 'absentCount') / scheduled;
}

const CSV_COLUMN: Record<ReportMetric, string> = {
  overtimeMinutes: 'Horas extras aprovadas (h)',
  blockedMinutes: 'Estação bloqueada (min)',
  absentCount: 'Ausentes',
};

/** CSV do bloco: uma linha por dia e por grupo, como a série da API. */
export function reportCsv(
  rows: readonly DailyGroupStats[],
  groups: readonly Group[],
  metric: ReportMetric,
): string {
  const names = new Map(groups.map((g) => [g.id, g.name]));
  const header = ['Dia', 'Grupo', CSV_COLUMN[metric]];
  if (metric === 'absentCount') header.push('Com jornada');
  const lines = rows.map((row) => {
    const line: CsvCell[] = [row.date, names.get(row.groupId) ?? row.groupId];
    line.push(metric === 'overtimeMinutes' ? csvNumber(row[metric] / 60, 1) : row[metric]);
    if (metric === 'absentCount') line.push(row.scheduledCount);
    return line;
  });
  return toCsv(header, lines);
}

/** "2026-11-18" → "18/11". */
function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}
