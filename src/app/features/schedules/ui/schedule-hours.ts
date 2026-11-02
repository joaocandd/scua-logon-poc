import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Button, Field, FieldControl, Icon, WorkdayTimeline } from '../../../design-system';
import { Break } from '../../../shared/models';
import { fieldErrorMessage } from '../data/schedule-form';
import { DraftTimeline } from '../data/schedule-timeline';
import { breakName } from '../data/schedule-validation';

/**
 * Seção 2 do editor de regras: início, fim e intervalos, em campos de hora digitáveis. A linha do
 * tempo atualiza enquanto a pessoa digita, e os problemas de regra aparecem logo abaixo dela, na
 * hora (região viva educada). Os campos são a única entrada: a linha do tempo não é arrastável.
 *
 * Ao adicionar um intervalo, o foco vai para o nome dele; ao remover, para "Adicionar intervalo".
 */
@Component({
  selector: 'app-schedule-hours',
  imports: [Button, Field, FieldControl, FormField, Icon, WorkdayTimeline],
  templateUrl: './schedule-hours.html',
  styleUrl: './schedule-hours.scss',
})
export class ScheduleHours {
  readonly start = input.required<FieldTree<string>>();
  readonly end = input.required<FieldTree<string>>();
  readonly overnight = input.required<FieldTree<boolean>>();
  readonly breaks = input.required<FieldTree<Break[]>>();
  /** Erros de campo só depois do primeiro "Salvar regra" (ADR 0008). */
  readonly showErrors = input(false);
  /** Nula enquanto a jornada não tem início e fim certos. */
  readonly timeline = input<DraftTimeline | null>(null);
  readonly problems = input<readonly string[]>([]);

  private readonly injector = inject(Injector);
  // O #addBreak está num <button app-button>: sem o `read`, viria o componente Button.
  private readonly addButton = viewChild.required('addBreak', {
    read: ElementRef<HTMLButtonElement>,
  });

  protected readonly breakName = breakName;

  protected errorOf(field: FieldTree<unknown>): string | null {
    return this.showErrors() ? fieldErrorMessage(field) : null;
  }

  /** Foco em "Adicionar intervalo": a página chama ao salvar uma jornada sem intervalo. */
  focusAddBreak(): void {
    this.addButton().nativeElement.focus();
  }

  protected add(): void {
    const index = this.breaks()().value().length;
    this.breaks()().value.update((list) => [...list, { label: '', start: '', end: '' }]);
    afterNextRender(() => this.breaks()[index].label().focusBoundControl(), {
      injector: this.injector,
    });
  }

  protected remove(index: number): void {
    this.breaks()().value.update((list) => list.filter((_, i) => i !== index));
    afterNextRender(() => this.focusAddBreak(), { injector: this.injector });
  }
}
