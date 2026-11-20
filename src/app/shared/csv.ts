// "Exportar CSV" dos relatórios e da auditoria. Formato que o Excel em português abre direto:
// ponto e vírgula entre as colunas, vírgula nos decimais e BOM no começo para os acentos.

export type CsvCell = string | number;

/** Texto do CSV: cabeçalho e linhas. Campo com ; " ou quebra de linha vai entre aspas. */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  return [header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
}

/** Número com vírgula decimal, sem separador de milhar: 1234,5. */
export function csvNumber(value: number, decimals = 0): string {
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Baixa o texto como arquivo .csv, sem servidor: cria um link temporário para um Blob. O BOM faz
 * o Excel ler o arquivo como UTF-8.
 */
export function downloadCsv(document: Document, filename: string, content: string): void {
  const view = document.defaultView;
  if (!view?.URL.createObjectURL) return;
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' });
  const url = view.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador já começou o download: o endereço do Blob pode sair da memória.
  view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
}

function cell(value: CsvCell): string {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
