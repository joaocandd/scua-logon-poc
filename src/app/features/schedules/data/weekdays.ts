// Dias da semana nas regras de jornada: a ordem da interface (segunda primeiro) e o texto curto,
// como "Seg a sex". Os valores são os do Weekday (0 é domingo).

import { Weekday } from '../../../shared/models';
import { capitalize } from '../../../shared/text';

export interface WeekdayOption {
  value: Weekday;
  /** "seg", para textos como "Seg a sex". */
  short: string;
  /** "Segunda", para o rótulo que o leitor de tela lê. */
  name: string;
}

/** Dias na ordem em que a semana aparece na interface: segunda primeiro. */
export const WEEK: readonly WeekdayOption[] = [
  { value: 1, short: 'seg', name: 'Segunda' },
  { value: 2, short: 'ter', name: 'Terça' },
  { value: 3, short: 'qua', name: 'Quarta' },
  { value: 4, short: 'qui', name: 'Quinta' },
  { value: 5, short: 'sex', name: 'Sexta' },
  { value: 6, short: 'sáb', name: 'Sábado' },
  { value: 0, short: 'dom', name: 'Domingo' },
];

/**
 * Dias da regra em texto curto. Três ou mais dias seguidos viram faixa: [1, 2, 3, 4, 5] →
 * "Seg a sex"; [1, 3, 5] → "Seg, qua e sex"; [6, 0] → "Sáb e dom"; todos → "Todos os dias".
 */
export function formatWeekdays(weekdays: readonly Weekday[]): string {
  const chosen = WEEK.filter((day) => weekdays.includes(day.value));
  if (chosen.length === 0) return 'Nenhum dia';
  if (chosen.length === WEEK.length) return 'Todos os dias';

  const runs: WeekdayOption[][] = [];
  for (const day of chosen) {
    const run = runs.at(-1);
    const follows = run && WEEK.indexOf(day) === WEEK.indexOf(run.at(-1)!) + 1;
    if (follows) run.push(day);
    else runs.push([day]);
  }
  const parts = runs.flatMap((run) =>
    run.length >= 3 ? [`${run[0].short} a ${run.at(-1)!.short}`] : run.map((day) => day.short),
  );
  return capitalize(
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`,
  );
}
