import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivityEvent } from '../../../shared/models';

/** Histórico (auditoria), do mais novo para o mais antigo. */
@Injectable({ providedIn: 'root' })
export class ActivityLog {
  readonly events = httpResource<ActivityEvent[]>(() => '/api/historico', { defaultValue: [] });
}
