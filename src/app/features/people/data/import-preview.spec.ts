import { Group } from '../../../shared/models';
import { importLabel, previewRows, SAMPLE_ROWS } from './import-preview';

const GROUPS = ['Financeiro', 'Comercial', 'Atendimento', 'Operações', 'TI', 'RH'].map(
  (name, i): Group => ({ id: `grp-${i}`, name, approverIds: [] }),
);

describe('prévia da importação', () => {
  const rows = previewRows(SAMPLE_ROWS, GROUPS);

  it('o arquivo de exemplo tem 5 linhas: 3 prontas e 2 com o erro explicado', () => {
    expect(rows.map((r) => r.line)).toEqual([2, 3, 4, 5, 6]);
    expect(rows.filter((r) => !r.error).map((r) => r.name)).toEqual([
      'Clara Mendonça',
      'Helena Brandão',
      'Lívia Prates',
    ]);
    expect(rows[1].error).toBe(
      'E-mail inválido: “otavio.rezende@empresa”. Use o formato nome@empresa.example.',
    );
    expect(rows[3].error).toBe(
      'O grupo “Logística” não existe. Corrija na planilha ou crie o grupo antes.',
    );
  });

  it('o grupo é conferido sem acento e sem maiúscula', () => {
    const [row] = previewRows([{ ...SAMPLE_ROWS[0], group: 'operacoes' }], GROUPS);
    expect(row.error).toBeNull();
  });

  it('o botão diz quantos entram', () => {
    expect(importLabel(1)).toBe('Importar 1 colaborador');
    expect(importLabel(3)).toBe('Importar 3 colaboradores');
  });
});
