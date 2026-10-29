import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

/** Chave no localStorage. O script no src/index.html lê a mesma chave antes do app carregar. */
export const THEME_STORAGE_KEY = 'scua-tema';

/**
 * Tema claro, escuro ou do sistema. A escolha fica no localStorage e vira o atributo
 * `data-theme` do <html>, que o tokens.css usa. "Do sistema" tira o atributo e deixa o
 * `prefers-color-scheme` decidir.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);

  readonly preference = signal<ThemePreference>(this.readStored());

  constructor() {
    effect(() => {
      const preference = this.preference();
      const root = this.document.documentElement;
      if (preference === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', preference);
    });
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    // Sem localStorage (janela anônima, armazenamento bloqueado), o tema vale só até recarregar.
    // Com o armazenamento bloqueado, até ler `window.localStorage` lança erro.
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* segue sem guardar */
    }
  }

  private readStored(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
