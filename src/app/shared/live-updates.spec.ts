import { updatedLabel } from './live-updates';

describe('updatedLabel', () => {
  const at = Date.parse('2026-11-12T18:00:00-03:00');
  const after = (seconds: number) => updatedLabel(at, at + seconds * 1000);

  it('agora, em segundos e em minutos', () => {
    expect(after(0)).toBe('Atualizado agora');
    expect(after(4)).toBe('Atualizado agora');
    expect(after(12)).toBe('Atualizado há 12 s');
    expect(after(59)).toBe('Atualizado há 59 s');
    expect(after(60)).toBe('Atualizado há 1 min');
    expect(after(185)).toBe('Atualizado há 3 min');
  });

  it('relógio um pouco atrás não dá tempo negativo', () => {
    expect(after(-2)).toBe('Atualizado agora');
  });
});
