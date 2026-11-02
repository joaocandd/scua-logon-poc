import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { apiErrorStatus } from '../../shared/api-error';
import { Employee } from '../../shared/models';
import { CurrentUser } from './current-user';

/** Usuário ou senha não conferem. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Usuário ou senha incorretos.');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Entrada no app. A autenticação é simulada pela API (/api/sessao): qualquer usuário e senha
 * preenchidos, e também a conta corporativa, entram como a usuária da demonstração; a senha
 * "erro" simula credencial inválida. Quem entra vira o usuário atual, e o menu mostra o mesmo
 * nome. A espera da API simulada (300 a 800 ms) mostra o estado de carregando na tela.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  signIn(username: string, password: string): Promise<Employee> {
    const credentials = { username: username.trim(), password };
    return this.start(this.http.post<Employee>('/api/sessao', credentials));
  }

  /** Simula o login único da empresa, que no produto real abriria a página do provedor. */
  signInWithCorporateAccount(): Promise<Employee> {
    return this.start(this.http.post<Employee>('/api/sessao/corporativa', {}));
  }

  private async start(call: Observable<Employee>): Promise<Employee> {
    let user: Employee;
    try {
      user = await firstValueFrom(call);
    } catch (error) {
      throw apiErrorStatus(error) === 401 ? new InvalidCredentialsError() : error;
    }
    // O CurrentUser só é criado aqui: criado antes, na tela de entrada, ele já buscaria /api/eu
    // e baixaria a API simulada antes de alguém tentar entrar.
    this.injector.get(CurrentUser).setUser(user);
    return user;
  }
}
