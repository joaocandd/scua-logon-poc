// Datas e instantes no fuso da empresa (America/Sao_Paulo). Horários do dia ficam no time.ts.
// Só usa métodos UTC do Date e o Intl com fuso explícito: o resultado não muda com o fuso da
// máquina (o CI roda em UTC).

import { Weekday } from './models';

export const TIME_ZONE = 'America/Sao_Paulo';

const MINUTE = 60_000;

const clock = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Instante visto no relógio de São Paulo. */
export interface LocalDateTime {
  /** "AAAA-MM-DD". */
  date: string;
  /** Minutos desde a meia-noite, de 0 a 1439. */
  minutes: number;
}

/** "2026-11-12T21:30:00Z" → { date: "2026-11-12", minutes: 1110 } (18h30 em São Paulo). */
export function toLocal(instant: Date | string | number): LocalDateTime {
  const parts = clock.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

/**
 * Instante (ISO 8601, em UTC) de um horário de São Paulo. `minutes` conta da meia-noite de `date`
 * e pode passar de 1440 para cair no dia seguinte: ("2026-11-12", 1440 + 360) é 6h do dia 13.
 */
export function toInstant(date: string, minutes: number): string {
  const wall = dayStart(date) + minutes * MINUTE;
  // O fuso é a diferença entre o relógio local e o UTC. A segunda volta corrige o caso raro em
  // que o palpite cai do outro lado de uma mudança de horário.
  let instant = wall;
  for (let i = 0; i < 2; i++) instant = wall - localWall(instant) + instant;
  return new Date(instant).toISOString();
}

/** "2026-11-12" + 3 → "2026-11-15". */
export function addDays(date: string, days: number): string {
  return new Date(dayStart(date) + days * 24 * 60 * MINUTE).toISOString().slice(0, 10);
}

/** "2026-11-12" → 4 (quinta-feira). */
export function weekdayOf(date: string): Weekday {
  return new Date(dayStart(date)).getUTCDay() as Weekday;
}

/** Meia-noite da data, como se fosse UTC. Serve só para contas de calendário. */
function dayStart(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Relógio de São Paulo no instante, em milissegundos como se fosse UTC. */
function localWall(instant: number): number {
  const { date, minutes } = toLocal(instant);
  return dayStart(date) + minutes * MINUTE;
}
