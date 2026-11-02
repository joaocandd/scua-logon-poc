// Validações do editor de regras de jornada. Funções puras: recebem o rascunho e devolvem a
// mensagem em português. O esquema do formulário (schedule-form.ts) liga cada uma ao campo certo.
//
// Dois tipos (ADR 0011):
// - erros de campo (nome, dias): aparecem depois do primeiro "Salvar regra" (ADR 0008);
// - problemas de regra (horários e intervalos): aparecem na hora, junto da linha do tempo,
//   assim que os dois horários do item estiverem preenchidos.
//
// Os horários seguem o schedule-engine: a jornada pertence ao dia em que começa e todo horário
// que não vem depois do início é do dia seguinte (afterStart).

import { Break } from '../../../shared/models';
import { afterStart } from '../../../shared/schedule-engine';
import { normalize } from '../../../shared/text';
import { formatClock, formatDuration, formatSpan, toMinutes } from '../../../shared/time';
import { ScheduleDraft } from './schedule-draft';

/**
 * Intervalo mínimo pela duração do trabalho (CLT art. 71): acima de 6 h, um intervalo de 1 h;
 * acima de 4 h, de 15 min (§1º). É um intervalo só: duas pausas de 30 min não fazem 1 h.
 * Acordo coletivo pode reduzir o de 1 h para 30 min (art. 611-A, III); fica para quando a regra
 * tiver essa configuração.
 */
export const REST_BREAK_RULES = [
  { workOver: 6 * 60, minBreak: 60, label: '1 h', law: 'CLT art. 71' },
  { workOver: 4 * 60, minBreak: 15, label: '15 min', law: 'CLT art. 71, §1º' },
] as const;

/** Nome vazio, ou igual ao de outra regra (sem diferenciar acento e maiúscula). */
export function nameError(name: string, otherNames: readonly string[]): string | null {
  const wanted = normalize(name);
  if (!wanted) return 'Dê um nome para a regra.';
  const same = otherNames.find((other) => normalize(other) === wanted);
  return same ? `Já existe uma regra chamada ${same}. Escolha outro nome.` : null;
}

/** Ao menos um dia marcado. */
export function daysError(days: readonly boolean[]): string | null {
  return days.some(Boolean) ? null : 'Escolha ao menos um dia da semana.';
}

/** Trecho em minutos desde a meia-noite do dia em que a jornada começa. Passa de 1440 depois da meia-noite. */
export interface Span {
  start: number;
  end: number;
}

/** Intervalo que está certo: dentro da jornada e sem sobrepor outro. */
export interface BreakSpan extends Span {
  index: number;
  label: string;
}

/** Campo que recebe o foco quando a pessoa tenta salvar com o problema. */
export type ProblemTarget =
  { field: 'end' } | { field: 'breaks' } | { field: 'breakStart' | 'breakEnd'; index: number };

export interface RuleProblem {
  message: string;
  target: ProblemTarget;
}

/** Horários do rascunho já conferidos. A linha do tempo e o resumo usam só o que está certo. */
export interface HoursCheck {
  /** Jornada. Nula com horário vazio, incompleto ou com problema. */
  shift: Span | null;
  /** Intervalos certos, na ordem do formulário. */
  breaks: BreakSpan[];
  problems: RuleProblem[];
}

/** Confere a jornada e os intervalos do rascunho. */
export function checkHours(draft: ScheduleDraft): HoursCheck {
  const start = minutesOf(draft.start);
  const end = minutesOf(draft.end);
  if (start === null || end === null) return { shift: null, breaks: [], problems: [] };

  const shiftMessage = shiftProblem(start, end, draft.overnight);
  if (shiftMessage) {
    return {
      shift: null,
      breaks: [],
      problems: [{ message: shiftMessage, target: { field: 'end' } }],
    };
  }

  const shift = { start, end: afterStart(start, draft.end) };
  const breaks: BreakSpan[] = [];
  const problems: RuleProblem[] = [];
  draft.breaks.forEach((item, index) => {
    // Falta um dos horários: ainda não dá para conferir.
    if (minutesOf(item.start) === null || minutesOf(item.end) === null) return;
    const problem = breakProblem(item, index, shift, breaks);
    if (problem) problems.push(problem);
    else breaks.push(spanOf(item, index, shift));
  });

  const rest = restProblem(shift, breaks);
  if (rest) problems.push(rest);
  return { shift, breaks, problems };
}

/** Problemas de regra do rascunho, na ordem da tela. */
export function ruleProblems(draft: ScheduleDraft): RuleProblem[] {
  return checkHours(draft).problems;
}

/** Nome do intervalo para as mensagens: o que a pessoa escreveu, ou "Intervalo 2". */
export function breakName(item: Break, index: number): string {
  return item.label.trim() || `Intervalo ${index + 1}`;
}

/** Fim antes do início sem marcar a meia-noite, ou o contrário. */
function shiftProblem(start: number, end: number, overnight: boolean): string | null {
  if (end === start) {
    return `O fim é igual ao início (${formatClock(start)}). Corrija um dos dois.`;
  }
  if (!overnight && end < start) {
    return `O fim (${formatClock(end)}) vem antes do início (${formatClock(start)}). Corrija o fim ou marque “Atravessa a meia-noite”.`;
  }
  if (overnight && end > start) {
    return `Das ${formatClock(start)} às ${formatClock(end)}, a jornada não atravessa a meia-noite. Desmarque “Atravessa a meia-noite” ou corrija o fim.`;
  }
  return null;
}

/** Problema do intervalo: fora da jornada, termina antes de começar ou sobrepõe um anterior. */
function breakProblem(
  item: Break,
  index: number,
  shift: Span,
  previous: readonly BreakSpan[],
): RuleProblem | null {
  const start = toMinutes(item.start);
  const end = toMinutes(item.end);
  const name = breakName(item, index);
  const span = spanOf(item, index, shift);
  const outside = {
    message: `${name} (${formatSpan(start, end)}) precisa ficar dentro da jornada (${formatSpan(shift.start, shift.end)}).`,
    target: { field: 'breakStart', index },
  } as const;
  // O início que não vem depois do início da jornada já é do dia seguinte (afterStart).
  if (span.start >= shift.end) return outside;
  if (span.end <= span.start) {
    return {
      message:
        end === start
          ? `${name} começa e termina no mesmo horário (${formatClock(start)}).`
          : `${name} termina (${formatClock(end)}) antes de começar (${formatClock(start)}).`,
      target: { field: 'breakEnd', index },
    };
  }
  if (span.end > shift.end) return outside;

  const other = previous.find((b) => b.start < span.end && span.start < b.end);
  if (other) {
    return {
      message: `${name} (${formatSpan(span.start, span.end)}) e ${other.label} (${formatSpan(other.start, other.end)}) se sobrepõem. Ajuste um dos dois.`,
      target: { field: 'breakStart', index },
    };
  }
  return null;
}

/** Intervalo mínimo da CLT pela duração do trabalho (jornada menos os intervalos certos). */
function restProblem(shift: Span, breaks: readonly BreakSpan[]): RuleProblem | null {
  const duration = (span: Span) => span.end - span.start;
  const work = duration(shift) - breaks.reduce((total, b) => total + duration(b), 0);
  const rule = REST_BREAK_RULES.find((r) => work > r.workOver);
  const longest = breaks.reduce<BreakSpan | null>(
    (max, b) => (!max || duration(b) > duration(max) ? b : max),
    null,
  );
  if (!rule || (longest && duration(longest) >= rule.minBreak)) return null;

  const needs = `Com ${formatDuration(work)} de trabalho, a jornada precisa de um intervalo de pelo menos ${rule.label} (${rule.law}).`;
  return longest
    ? {
        message: `${needs} O maior intervalo tem ${formatDuration(duration(longest))}.`,
        target: { field: 'breakEnd', index: longest.index },
      }
    : { message: `${needs} Adicione um intervalo.`, target: { field: 'breaks' } };
}

function spanOf(item: Break, index: number, shift: Span): BreakSpan {
  return {
    index,
    label: breakName(item, index),
    start: afterStart(shift.start, item.start),
    end: afterStart(shift.start, item.end),
  };
}

/** "08:30" → 510. Vazio ou incompleto → nulo. */
function minutesOf(time: string): number | null {
  try {
    return toMinutes(time);
  } catch {
    return null;
  }
}
