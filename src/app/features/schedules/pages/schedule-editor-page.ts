import {
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  Injector,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type FieldTree, form, FormRoot } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Skeleton,
  Toast,
} from '../../../design-system';
import { apiErrorMessage } from '../../../shared/api-error';
import { isRetrying, LoadState, loadState, retryFailed } from '../data/load-state';
import { newScheduleDraft, ScheduleDraft, toDraft, toSchedule } from '../data/schedule-draft';
import { scheduleSchema } from '../data/schedule-form';
import { draftTimeline } from '../data/schedule-timeline';
import { checkHours } from '../data/schedule-validation';
import { warningPreview } from '../data/schedule-warnings';
import { WorkSchedules } from '../data/work-schedules';
import { ScheduleApproval } from '../ui/schedule-approval';
import { ScheduleHours } from '../ui/schedule-hours';
import { ScheduleNameDays } from '../ui/schedule-name-days';
import { ScheduleWarnings } from '../ui/schedule-warnings';

/** Estado da tela: o de carregamento, ou a regra da URL que não existe. */
type EditorState = LoadState | 'not-found';

/**
 * Editor de regra de jornada (fluxo B): /regras/nova cria e /regras/:id edita. O formulário usa
 * Signal Forms (ADR 0008); cada seção é um componente de `ui/` que recebe os campos daqui.
 *
 * Dois tipos de erro (ADR 0011):
 * - de campo (obrigatório, nome repetido, nenhum dia): só depois do primeiro "Salvar regra";
 * - de regra (horários e intervalos): na hora, junto da linha do tempo.
 * Os dois impedem salvar. Na tentativa, o foco vai para o primeiro campo com problema.
 */
@Component({
  selector: 'app-schedule-editor-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    FormRoot,
    Icon,
    PageHeader,
    RouterLink,
    ScheduleApproval,
    ScheduleHours,
    ScheduleNameDays,
    ScheduleWarnings,
    Skeleton,
  ],
  templateUrl: './schedule-editor-page.html',
  styleUrl: './schedule-editor-page.scss',
})
export class ScheduleEditorPage {
  private readonly schedules = inject(WorkSchedules);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(Toast);
  private readonly injector = inject(Injector);
  private readonly hoursSection = viewChild(ScheduleHours);

  /** Id da regra na URL. Nulo em /regras/nova. */
  protected readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  private readonly resources = [this.schedules.list];
  private readonly list = computed(() =>
    this.schedules.list.hasValue() ? this.schedules.list.value() : [],
  );
  /** A regra como está salva na API. Nula em regra nova. */
  protected readonly saved = computed(() => this.list().find((s) => s.id === this.id()) ?? null);

  protected readonly state = computed<EditorState>(() => {
    const state = loadState(this.resources);
    return state === 'ready' && this.id() && !this.saved() ? 'not-found' : state;
  });
  protected readonly retrying = computed(() => isRetrying(this.resources));

  protected readonly heading = computed(() => {
    if (!this.id()) return 'Nova regra';
    switch (this.state()) {
      case 'not-found':
        return 'Regra não encontrada';
      case 'ready':
        return this.saved()!.name;
      default:
        return 'Regra de jornada';
    }
  });

  /**
   * Muda só quando a tela fica pronta ou quando a URL troca de regra. Assim, a lista de regras
   * chegar de novo da API não apaga o que a pessoa está digitando.
   */
  private readonly source = computed(() => (this.state() === 'ready' ? (this.id() ?? '') : null));
  private readonly draft = linkedSignal<ScheduleDraft>(() => {
    this.source();
    const saved = untracked(this.saved);
    return saved ? toDraft(saved) : newScheduleDraft();
  });

  protected readonly editor = form(
    this.draft,
    scheduleSchema({
      otherNames: () =>
        this.list()
          .filter((s) => s.id !== this.id())
          .map((s) => s.name),
    }),
    {
      submission: {
        action: async (fields) => {
          this.formError.set(null);
          const id = this.id();
          try {
            const saved = await this.schedules.save(toSchedule(fields().value(), id ?? ''));
            // O formulário fica igual ao que foi salvo (nome sem espaços nas pontas, por exemplo).
            fields().reset(toDraft(saved));
            this.toast.show({ message: `Regra ${saved.name} ${id ? 'salva' : 'criada'}.` });
            if (!id) await this.router.navigate(['/regras', saved.id], { replaceUrl: true });
          } catch (error) {
            this.formError.set(apiErrorMessage(error));
          }
        },
        onInvalid: () => {
          this.formError.set(null);
          this.showFieldErrors.set(true);
          afterNextRender(() => this.focusFirstInvalid(), { injector: this.injector });
        },
      },
    },
  );

  protected readonly showFieldErrors = signal(false);
  /** Erro que não é de um campo, como o servidor fora do ar ao salvar. */
  protected readonly formError = signal<string | null>(null);

  /** Horários conferidos a cada tecla: alimentam a linha do tempo e os problemas de regra. */
  private readonly hours = computed(() => checkHours(this.editor().value()));
  protected readonly timeline = computed(() => draftTimeline(this.hours()));
  protected readonly problems = computed(() => this.hours().problems.map((p) => p.message));
  protected readonly warnings = computed(() => warningPreview(this.editor().value(), this.hours()));

  constructor() {
    // Outra regra na mesma tela (pela busca, por exemplo): começa sem erros e sem alterações.
    effect(() => {
      this.source();
      untracked(() => {
        this.editor().reset();
        this.showFieldErrors.set(false);
        this.formError.set(null);
      });
    });
  }

  protected retry(): void {
    retryFailed(this.resources);
  }

  /**
   * Foco no primeiro campo com problema, na ordem da tela. Nos dias, vai para a segunda-feira;
   * na jornada longa sem nenhum intervalo, para "Adicionar intervalo".
   */
  private focusFirstInvalid(): void {
    const { name, days, start, end, breaks } = this.editor;
    const hasErrors = (field: FieldTree<unknown>) => field().errors().length > 0;
    const controls: FieldTree<unknown>[] = [
      name,
      start,
      end,
      ...[...breaks].flatMap((item) => [item.label, item.start, item.end]),
    ];
    if (hasErrors(name)) name().focusBoundControl();
    else if (hasErrors(days)) days[1]().focusBoundControl();
    else if (controls.some(hasErrors)) controls.find(hasErrors)!().focusBoundControl();
    else if (hasErrors(breaks)) this.hoursSection()?.focusAddBreak();
  }
}
