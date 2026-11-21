import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Employee } from '../../shared/models';

/**
 * Quem está usando o app. Quem entra pela tela de login vira o usuário atual (o Auth chama
 * `setUser`). Quem abre direto uma página do app, sem passar pelo login (a proteção de rota vem
 * depois), recebe a sessão que a API informa em /api/eu. Na demonstração, as duas são a mesma
 * pessoa: Renata Albuquerque, a aprovadora simulada.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly signedIn = signal<Employee | null>(null);
  /** A pessoa clicou em "Sair": até entrar de novo, não há usuário atual. */
  private readonly signedOut = signal(false);
  /** Só pergunta à API se ninguém entrou pelo login e ninguém saiu. */
  private readonly session = httpResource<Employee>(() =>
    this.signedIn() || this.signedOut() ? undefined : '/api/eu',
  );

  /** A pessoa, ou nulo enquanto carrega ou se a chamada falhar. */
  readonly profile = computed(() => {
    if (this.signedOut()) return null;
    return this.signedIn() ?? (this.session.hasValue() ? this.session.value() : null);
  });

  /** Iniciais do primeiro e do último nome: "Renata Albuquerque" → "RA". */
  readonly initials = computed(() => {
    const words = this.profile()?.name.split(' ') ?? [];
    const last = words.length > 1 ? (words.at(-1) ?? '') : '';
    return `${words[0]?.charAt(0) ?? ''}${last.charAt(0)}`;
  });

  /** A pessoa que acabou de entrar vira o usuário atual. */
  setUser(user: Employee): void {
    this.signedOut.set(false);
    this.signedIn.set(user);
  }

  /** "Sair": esquece quem estava usando o app. A sessão da API (/api/eu) não volta sozinha. */
  clear(): void {
    this.signedIn.set(null);
    this.signedOut.set(true);
  }
}
