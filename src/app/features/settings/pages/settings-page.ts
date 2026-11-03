import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  type FieldTree,
  form,
  FormField,
  FormRoot,
  required,
  validate,
} from '@angular/forms/signals';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FieldControl,
  Icon,
  PageHeader,
  Skeleton,
  Toast,
} from '../../../design-system';
import { apiErrorMessage } from '../../../shared/api-error';
import { formatMoney, parseMoney, toMoneyInput } from '../../../shared/money';
import { isRetrying, loadState, retryFailed } from '../../schedules/data/load-state';
import { CompanySettings } from '../data/company-settings';
import { overtimeCostError } from '../data/overtime-cost';

interface CostDraft {
  /** Como a pessoa digitou: "45,50". */
  cost: string;
}

/**
 * Configurações (/configuracoes). Nesta prova de conceito, só o custo médio da hora extra, que o
 * painel "Hoje" usa para estimar o custo do mês.
 *
 * O formulário usa Signal Forms com o Field do design system. Erros de campo só depois da primeira
 * tentativa de salvar (ADR 0008).
 */
@Component({
  selector: 'app-settings-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    Field,
    FieldControl,
    FormField,
    FormRoot,
    Icon,
    PageHeader,
    Skeleton,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly settings = inject(CompanySettings);
  private readonly toast = inject(Toast);
  private readonly injector = inject(Injector);

  private readonly resources = [this.settings.current];
  protected readonly state = computed(() => loadState(this.resources));
  protected readonly retrying = computed(() => isRetrying(this.resources));

  /** O valor salvo, no formato do campo. Muda quando a API responde ou quando a pessoa salva. */
  private readonly draft = linkedSignal<CostDraft>(() => ({
    cost: this.settings.current.hasValue()
      ? toMoneyInput(this.settings.current.value().overtimeHourlyCost)
      : '',
  }));

  protected readonly costForm = form(
    this.draft,
    (path) => {
      required(path.cost, { message: 'Informe o custo médio da hora extra.' });
      validate(path.cost, ({ value }) => {
        const message = overtimeCostError(value());
        return message ? { kind: 'custo', message } : null;
      });
    },
    {
      submission: {
        action: async (fields) => {
          this.formError.set(null);
          try {
            const saved = await this.settings.save({
              overtimeHourlyCost: parseMoney(fields.cost().value())!,
            });
            this.showFieldErrors.set(false);
            this.toast.show({
              message: `Custo médio salvo: ${formatMoney(saved.overtimeHourlyCost)} por hora.`,
            });
          } catch (error) {
            this.formError.set(apiErrorMessage(error));
          }
        },
        onInvalid: (fields) => {
          this.formError.set(null);
          this.showFieldErrors.set(true);
          afterNextRender(() => fields.cost().focusBoundControl(), { injector: this.injector });
        },
      },
    },
  );

  protected readonly showFieldErrors = signal(false);
  /** Erro que não é do campo, como o servidor fora do ar ao salvar. */
  protected readonly formError = signal<string | null>(null);

  protected errorOf(field: FieldTree<string>): string | null {
    return this.showFieldErrors() ? (field().errors()[0]?.message ?? null) : null;
  }

  protected retry(): void {
    retryFailed(this.resources);
  }
}
