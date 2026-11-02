import { Component, computed, input, linkedSignal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Field, FieldControl, StatusBadge } from '../../../design-system';
import { simulate, SimulationContext, SimulationQuery } from '../data/schedule-simulation';

/**
 * Simulador "e se?" do editor de regras: escolha um colaborador, um dia e uma hora e veja como
 * a estação estaria com a regra do jeito que está no editor, antes de salvar. O resultado muda na
 * hora e é anunciado pelo leitor de tela (região viva educada).
 *
 * Os campos ficam dentro do formulário da regra, mas não fazem parte dela: Enter numa data ou numa
 * hora não salva a regra (o navegador enviaria o formulário).
 */
@Component({
  selector: 'app-schedule-simulator',
  imports: [Field, FieldControl, FormField, StatusBadge],
  templateUrl: './schedule-simulator.html',
  styleUrl: './schedule-simulator.scss',
  host: { '(keydown.enter)': 'keepFromSubmitting($event)' },
})
export class ScheduleSimulator {
  readonly context = input.required<SimulationContext>();
  /** Hoje, "AAAA-MM-DD": a data que o simulador mostra ao abrir. */
  readonly today = input.required<string>();
  /** Agora, "HH:mm": a hora que o simulador mostra ao abrir. */
  readonly time = input.required<string>();

  /**
   * O que a pessoa escolheu. A regra muda a cada tecla no editor; a escolha só muda quando a
   * pessoa escolhida sai da regra (vai para a primeira da lista).
   */
  private readonly model = linkedSignal<
    { ids: readonly string[]; today: string; time: string },
    SimulationQuery
  >({
    source: () => ({
      ids: this.context().employees.map((e) => e.id),
      today: this.today(),
      time: this.time(),
    }),
    computation: (source, previous) => {
      const kept = previous?.value;
      return {
        employeeId:
          kept && source.ids.includes(kept.employeeId) ? kept.employeeId : (source.ids[0] ?? ''),
        date: kept?.date ?? source.today,
        time: kept?.time ?? source.time,
      };
    },
  });
  protected readonly query = form(this.model);

  protected readonly result = computed(() => simulate(this.context(), this.query().value()));
  /** Por que não há resultado, em vez dele. */
  protected readonly missing = computed(() => {
    const { schedule, employees } = this.context();
    if (!schedule) return 'Corrija os horários da jornada para simular.';
    return employees.length === 0
      ? 'Escolha ao menos um grupo em “A quem se aplica” para simular.'
      : 'Escolha a data e a hora para simular.';
  });

  protected keepFromSubmitting(event: Event): void {
    if ((event.target as HTMLElement).tagName === 'INPUT') event.preventDefault();
  }
}
