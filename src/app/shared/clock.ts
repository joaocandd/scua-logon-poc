// Relógio do app. Normalmente é o relógio do computador. Na apresentação, o relógio de
// demonstração (`?relogio=2026-11-24T17:40`) põe o app num dia útil escolhido: a API simulada, o
// motor de regras, a série fictícia e os textos "há X s" passam a ler este relógio, e o tempo anda
// normalmente a partir do instante escolhido.
//
// O relógio de demonstração fica guardado na sessão do navegador (sessionStorage): vale em todas
// as telas e ao recarregar a aba, até alguém clicar em "Desligar" ou fechar a aba.

import { signal } from '@angular/core';
import { toInstant } from './date';

/** Parâmetro da URL que liga o relógio de demonstração. */
export const DEMO_CLOCK_PARAM = 'relogio';
/** Chave na sessão do navegador. */
export const DEMO_CLOCK_STORAGE_KEY = 'scua-relogio-demo';

/** Relógio de demonstração ligado: o instante escolhido e quando ele foi ligado. */
export interface DemoClockState {
  /** Valor do parâmetro, "AAAA-MM-DDTHH:mm" no relógio de São Paulo. */
  value: string;
  /** Instante escolhido, em milissegundos. */
  start: number;
  /** Instante real (do computador) em que o relógio foi ligado, em milissegundos. */
  activatedAt: number;
}

let offsetMs = 0;
const state = signal<DemoClockState | null>(null);

/** Relógio de demonstração ligado agora, ou nulo. */
export const demoClock = state.asReadonly();

/** Agora, em milissegundos: o relógio do computador, ou o de demonstração. */
export function now(): number {
  return Date.now() + offsetMs;
}

/** Agora, como Date. */
export function nowDate(): Date {
  return new Date(now());
}

/**
 * "2026-11-24T17:40" (relógio de São Paulo) → instante em milissegundos. Nulo se o texto não for uma
 * data e hora válidas.
 */
export function parseDemoClock(value: string | null): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  // Data que não existe (31/11) vira outro dia no Date: confere a volta.
  const check = new Date(`${date}T00:00:00Z`);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month) return null;
  if (check.getUTCDate() !== day) return null;
  return Date.parse(toInstant(date, hours * 60 + minutes));
}

/**
 * Liga o relógio de demonstração a partir da URL ou da sessão. Chamado uma vez, antes de o app
 * começar (main.ts):
 * - com `?relogio=` válido e diferente do guardado, liga a partir de agora;
 * - com o mesmo valor (recarregar a aba) ou sem o parâmetro, continua o que estava guardado;
 * - sem nada, o relógio é o do computador.
 */
export function startDemoClock(
  search: string,
  storage: Storage | null,
  realNow = Date.now(),
): void {
  const value = new URLSearchParams(search).get(DEMO_CLOCK_PARAM);
  const stored = readStored(storage);
  const start = parseDemoClock(value);
  let next: DemoClockState | null = stored;
  if (value !== null && start !== null && value !== stored?.value) {
    next = { value: value!, start, activatedAt: realNow };
    write(storage, next);
  }
  apply(next);
}

/** "Desligar": volta ao relógio do computador e esquece o da sessão. */
export function stopDemoClock(storage: Storage | null): void {
  try {
    storage?.removeItem(DEMO_CLOCK_STORAGE_KEY);
  } catch {
    // Sem armazenamento, o relógio já vale só até recarregar.
  }
  apply(null);
}

function apply(next: DemoClockState | null): void {
  offsetMs = next ? next.start - next.activatedAt : 0;
  state.set(next);
}

function readStored(storage: Storage | null): DemoClockState | null {
  try {
    const raw = storage?.getItem(DEMO_CLOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoClockState>;
    const ok =
      typeof parsed.value === 'string' &&
      typeof parsed.start === 'number' &&
      typeof parsed.activatedAt === 'number';
    return ok ? (parsed as DemoClockState) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | null, next: DemoClockState): void {
  try {
    storage?.setItem(DEMO_CLOCK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Com o armazenamento bloqueado, o relógio vale só nesta página.
  }
}
