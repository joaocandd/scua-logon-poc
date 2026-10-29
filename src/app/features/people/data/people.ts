import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import { Employee, Group } from '../../../shared/models';

/** Colaboradores e grupos. Outras telas usam os mapas para mostrar nomes a partir dos ids. */
@Injectable({ providedIn: 'root' })
export class People {
  readonly employees = httpResource<Employee[]>(() => '/api/colaboradores', { defaultValue: [] });
  readonly groups = httpResource<Group[]>(() => '/api/grupos', { defaultValue: [] });

  readonly employeeById = computed(
    () => new Map((this.employees.hasValue() ? this.employees.value() : []).map((e) => [e.id, e])),
  );
  readonly groupById = computed(
    () => new Map((this.groups.hasValue() ? this.groups.value() : []).map((g) => [g.id, g])),
  );
}
