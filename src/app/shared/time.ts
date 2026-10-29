// Horários do dia em minutos desde a meia-noite (0 a 1440). Datas e fuso ficam em outro lugar:
// aqui só entram horários já convertidos para America/Sao_Paulo.

export const MINUTES_PER_DAY = 24 * 60;

/** "08:30" → 510. Aceita "24:00" como fim do dia. */
export function toMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  const total = hours * 60 + minutes;
  if (!match || minutes > 59 || total > MINUTES_PER_DAY) {
    throw new Error(`Horário inválido: "${time}". Use HH:mm, de 00:00 a 24:00.`);
  }
  return total;
}

/** Formato curto da interface: 480 → "8h", 1170 → "19h30", 1440 → "24h". */
export function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

/** "das 8h às 12h". 0h e 1h pedem singular: "da 0h à 1h30". */
export function formatRange(start: number, end: number): string {
  const singular = (minutes: number) => minutes < 2 * 60;
  return `${singular(start) ? 'da' : 'das'} ${formatClock(start)} ${singular(end) ? 'à' : 'às'} ${formatClock(end)}`;
}
