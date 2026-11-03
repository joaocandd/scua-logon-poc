// Campo "Custo médio da hora extra" em /configuracoes. Função pura: o formulário e o teste usam a
// mesma conferência.

import { parseMoney } from '../../../shared/money';

/** O que há de errado no valor digitado. Vazio fica para o `required` do formulário. */
export function overtimeCostError(text: string): string | null {
  if (!text.trim()) return null;
  const value = parseMoney(text);
  if (value === null) return 'Use só números, com vírgula nos centavos, como 45,50.';
  if (value <= 0) return 'O custo precisa ser maior que zero.';
  return null;
}
