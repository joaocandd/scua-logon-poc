import { csvNumber, downloadCsv, toCsv } from './csv';

describe('CSV', () => {
  it('ponto e vírgula entre colunas e aspas só quando precisa', () => {
    expect(
      toCsv(
        ['Dia', 'Resumo'],
        [
          ['2026-11-12', 'Marina aprovou; pedido "urgente"'],
          ['2026-11-13', 12],
        ],
      ),
    ).toBe('Dia;Resumo\r\n2026-11-12;"Marina aprovou; pedido ""urgente"""\r\n2026-11-13;12');
  });

  it('vírgula nos decimais', () => {
    expect(csvNumber(2.5, 1)).toBe('2,5');
    expect(csvNumber(1234)).toBe('1234');
  });

  it('baixa o arquivo com o nome pedido', () => {
    const created: Blob[] = [];
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = (blob: Blob) => {
      created.push(blob);
      return 'blob:teste';
    };
    URL.revokeObjectURL = () => undefined;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    try {
      downloadCsv(document, 'horas-extras.csv', 'Dia;Horas');
      expect(click).toHaveBeenCalledOnce();
      expect(created[0].type).toBe('text/csv;charset=utf-8');
      expect(document.querySelector('a[download]')).toBeNull();
    } finally {
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
      click.mockRestore();
    }
  });
});
