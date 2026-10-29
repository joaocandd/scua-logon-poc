import { Injectable } from '@angular/core';
import { Employee, WorkSchedule } from '../shared/models';
import { appliesTo } from '../shared/schedule-engine';
import { NewActivityEvent, requestExpired } from './activity';
import { createFixtures, CURRENT_USER_ID, Fixtures } from './fixtures';

/**
 * Banco em memória da API simulada. Começa com as fixtures; aprovar, recusar e salvar regra
 * alteram os dados até a página recarregar (ou até `reset()`).
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  data!: Fixtures;
  /** Quem está usando o app, até existir o login simulado. */
  currentUserId = CURRENT_USER_ID;

  constructor() {
    this.reset();
  }

  /** Volta aos dados de demonstração, com datas relativas a `now`. */
  reset(now = new Date()): void {
    this.data = createFixtures(now);
  }

  employee(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id);
  }

  /** Regra de jornada que vale para o colaborador, se houver. */
  scheduleFor(employee: Employee): WorkSchedule | undefined {
    return this.data.schedules.find((s) => appliesTo(s, employee));
  }

  log(event: NewActivityEvent): void {
    const id = `evt-${String(this.data.events.length + 1).padStart(3, '0')}`;
    this.data.events.push({ id, ...event });
  }

  /** Pedido em aberto cujo prazo passou vira "expirado", como faria o servidor. */
  expirePending(now: Date): void {
    for (const request of this.data.requests) {
      const open = request.status === 'aguardando_gestor' || request.status === 'aguardando_rh';
      const employee = this.employee(request.employeeId);
      if (open && employee && Date.parse(request.expiresAt) <= now.getTime()) {
        request.status = 'expirado';
        this.log(requestExpired(request, employee));
      }
    }
  }
}
