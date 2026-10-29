import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import { Employee } from '../../shared/models';

/**
 * Quem está usando o app. A autenticação é simulada: a API simulada responde sempre com a mesma
 * pessoa (Renata Albuquerque) até existir a tela de login.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  readonly user = httpResource<Employee>(() => '/api/eu');

  /** A pessoa, ou nulo enquanto carrega ou se a chamada falhar. */
  readonly profile = computed(() => (this.user.hasValue() ? this.user.value() : null));

  /** Iniciais do primeiro e do último nome: "Renata Albuquerque" → "RA". */
  readonly initials = computed(() => {
    const words = this.profile()?.name.split(' ') ?? [];
    const last = words.length > 1 ? (words.at(-1) ?? '') : '';
    return `${words[0]?.charAt(0) ?? ''}${last.charAt(0)}`;
  });
}
