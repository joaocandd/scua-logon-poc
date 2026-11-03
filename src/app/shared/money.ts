// Valores em reais na interface: "R$ 1.234,50". Funções puras.

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 → "R$ 1.234,50". */
export function formatMoney(value: number): string {
  return `R$ ${decimal.format(value)}`;
}

/** Valor para o campo de texto: 45 → "45,00", 1234.5 → "1.234,50". */
export function toMoneyInput(value: number): string {
  return decimal.format(value);
}

/**
 * O que a pessoa digitou, em reais: "45,50", "45.50", "1.234,50" e "R$ 45" valem. Ponto seguido
 * de três dígitos é separador de milhar ("1.234" é mil duzentos e trinta e quatro). Formato que
 * não dá para entender: nulo.
 */
export function parseMoney(text: string): number | null {
  const value = text.replace(/^R\$/i, '').trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) {
    return Number(value.replaceAll('.', '').replace(',', '.'));
  }
  if (/^\d+([,.]\d{1,2})?$/.test(value)) return Number(value.replace(',', '.'));
  return null;
}
