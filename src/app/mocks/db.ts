import { Injectable } from '@angular/core';
import { toLocal } from '../shared/date';
import { Employee, WorkSchedule, WorkstationStatus } from '../shared/models';
import { appliesTo, evaluateWorkstation } from '../shared/schedule-engine';
import {
  blockObserved,
  NewActivityEvent,
  observationEnded,
  requestCreated,
  requestExpired,
} from './activity';
import { createFixtures, createLiveRequest, CURRENT_USER_ID, Fixtures } from './fixtures';

/** No modo demo ao vivo, um pedido novo chega a cada 30 s. */
export const LIVE_INTERVAL_MS = 30_000;

/**
 * Banco em memória da API simulada. Começa com as fixtures; aprovar, recusar e salvar regra
 * alteram os dados até a página recarregar (ou até `reset()`).
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  data!: Fixtures;
  /** Quem está usando o app. Na demonstração, todo login entra como esta pessoa. */
  currentUserId = CURRENT_USER_ID;

  /** Modo demo ao vivo: desde quando está ligado e quantos pedidos novos já chegaram. */
  private live: { since: number; delivered: number } | null = null;

  /**
   * Regras em observação: quem a regra bloquearia na última conferência ("regra:colaborador").
   * Só a passagem de liberada para bloqueada vira registro.
   */
  private observedBlocks = new Set<string>();

  constructor() {
    this.reset();
  }

  /** Volta aos dados de demonstração, com datas relativas a `now`, e desliga o modo ao vivo. */
  reset(now = new Date()): void {
    this.data = createFixtures(now);
    this.live = null;
    this.observedBlocks.clear();
  }

  employee(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id);
  }

  /**
   * Regra de jornada que vale para o colaborador, se houver. A ativa vem antes da que está em
   * observação: a pessoa pode estar nas duas enquanto a nova é observada.
   */
  scheduleFor(employee: Employee): WorkSchedule | undefined {
    const rules = this.data.schedules.filter((s) => appliesTo(s, employee));
    return rules.find((s) => !s.observationMode) ?? rules[0];
  }

  /** Estado da estação pela regra dada, com as exceções, feriados e pedidos da pessoa. */
  evaluate(schedule: WorkSchedule, employee: Employee, now: Date): WorkstationStatus {
    return evaluateWorkstation({
      schedule,
      exceptions: this.data.exceptions.filter((e) => e.employeeId === employee.id),
      holidays: this.data.holidays,
      extensions: this.data.requests.filter((r) => r.employeeId === employee.id),
      at: now,
    });
  }

  /** Terminados os dias de observação, a regra passa a bloquear, e o histórico registra. */
  endObservations(now: Date): void {
    const today = toLocal(now).date;
    for (const schedule of this.data.schedules) {
      const ended = schedule.observationEndsOn && schedule.observationEndsOn < today;
      if (schedule.observationMode && ended) {
        schedule.observationMode = false;
        delete schedule.observationEndsOn;
        this.log(observationEnded(schedule, now.toISOString()));
      }
    }
  }

  /**
   * Regras em observação: registra quem a regra bloquearia agora e está com a estação liberada
   * de verdade (pela regra ativa, ou sem regra). Uma vez por passagem de liberada para bloqueada,
   * como faria o agente do Windows ao avisar o servidor.
   */
  recordObservations(now: Date): void {
    const minutes = toLocal(now).minutes;
    const unlocked = ({ state }: WorkstationStatus) =>
      state === 'em_jornada' || state === 'he_aprovada';
    for (const schedule of this.data.schedules.filter((s) => s.observationMode)) {
      for (const employee of this.data.employees.filter((e) => appliesTo(schedule, e))) {
        const key = `${schedule.id}:${employee.id}`;
        const observed = this.evaluate(schedule, employee, now);
        const active = this.data.schedules.find(
          (s) => !s.observationMode && appliesTo(s, employee),
        );
        const freeNow = !active || unlocked(this.evaluate(active, employee, now));
        if (unlocked(observed) || !freeNow) {
          this.observedBlocks.delete(key);
        } else if (!this.observedBlocks.has(key)) {
          this.observedBlocks.add(key);
          this.log(blockObserved(schedule, employee, observed.reason, now.toISOString(), minutes));
        }
      }
    }
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

  /**
   * Liga o modo demo ao vivo (?demo=ao-vivo): o primeiro pedido novo chega 30 s depois. Fica ligado
   * até a página recarregar, mesmo que a URL perca o parâmetro. Ligar de novo não reinicia a conta.
   */
  startLiveDemo(now = new Date()): void {
    this.live ??= { since: now.getTime(), delivered: 0 };
  }

  /** Entrega os pedidos do modo demo ao vivo que já deveriam ter chegado, até a fila acabar. */
  deliverLiveRequests(now: Date): void {
    if (!this.live) return;
    const due = Math.floor((now.getTime() - this.live.since) / LIVE_INTERVAL_MS);
    while (this.live.delivered < due) {
      const at = new Date(this.live.since + (this.live.delivered + 1) * LIVE_INTERVAL_MS);
      const id = `ped-${String(this.data.requests.length + 1).padStart(2, '0')}`;
      const request = createLiveRequest({ ...this.data, now: at }, this.live.delivered, id);
      if (!request) return;
      this.data.requests.push(request);
      this.log(requestCreated(request, this.employee(request.employeeId)!));
      this.live.delivered++;
    }
  }
}
