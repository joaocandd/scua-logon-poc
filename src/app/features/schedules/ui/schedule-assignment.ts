import { Component, computed, ElementRef, input, viewChild } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { Icon } from '../../../design-system';
import { ScheduleAssignment } from '../../../shared/models';
import { AssignmentPreview, GroupOption } from '../data/schedule-assignment';

/**
 * Seção 5 do editor de regras: a quem a regra se aplica. Grupos marcados, a prévia "Esta regra vai
 * valer para 37 colaboradores de 3 grupos" e, numa lista que abre e fecha, as pessoas dos grupos:
 * desmarcar deixa a pessoa de fora. O conflito com outra regra ativa aparece na hora, aqui mesmo.
 *
 * As caixas ligam e desligam ids nas listas da regra (`groupIds` e `excludedEmployeeIds`), por isso
 * a ligação é feita à mão, sem o `[formField]`, como nos avisos.
 */
@Component({
  selector: 'app-schedule-assignment',
  imports: [Icon],
  templateUrl: './schedule-assignment.html',
  styleUrl: './schedule-assignment.scss',
})
export class ScheduleAssignmentSection {
  readonly assignment = input.required<FieldTree<ScheduleAssignment>>();
  readonly groups = input.required<readonly GroupOption[]>();
  readonly preview = input.required<AssignmentPreview>();
  readonly problems = input<readonly string[]>([]);

  private readonly groupList = viewChild.required<ElementRef<HTMLElement>>('groupList');

  private readonly value = computed(() => this.assignment()().value());
  protected readonly selected = computed(() => new Set(this.value().groupIds));
  protected readonly excluded = computed(() => new Set(this.value().excludedEmployeeIds));
  /** Grupos marcados, para a lista de pessoas. */
  protected readonly chosenGroups = computed(() =>
    this.groups().filter((option) => this.selected().has(option.group.id)),
  );
  protected readonly peopleCount = computed(() =>
    this.chosenGroups().reduce((sum, option) => sum + option.employees.length, 0),
  );
  protected readonly excludedNames = computed(() =>
    this.preview()
      .excluded.map((e) => e.name)
      .join(', '),
  );

  /** Foco no primeiro grupo marcado: a página chama ao salvar com conflito entre regras. */
  focusGroups(): void {
    const list = this.groupList().nativeElement;
    (list.querySelector<HTMLInputElement>('input:checked') ?? list.querySelector('input'))?.focus();
  }

  protected toggleGroup(id: string, checked: boolean): void {
    this.assignment()().value.update((a) => ({
      ...a,
      groupIds: checked ? [...a.groupIds, id] : a.groupIds.filter((g) => g !== id),
    }));
  }

  /** Marcado: a regra vale para a pessoa. Desmarcado: ela fica de fora. */
  protected toggleEmployee(id: string, included: boolean): void {
    this.assignment()().value.update((a) => ({
      ...a,
      excludedEmployeeIds: included
        ? a.excludedEmployeeIds.filter((e) => e !== id)
        : [...a.excludedEmployeeIds, id],
    }));
  }
}
