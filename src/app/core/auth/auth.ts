import { Injectable, signal } from '@angular/core';

/** Pessoa com a sessão aberta. */
export interface SessionUser {
  username: string;
  name: string;
}

/** Usuário ou senha não conferem. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Usuário ou senha incorretos.');
    this.name = 'InvalidCredentialsError';
  }
}

/** Senha que simula credencial inválida na demonstração. */
export const DEMO_INVALID_PASSWORD = 'erro';

/** Tempo de resposta simulado do servidor, para a tela mostrar o estado de carregando. */
export const SIGN_IN_DELAY_MS = 800;

/**
 * Autenticação simulada (a PoC não tem backend): qualquer usuário e senha preenchidos entram, e a
 * senha "erro" simula credencial inválida. A sessão fica só na memória; recarregar a página sai.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly session = signal<SessionUser | null>(null);
  readonly user = this.session.asReadonly();

  async signIn(username: string, password: string): Promise<SessionUser> {
    await delay(SIGN_IN_DELAY_MS);
    if (password === DEMO_INVALID_PASSWORD) throw new InvalidCredentialsError();
    const login = username.trim();
    return this.start({ username: login, name: login });
  }

  /** Simula o login único da empresa, que no produto real abriria a página do provedor. */
  async signInWithCorporateAccount(): Promise<SessionUser> {
    await delay(SIGN_IN_DELAY_MS);
    return this.start({ username: 'ana.ribeiro', name: 'Ana Ribeiro' });
  }

  signOut(): void {
    this.session.set(null);
  }

  private start(user: SessionUser): SessionUser {
    this.session.set(user);
    return user;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
