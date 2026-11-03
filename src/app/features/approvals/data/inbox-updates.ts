// Textos da atualização ao vivo da caixa de aprovações. Funções puras. O intervalo de consulta e o
// "Atualizado há X s" ficam em shared/live-updates.ts, junto com o painel "Hoje".

import { formatClock, toMinutes } from '../../../shared/time';

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
