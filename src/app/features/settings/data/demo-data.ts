import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ExtensionRequests } from '../../approvals/data/extension-requests';
import { People } from '../../people/data/people';
import { ActivityLog } from '../../reports/data/activity-log';
import { WorkSchedules } from '../../schedules/data/work-schedules';
import { Workstations } from '../../today/data/workstations';
import { CompanySettings } from './company-settings';

/**
 * Modo demo: volta os dados ao começo da apresentação sem recarregar a página. A API simulada
 * restaura o banco (`MockDb.reset()`) e, em seguida, as listas que o app guarda em memória são
 * buscadas de novo. Quem está na tela continua vendo os dados antigos até a resposta chegar.
 */
@Injectable({ providedIn: 'root' })
export class DemoData {
  private readonly http = inject(HttpClient);
  private readonly requests = inject(ExtensionRequests);
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);
  private readonly activity = inject(ActivityLog);
  private readonly workstations = inject(Workstations);
  private readonly settings = inject(CompanySettings);

  async restore(): Promise<void> {
    await firstValueFrom(this.http.post('/api/demo/restaurar', {}));
    for (const resource of [
      this.requests.list,
      this.people.employees,
      this.people.groups,
      this.schedules.list,
      this.schedules.holidays,
      this.schedules.exceptions,
      this.activity.events,
      this.workstations.list,
      this.settings.current,
    ]) {
      resource.reload();
    }
  }
}
