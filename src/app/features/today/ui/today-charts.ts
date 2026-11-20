import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarChart, ChartDatum, Skeleton } from '../../../design-system';

const count = (value: number) => value.toLocaleString('pt-BR');
const hours = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;

/**
 * Dois gráficos pequenos do painel "Hoje", abaixo dos contadores: pedidos de hoje por status e
 * horas extras dos últimos 7 dias. Cada um leva ao relatório completo, com o mesmo grupo.
 */
@Component({
  selector: 'app-today-charts',
  imports: [BarChart, RouterLink, Skeleton],
  templateUrl: './today-charts.html',
  styleUrl: './today-charts.scss',
})
export class TodayCharts {
  readonly byStatus = input.required<readonly ChartDatum[]>();
  readonly overtime = input.required<readonly ChartDatum[]>();
  /** A série das horas extras vem de outra chamada: pode estar carregando ou ter falhado. */
  readonly overtimeState = input.required<'loading' | 'error' | 'ready'>();
  readonly groupId = input<string | null>(null);

  protected readonly formats = { count, hours };

  /** Os links levam o grupo escolhido no painel. */
  protected readonly reportQuery = computed(() => ({ grupo: this.groupId() }));
  protected readonly weekQuery = computed(() => ({ periodo: 7, grupo: this.groupId() }));
}
