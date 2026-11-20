import { DestroyRef, inject, Signal, signal } from '@angular/core';
import { now } from './clock';

/**
 * Instante atual (milissegundos, pelo relógio do app: ver clock.ts) num signal, atualizado a cada `intervalMs` enquanto o componente
 * existir. Serve para textos que mudam com o tempo, como "Expira em 20 min". Chame no construtor
 * ou num campo do componente (contexto de injeção).
 */
export function injectNow(intervalMs: number): Signal<number> {
  const current = signal(now());
  const timer = setInterval(() => current.set(now()), intervalMs);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return current.asReadonly();
}
