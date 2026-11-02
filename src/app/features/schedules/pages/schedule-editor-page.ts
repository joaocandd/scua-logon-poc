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
import { People } from '../../people/data/people';
import { isRetrying, LoadState, loadState, retryFailed } from '../data/load-state';
import { assignmentConflicts, assignmentPreview, groupOptions } from '../data/schedule-assignment';
import { newScheduleDraft, ScheduleDraft, toDraft, toSchedule } from '../data/schedule-draft';
import { ScheduleFormContext, scheduleSchema } from '../data/schedule-form';
import { draftTimeline } from '../data/schedule-timeline';
import { checkHours } from '../data/schedule-validation';
import { warningPreview } from '../data/schedule-warnings';
import { WorkSchedules } from '../data/work-schedules';
import { ScheduleApproval } from '../ui/schedule-approval';
import { ScheduleAssignmentSection } from '../ui/schedule-assignment';
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
 * - de regra (horários, intervalos e conflito com outra regra ativa): na hora, na própria seção.
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
    ScheduleAssignmentSection,
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
  private readonly people = inject(People);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(Toast);
  private readonly injector = inject(Injector);
  private readonly hoursSection = viewChild(ScheduleHours);
  private readonly assignmentSection = viewChild(ScheduleAssignmentSection);

  /** Id da regra na URL. Nulo em /regras/nova. */
  protected readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  private readonly resources = [this.schedules.list, this.people.employees, this.people.groups];
  private readonly list = computed(() =>
    this.schedules.list.hasValue() ? this.schedules.list.value() : [],
  );
  private readonly employees = computed(() =>
    this.people.employees.hasValue() ? this.people.employees.value() : [],
  );
  /** As outras regras: não podem ter o mesmo nome nem as mesmas pessoas (se estiverem ativas). */
  private readonly others = computed(() => this.list().filter((s) => s.id !== this.id()));
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

  private readonly formContext: ScheduleFormContext = {
    otherSchedules: () => this.others(),
    employees: () => this.employees(),
  };

  protected readonly editor = form(this.draft, scheduleSchema(this.formContext), {
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
  });

  protected readonly showFieldErrors = signal(false);
  /** Erro que não é de um campo, como o servidor fora do ar ao salvar. */
  protected readonly formError = signal<string | null>(null);

  /** Horários conferidos a cada tecla: alimentam a linha do tempo e os problemas de regra. */
  private readonly hours = computed(() => checkHours(this.editor().value()));
  protected readonly timeline = computed(() => draftTimeline(this.hours()));
  protected readonly problems = computed(() => this.hours().problems.map((p) => p.message));
  protected readonly warnings = computed(() => warningPreview(this.editor().value(), this.hours()));

  /** A regra como ficaria salva agora, para as contas que pedem um WorkSchedule. */
  private readonly schedule = computed(() => toSchedule(this.editor().value(), this.id() ?? ''));
  protected readonly groupOptions = computed(() =>
    groupOptions(
      this.people.groups.hasValue() ? this.people.groups.value() : [],
      this.employees(),
      this.others(),
    ),
  );
  protected readonly assignment = computed(() =>
    assignmentPreview(this.schedule(), this.employees()),
  );
  protected readonly assignmentProblems = computed(() =>
    assignmentConflicts(this.schedule(), this.employees(), this.others()).map((p) => p.message),
  );

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
   * na jornada longa sem nenhum intervalo, para "Adicionar intervalo"; no conflito com outra
   * regra, para o primeiro grupo.
   */
  private focusFirstInvalid(): void {
    const { name, days, start, end, breaks, assignment } = this.editor;
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
    else if (hasErrors(assignment)) this.assignmentSection()?.focusGroups();
  }
}
