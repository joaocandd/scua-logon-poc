import { HttpErrorResponse } from '@angular/common/http';

/** Quando não há resposta do servidor, ou ela não traz uma mensagem para a tela. */
export const SERVER_DOWN_MESSAGE =
  'Não conseguimos falar com o servidor. Tente de novo em instantes.';

/**
 * Mensagem de um erro da API para mostrar na tela. A API responde erros como { message } em
 * português, escrita para pessoas (ADR 0005). Qualquer outra coisa vira a mensagem padrão: a tela
 * nunca mostra código HTTP, JSON nem detalhe técnico.
 */
export function apiErrorMessage(error: unknown, fallback = SERVER_DOWN_MESSAGE): string {
  const message = error instanceof HttpErrorResponse ? error.error?.message : undefined;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

/** Status HTTP do erro, ou nulo se não veio da API. */
export function apiErrorStatus(error: unknown): number | null {
  return error instanceof HttpErrorResponse ? error.status : null;
}
