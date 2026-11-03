// Telas ao vivo (caixa de aprovações e painel "Hoje"): de quanto em quanto tempo consultam a API e
// o texto "Atualizado há X s". Funções puras.

/** As telas ao vivo consultam a API de novo a cada 15 s enquanto estão abertas e visíveis. */
export const POLL_INTERVAL_MS = 15_000;

/** "Atualizado agora", "Atualizado há 12 s", "Atualizado há 3 min". */
export function updatedLabel(refreshedAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - refreshedAt) / 1000));
  if (seconds < 5) return 'Atualizado agora';
  if (seconds < 60) return `Atualizado há ${seconds} s`;
  return `Atualizado há ${Math.floor(seconds / 60)} min`;
}
