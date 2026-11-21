// Horas extras do mês no painel "Hoje": o mês atual até hoje ao lado do mês anterior inteiro, sem
// percentual (comparar mês parcial com mês cheio engana). Funções puras.
//
// Os números saem da mesma série diária dos relatórios (/api/relatorios/diario, fictícia na PoC),
// que já inclui os pedidos aprovados: Hoje e Relatórios mostram sempre o mesmo total.

import { DailyGroupStats } from '../../../shared/models';
import { capitalize } from '../../../shared/text';
import { inGroup, total } from '../../reports/data/report-series';

/** Horas extras aprovadas de um mês. */
export interface MonthOvertime {
  /** "Novembro até hoje", "Outubro inteiro". */
  label: string;
  /** "novembro". */
  monthName: string;
  /** Soma das horas extras aprovadas, em minutos (cada colaborador conta no máximo 2 h por dia). */
  minutes: number;
  requestCount: number;
}

export interface MonthlyOvertime {
  current: MonthOvertime;
  previous: MonthOvertime;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * Horas extras aprovadas no mês de hoje e no anterior, a partir da série diária, só do grupo
 * escolhido (nulo: todos). O mês é o do dia da jornada, que é quando a hora extra é feita e entra
 * na folha. `today` é "AAAA-MM-DD" em São Paulo.
 */
export function monthlyOvertime(
  rows: readonly DailyGroupStats[],
  groupId: string | null,
  today: string,
): MonthlyOvertime {
  const [year, month] = today.split('-').map(Number);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const ofGroup = inGroup(rows, groupId);
  return {
    current: monthOf(ofGroup, year, month, 'até hoje', today),
    previous: monthOf(ofGroup, previous.year, previous.month, 'inteiro', today),
  };
}

/** Custo estimado em reais: horas aprovadas × custo médio da hora extra. */
export function estimatedCost(minutes: number, hourlyCost: number): number {
  return (minutes / 60) * hourlyCost;
}

/** Linhas de um mês, até hoje. */
export function rowsOfMonth(
  rows: readonly DailyGroupStats[],
  year: number,
  month: number,
  today: string,
): DailyGroupStats[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return rows.filter((r) => r.date.startsWith(prefix) && r.date <= today);
}

function monthOf(
  rows: readonly DailyGroupStats[],
  year: number,
  month: number,
  period: string,
  today: string,
): MonthOvertime {
  const days = rowsOfMonth(rows, year, month, today);
  const monthName = MONTHS[month - 1];
  return {
    label: `${capitalize(monthName)} ${period}`,
    monthName,
    minutes: total(days, 'overtimeMinutes'),
    requestCount: days.reduce((sum, r) => sum + r.approvedCount, 0),
  };
}
