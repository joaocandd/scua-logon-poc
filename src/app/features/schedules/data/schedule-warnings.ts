// Avisos antes do bloqueio: as opções do editor, o texto curto ("15 e 5 min") e a prévia do aviso
// que o colaborador vê. Funções puras.

import { formatClock, MINUTES_PER_DAY } from '../../../shared/time';
import { ScheduleDraft } from './schedule-draft';
import { HoursCheck } from './schedule-validation';

/** Opções de aviso, em minutos antes do bloqueio. O padrão é 15 e 5 (CLAUDE.md). */
export const WARNING_OPTIONS = [60, 30, 15, 10, 5, 1] as const;

/** [5, 15] → "15 e 5 min"; [30, 15, 5] → "30, 15 e 5 min"; [] → "". Do maior para o menor. */
export function formatWarnings(minutes: readonly number[]): string {
  const sorted = [...minutes].sort((a, b) => b - a).map(String);
  if (sorted.length === 0) return '';
  const list =
    sorted.length === 1 ? sorted[0] : `${sorted.slice(0, -1).join(', ')} e ${sorted.at(-1)}`;
  return `${list} min`;
}

/** Aviso como o colaborador vê na tela, no primeiro aviso antes do fim da jornada. */
export interface WarningNotice {
  /** "Sua estação bloqueia às 17h". */
  title: string;
  /** "Faltam 15 min para o fim da jornada Comercial. ..." */
  body: string;
}

export interface WarningPreview {
  /** Nulo quando a regra não tem aviso. */
  notice: WarningNotice | null;
  /** Quando os avisos chegam: "Antes do intervalo Almoço (12h): às 11h45 e às 11h55." */
  times: string[];
}

/**
 * Prévia dos avisos com os horários do rascunho. A estação bloqueia no início de cada intervalo e
 * no fim da jornada; aviso que cairia antes do início da jornada não é mandado. Nula enquanto a
 * jornada não tem início e fim certos.
 */
export function warningPreview(draft: ScheduleDraft, check: HoursCheck): WarningPreview | null {
  const { shift, breaks } = check;
  if (!shift) return null;

  const minutes = [...draft.warningMinutes].sort((a, b) => b - a);
  const shiftName = draft.name.trim() ? `jornada ${draft.name.trim()}` : 'sua jornada';
  const blocks = [
    ...[...breaks]
      .sort((a, b) => a.start - b.start)
      .map((b) => ({ at: b.start, what: `do intervalo ${b.label}` })),
    { at: shift.end, what: 'do fim da jornada' },
  ];
  const times = blocks.flatMap(({ at, what }) => {
    const sent = minutes.map((m) => at - m).filter((time) => time > shift.start);
    if (sent.length === 0) return [];
    const list = sent.map((time) => `às ${clock(time)}`);
    const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} e ${list.at(-1)}`;
    return [`Antes ${what} (${clock(at)}): ${joined}.`];
  });

  const first = minutes[0];
  const notice =
    first === undefined
      ? null
      : {
          title: `Sua estação bloqueia às ${clock(shift.end)}`,
          body: `Faltam ${first} min para o fim da ${shiftName}. Salve o que estiver fazendo. Se precisar de mais tempo, peça uma extensão ao seu gestor.`,
        };
  return { notice, times };
}

/** Minutos de qualquer dia no relógio: 1800 (6h de amanhã) → "6h". */
function clock(minutes: number): string {
  return formatClock(((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY);
}
