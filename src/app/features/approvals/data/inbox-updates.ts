// Textos da atualização ao vivo da caixa de aprovações. Funções puras.

import { formatClock, toMinutes } from '../../../shared/time';

/** A caixa consulta a API de novo a cada 15 s enquanto está aberta e visível. */
export const POLL_INTERVAL_MS = 15_000;

/** "Atualizado agora", "Atualizado há 12 s", "Atualizado há 3 min". */
export function updatedLabel(refreshedAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - refreshedAt) / 1000));
  if (seconds < 5) return 'Atualizado agora';
  if (seconds < 60) return `Atualizado há ${seconds} s`;
  return `Atualizado há ${Math.floor(seconds / 60)} min`;
}

/**
 * Anúncio discreto para leitor de tela quando chegam pedidos: "Novo pedido de Felipe Guimarães,
 * até 18h." ou "3 pedidos novos: Felipe Guimarães, Renan Castilho e André Seixas."
 */
export function arrivalMessage(
  requests: readonly { employeeName: string; requestedEnd: string }[],
): string {
  if (requests.length === 1) {
    const [only] = requests;
    return `Novo pedido de ${only.employeeName}, até ${formatClock(toMinutes(only.requestedEnd))}.`;
  }
  const names = requests.map((r) => r.employeeName);
  const list = `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
  return `${requests.length} pedidos novos: ${list}.`;
}
