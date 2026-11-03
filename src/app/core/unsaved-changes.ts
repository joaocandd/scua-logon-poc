import { CanDeactivateFn } from '@angular/router';

/** Tela com alterações que podem se perder. `canLeave` pergunta à pessoa, se precisar. */
export interface LeaveConfirmation {
  canLeave(): boolean | Promise<boolean>;
}

/**
 * Antes de sair de uma tela com alteração não salva, pergunta se a pessoa quer mesmo sair (a
 * tela abre o ConfirmDialog). Vale para a navegação dentro do app; fechar a aba não passa por
 * aqui.
 */
export const confirmLeave: CanDeactivateFn<LeaveConfirmation> = (component) => component.canLeave();
