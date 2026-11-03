import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivityEvent, Holiday, ScheduleException, WorkSchedule } from '../../../shared/models';

/**
 * Registros do modo observação de uma regra ("Às 17h05, a estação de Ana seria bloqueada..."), do
 * mais novo para o mais antigo. Sem id, não busca. Chame num contexto de injeção.
 */
export function observationLog(scheduleId: () => string | null) {
  return httpResource<ActivityEvent[]>(
    () => {
      const id = scheduleId();
      return id ? `/api/historico?regra=${encodeURIComponent(id)}` : undefined;
    },
    {
      defaultValue: [],
      parse: (events) => (events as ActivityEvent[]).filter((e) => e.type === 'bloqueio_observado'),
    },
  );
}

/** Regras de jornada (fluxo B), com os feriados e as exceções que o editor e o simulador usam. */
@Injectable({ providedIn: 'root' })
export class WorkSchedules {
  private readonly http = inject(HttpClient);

  readonly list = httpResource<WorkSchedule[]>(() => '/api/regras', { defaultValue: [] });
  readonly holidays = httpResource<Holiday[]>(() => '/api/feriados', { defaultValue: [] });
  readonly exceptions = httpResource<ScheduleException[]>(() => '/api/excecoes', {
    defaultValue: [],
  });

  /** Salva a regra: cria quando ainda não tem id, senão substitui a existente. */
  async save(schedule: WorkSchedule): Promise<WorkSchedule> {
    const call = schedule.id
      ? this.http.put<WorkSchedule>(`/api/regras/${schedule.id}`, schedule)
      : this.http.post<WorkSchedule>('/api/regras', schedule);
    const saved = await firstValueFrom(call);
    if (this.list.hasValue()) {
      this.list.update((list) =>
        list.some((s) => s.id === saved.id)
          ? list.map((s) => (s.id === saved.id ? saved : s))
          : [...list, saved],
      );
    }
    return saved;
  }
}
