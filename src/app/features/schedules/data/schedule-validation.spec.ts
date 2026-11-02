import { daysError, nameError } from './schedule-validation';

describe('nameError', () => {
  const others = ['Comercial', 'Flexível'];

  it.each(['', '   '])('pede um nome quando vem "%s"', (name) => {
    expect(nameError(name, others)).toBe('Dê um nome para a regra.');
  });

  it('não aceita o nome de outra regra, sem diferenciar acento e maiúscula', () => {
    expect(nameError('flexivel ', others)).toBe(
      'Já existe uma regra chamada Flexível. Escolha outro nome.',
    );
  });

  it('aceita um nome novo', () => {
    expect(nameError('Plantão', others)).toBeNull();
  });
});

describe('daysError', () => {
  it('pede ao menos um dia', () => {
    expect(daysError([false, false, false, false, false, false, false])).toBe(
      'Escolha ao menos um dia da semana.',
    );
    expect(daysError([false, false, false, false, false, false, true])).toBeNull();
  });
});
