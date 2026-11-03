import { overtimeCostError } from './overtime-cost';

describe('overtimeCostError', () => {
  it.each(['45', '45,50', '1.234,50', 'R$ 45'])('"%s" vale', (text) => {
    expect(overtimeCostError(text)).toBeNull();
  });

  it('vazio fica para o "obrigatório" do formulário', () => {
    expect(overtimeCostError('  ')).toBeNull();
  });

  it('diz o que corrigir', () => {
    expect(overtimeCostError('quarenta')).toBe(
      'Use só números, com vírgula nos centavos, como 45,50.',
    );
    expect(overtimeCostError('0,00')).toBe('O custo precisa ser maior que zero.');
  });
});
