import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMoney } from '../../../shared/money';
import { formatDuration } from '../../../shared/time';
import { estimatedCost, MonthlyOvertime, MonthOvertime } from '../data/monthly-overtime';

/**
 * Horas extras do mês no painel "Hoje": o mês até hoje ao lado do mês anterior inteiro, com o custo
 * estimado. Sem gráfico: são dois números, e a lista de valores já é a forma acessível de lê-los.
 */
@Component({
  selector: 'app-overtime-month',
  imports: [RouterLink],
  templateUrl: './overtime-month.html',
  styleUrl: './overtime-month.scss',
})
export class OvertimeMonth {
  readonly overtime = input.required<MonthlyOvertime>();
  /** Custo médio da hora extra, em reais (Configurações). */
  readonly hourlyCost = input.required<number>();
  /** Grupo escolhido no painel. Nulo: todos. */
  readonly groupName = input<string | null>(null);

  protected readonly months = computed(() =>
    [this.overtime().current, this.overtime().previous].map((month) => this.view(month)),
  );
  protected readonly costText = computed(() => formatMoney(this.hourlyCost()));

  private view(month: MonthOvertime) {
    return {
      label: month.label,
      monthName: month.monthName,
      empty: month.requestCount === 0,
      hours: formatDuration(month.minutes),
      requests: `${month.requestCount} ${month.requestCount === 1 ? 'pedido' : 'pedidos'}`,
      cost: formatMoney(estimatedCost(month.minutes, this.hourlyCost())),
    };
  }
}
