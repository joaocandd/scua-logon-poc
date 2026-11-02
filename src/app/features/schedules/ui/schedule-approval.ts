import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Approval } from '../data/schedule-draft';

/**
 * Seção 4 do editor de regras: quem aprova a hora extra. Dois rádios nativos (setas trocam a
 * opção), cada um com a explicação do que acontece com a estação.
 */
@Component({
  selector: 'app-schedule-approval',
  imports: [FormField],
  templateUrl: './schedule-approval.html',
  styleUrl: './schedule-approval.scss',
})
export class ScheduleApproval {
  readonly approval = input.required<FieldTree<Approval>>();
}
