// Validações do editor de regras de jornada. Funções puras: recebem o rascunho e devolvem a
// mensagem em português, ou nulo quando está tudo certo. O esquema do formulário
// (schedule-form.ts) liga cada uma ao campo certo.

import { normalize } from '../../../shared/text';

/** Nome vazio, ou igual ao de outra regra (sem diferenciar acento e maiúscula). */
export function nameError(name: string, otherNames: readonly string[]): string | null {
  const wanted = normalize(name);
  if (!wanted) return 'Dê um nome para a regra.';
  const same = otherNames.find((other) => normalize(other) === wanted);
  return same ? `Já existe uma regra chamada ${same}. Escolha outro nome.` : null;
}

/** Ao menos um dia marcado. */
export function daysError(days: readonly boolean[]): string | null {
  return days.some(Boolean) ? null : 'Escolha ao menos um dia da semana.';
}
