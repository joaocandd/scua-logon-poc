import { DestroyRef, inject, Signal, signal } from '@angular/core';

/**
 * Instante atual (milissegundos) num signal, atualizado a cada `intervalMs` enquanto o componente
 * existir. Serve para textos que mudam com o tempo, como "Expira em 20 min". Chame no construtor
 * ou num campo do componente (contexto de injeção).
 */
export function injectNow(intervalMs: number): Signal<number> {
  const now = signal(Date.now());
  const timer = setInterval(() => now.set(Date.now()), intervalMs);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now.asReadonly();
}
