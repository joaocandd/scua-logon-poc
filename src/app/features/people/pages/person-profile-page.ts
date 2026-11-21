import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  BarChart,
  Button,
  ChartFormat,
  formatNumber,
  Icon,
  Skeleton,
  StatusBadge,
  WorkdayTimeline,
} from '../../../design-system';
import { toTime } from '../../../shared/time';
import { toLocal } from '../../../shared/date';
import { injectNow } from '../../../shared/now';
import { appliesTo } from '../../../shared/schedule-engine';
import { ExtensionRequests } from '../../approvals/data/extension-requests';
import { ActivityLog } from '../../reports/data/activity-log';
import { loadState } from '../../schedules/data/load-state';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { WorkstationDirectory } from '../../workstations/data/workstation-directory';
import { workstationRows } from '../../workstations/data/workstation-list';
import { EmployeeOvertime } from '../data/employee-overtime';
import { People } from '../data/people';
import { hoursLabel, initialsOf } from '../data/people-list';
import {
  formatFullDate,
  overtimeByDay,
  overtimeTotal,
  recentEvents,
  recentRequests,
  todayTimeline,
} from '../data/person-profile';
import { PersonAvatar } from '../ui/person-avatar';

/**
 * Perfil do colaborador (/pessoas/:id), só leitura: cadastro (cargo, matrícula, e-mail, grupo,
 * gestor e admissão), a estação agora com o motivo, a jornada de hoje, as horas extras dos últimos
 * 30 dias, os pedidos de extensão recentes e os últimos eventos da auditoria.
 *
 * É rota filha de Pessoas, como o detalhe de /aprovacoes: no celular, ocupa a página no lugar da
 * lista; no desktop, fica num painel ao lado dela. Ao abrir (ou trocar de pessoa), o foco vai
 * para o nome no título.
 *
 * Os dados da lista (pessoas, grupos, regras, estações, horas extras) já estão carregados pela
 * página de Pessoas, que mostra o erro deles. Os pedidos e a auditoria são buscados aqui e cada
 * seção mostra o próprio erro, sem derrubar o resto do perfil.
 */
@Component({
  selector: 'app-person-profile-page',
  imports: [
    BarChart,
    Button,
    Icon,
    PersonAvatar,
    RouterLink,
    Skeleton,
    StatusBadge,
    WorkdayTimeline,
  ],
  templateUrl: './person-profile-page.html',
  styleUrl: './person-profile-page.scss',
})
export class PersonProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);
  private readonly directory = inject(WorkstationDirectory);
  private readonly overtime = inject(EmployeeOvertime);
  protected readonly requests = inject(ExtensionRequests);
  protected readonly activity = inject(ActivityLog);
  private readonly injector = inject(Injector);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  private readonly now = injectNow(30_000);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  /** O que o cabeçalho e o cadastro precisam. Os pedidos e a auditoria vêm por seção. */
  private readonly resources = [
    this.people.employees,
    this.people.groups,
    this.schedules.list,
    this.schedules.holidays,
    this.schedules.exceptions,
    this.directory.list,
  ];
  protected readonly loading = computed(() => loadState(this.resources) === 'loading');

  protected readonly employee = computed(
    () => this.people.employeeById().get(this.id() ?? '') ?? null,
  );
  protected readonly initials = computed(() => initialsOf(this.employee()?.name ?? ''));
  protected readonly group = computed(() => {
    const employee = this.employee();
    return employee ? (this.people.groupById().get(employee.groupId) ?? null) : null;
  });
  protected readonly manager = computed(() => {
    const id = this.employee()?.managerId;
    return id ? (this.people.employeeById().get(id) ?? null) : null;
  });
  protected readonly hiredOn = computed(() => {
    const date = this.employee()?.hiredOn;
    return date ? formatFullDate(date) : null;
  });

  private readonly scheduleList = computed(() =>
    this.schedules.list.hasValue() ? this.schedules.list.value() : [],
  );
  /** A regra ativa vem antes da que está em observação, como na API. */
  protected readonly schedule = computed(() => {
    const employee = this.employee();
    if (!employee) return undefined;
    const rules = this.scheduleList().filter((s) => appliesTo(s, employee));
    return rules.find((s) => !s.observationMode) ?? rules[0];
  });
  protected readonly station = computed(() => {
    const employee = this.employee();
    if (!employee) return null;
    const stations = (this.directory.list.hasValue() ? this.directory.list.value() : []).filter(
      (s) => s.employeeId === employee.id,
    );
    const rows = workstationRows(
      stations,
      this.people.employeeById(),
      this.people.groupById(),
      this.scheduleList(),
    );
    return rows[0] ?? null;
  });

  private readonly allRequests = computed(() =>
    this.requests.list.hasValue() ? this.requests.list.value() : [],
  );
  protected readonly timeline = computed(() => {
    const employee = this.employee();
    if (!employee) return null;
    return todayTimeline(
      employee.name,
      this.schedule(),
      (this.schedules.exceptions.hasValue() ? this.schedules.exceptions.value() : []).filter(
        (e) => e.employeeId === employee.id,
      ),
      this.schedules.holidays.hasValue() ? this.schedules.holidays.value() : [],
      this.allRequests().filter((r) => r.employeeId === employee.id),
      this.now(),
    );
  });
  protected readonly nowMarker = computed(() => toTime(toLocal(this.now()).minutes));

  private readonly overtimeRows = computed(() =>
    this.overtime.list.hasValue() ? this.overtime.list.value() : [],
  );
  protected readonly overtimeDays = computed(() =>
    overtimeByDay(this.overtimeRows(), this.id() ?? '', this.now()),
  );
  protected readonly overtimeTotal = computed(() =>
    hoursLabel(overtimeTotal(this.overtimeRows(), this.id() ?? '')),
  );
  protected readonly hours: ChartFormat = (value) => `${formatNumber(value)} h`;

  protected readonly recentRequests = computed(() =>
    recentRequests(this.allRequests(), this.id() ?? ''),
  );
  protected readonly recentEvents = computed(() =>
    recentEvents(
      this.activity.events.hasValue() ? this.activity.events.value() : [],
      this.id() ?? '',
    ),
  );

  constructor() {
    // A auditoria muda a cada decisão: o perfil abre com a lista de agora.
    if (this.activity.events.hasValue()) this.activity.events.reload();

    // No primeiro carregamento da página, o foco fica onde o navegador põe, como em qualquer site.
    let focusedId: string | null = inject(Router).navigated ? null : this.id();
    effect(() => {
      const id = this.id();
      if (this.loading() || id === focusedId) return;
      focusedId = id;
      afterNextRender(() => this.focusHeading(), { injector: this.injector });
    });
  }

  /**
   * Foco no nome. No celular, o perfil é uma página nova e começa do topo; no desktop, o painel
   * fica ao lado da lista, que não pode perder a posição de rolagem.
   */
  private focusHeading(): void {
    const mobile = !this.window?.matchMedia('(min-width: 64em)').matches;
    if (mobile) this.window?.scrollTo(0, 0);
    this.heading()?.nativeElement.focus({ preventScroll: mobile });
  }
}
