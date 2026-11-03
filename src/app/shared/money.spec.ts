import { formatMoney, parseMoney, toMoneyInput } from './money';

describe('formatMoney', () => {
  it('reais com centavos e separador de milhar', () => {
    expect(formatMoney(45)).toBe('R$ 45,00');
    expect(formatMoney(202.5)).toBe('R$ 202,50');
    expect(formatMoney(1234.567)).toBe('R$ 1.234,57');
  });

  it('valor do campo, sem o "R$"', () => {
    expect(toMoneyInput(45)).toBe('45,00');
    expect(toMoneyInput(1234.5)).toBe('1.234,50');
  });
});

describe('parseMoney', () => {
  it.each([
    ['45', 45],
    ['45,5', 45.5],
    ['45,50', 45.5],
    ['45.50', 45.5],
    ['R$ 45,00', 45],
    [' 45 ', 45],
    ['1.234,50', 1234.5],
    ['1.234', 1234],
    ['1234,5', 1234.5],
    ['0', 0],
  ])('"%s" → %d', (text, value) => {
    expect(parseMoney(text)).toBe(value);
  });

  it.each(['', 'abc', '45,505', '4,5,0', '-10', '1.23.4', '12.3456'])(
    '"%s" não dá para entender',
    (text) => {
      expect(parseMoney(text)).toBeNull();
    },
  );
});
