// Detalhe do pedido na caixa de aprovações: marcador de "agora" e histórico. Funções puras. A
// linha do tempo do dia fica em shared/request-timeline.ts, que a API também usa.

import { formatDate, toLocal } from '../../../shared/date';
import { ActivityEvent } from '../../../shared/models';
import { formatClock, toTime } from '../../../shared/time';

/** Hora atual para o marcador "agora", se o pedido é de hoje. */
export function nowMarker(date: string, now: number): string | undefined {
  const local = toLocal(now);
  return local.date === date ? toTime(local.minutes) : undefined;
}

/** Item do histórico pronto para a tela: "sex, 30/10 às 16h15". */
export interface HistoryEntry {
  id: string;
  /** ISO 8601, para o atributo datetime. */
  at: string;
  when: string;
  summary: string;
}

/**
 * Histórico do pedido do mais antigo para o mais novo, a ordem em que ele aconteceu. A API manda
 * do mais novo para o mais antigo (no mesmo instante, o último registrado antes): basta inverter.
 */
export function historyEntries(events: readonly ActivityEvent[]): HistoryEntry[] {
  return [...events].reverse().map((event) => {
    const local = toLocal(event.at);
    return {
      id: event.id,
      at: event.at,
      when: `${formatDate(local.date)} às ${formatClock(local.minutes)}`,
      summary: event.summary,
    };
  });
}
