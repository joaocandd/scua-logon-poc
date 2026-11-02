import { capitalize, normalize } from './text';

describe('normalize', () => {
  it('tira acento, maiúscula e espaço nas pontas', () => {
    expect(normalize('  Configurações ')).toBe('configuracoes');
    expect(normalize('Flexível')).toBe(normalize('FLEXIVEL'));
  });
});

describe('capitalize', () => {
  it('põe só a primeira letra em maiúscula', () => {
    expect(capitalize('das 8h às 17h')).toBe('Das 8h às 17h');
    expect(capitalize('')).toBe('');
  });
});
