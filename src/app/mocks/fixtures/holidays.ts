import { Holiday } from '../../shared/models';

// Feriados nacionais de 2026. Carnaval e Corpus Christi são ponto facultativo e ficam de fora:
// o RH acrescenta se a empresa folgar.
export const HOLIDAYS: readonly Holiday[] = [
  { date: '2026-01-01', name: 'Confraternização Universal' },
  { date: '2026-04-03', name: 'Paixão de Cristo' },
  { date: '2026-04-21', name: 'Tiradentes' },
  { date: '2026-05-01', name: 'Dia do Trabalho' },
  { date: '2026-09-07', name: 'Independência do Brasil' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2026-11-02', name: 'Finados' },
  { date: '2026-11-15', name: 'Proclamação da República' },
  { date: '2026-11-20', name: 'Dia Nacional de Zumbi e da Consciência Negra' },
  { date: '2026-12-25', name: 'Natal' },
];
