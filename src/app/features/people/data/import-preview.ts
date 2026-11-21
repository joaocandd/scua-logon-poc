// Importar colaboradores (substitui a "Carga de Dados" do console atual). SIMULADO: nada é lido do
// computador da pessoa nem gravado. O arquivo de exemplo tem 5 linhas, 2 com erro, para mostrar a
// prévia com validação. Funções puras.

import { Group } from '../../../shared/models';
import { normalize } from '../../../shared/text';

/** Uma linha da planilha, como veio do arquivo. */
export interface ImportRow {
  name: string;
  email: string;
  registration: string;
  jobTitle: string;
  /** Nome do grupo, como a pessoa escreveu na planilha. */
  group: string;
}

/** Linha na prévia: pronta para importar ou com o erro explicado. */
export interface ImportPreviewRow extends ImportRow {
  /** Número da linha na planilha (a 1 é o cabeçalho). */
  line: number;
  /** O que está errado e o que fazer. Nulo: pronta para importar. */
  error: string | null;
}

export const SAMPLE_FILE_NAME = 'colaboradores-exemplo.csv';

/** O arquivo de exemplo. Nomes inventados; e-mails no domínio reservado .example. */
export const SAMPLE_ROWS: readonly ImportRow[] = [
  {
    name: 'Clara Mendonça',
    email: 'clara.mendonca@empresa.example',
    registration: '21517',
    jobTitle: 'Analista financeira',
    group: 'Financeiro',
  },
  {
    name: 'Otávio Rezende',
    email: 'otavio.rezende@empresa',
    registration: '21554',
    jobTitle: 'Executivo de contas',
    group: 'Comercial',
  },
  {
    name: 'Helena Brandão',
    email: 'helena.brandao@empresa.example',
    registration: '21591',
    jobTitle: 'Atendente',
    group: 'Atendimento',
  },
  {
    name: 'Bruno Takahashi',
    email: 'bruno.takahashi@empresa.example',
    registration: '21628',
    jobTitle: 'Analista de logística',
    group: 'Logística',
  },
  {
    name: 'Lívia Prates',
    email: 'livia.prates@empresa.example',
    registration: '21665',
    jobTitle: 'Desenvolvedora',
    group: 'TI',
  },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida cada linha: e-mail no formato certo e grupo que existe (sem acento e sem maiúscula). */
export function previewRows(
  rows: readonly ImportRow[],
  groups: readonly Group[],
): ImportPreviewRow[] {
  const groupNames = new Set(groups.map((g) => normalize(g.name)));
  return rows.map((row, i) => {
    let error: string | null = null;
    if (!EMAIL.test(row.email)) {
      error = `E-mail inválido: “${row.email}”. Use o formato nome@empresa.example.`;
    } else if (!groupNames.has(normalize(row.group))) {
      error = `O grupo “${row.group}” não existe. Corrija na planilha ou crie o grupo antes.`;
    }
    return { ...row, line: i + 2, error };
  });
}

/** "Importar 1 colaborador", "Importar 3 colaboradores". */
export function importLabel(count: number): string {
  return `Importar ${count} ${count === 1 ? 'colaborador' : 'colaboradores'}`;
}
