import {
  ActivityEvent,
  Employee,
  ExtensionRequest,
  Group,
  Holiday,
  ScheduleException,
  WorkSchedule,
} from '../../shared/models';
import { EMPLOYEES } from './employees';
import { GROUPS } from './groups';
import { HOLIDAYS } from './holidays';
import { createScenario } from './scenario';
import { WORK_SCHEDULES } from './work-schedules';

export { CURRENT_USER_ID, HR_VALIDATOR_ID } from './employees';

export interface Fixtures {
  employees: Employee[];
  groups: Group[];
  schedules: WorkSchedule[];
  holidays: Holiday[];
  exceptions: ScheduleException[];
  requests: ExtensionRequest[];
  events: ActivityEvent[];
}

/** Dados de demonstração, em cópias novas: a API simulada pode alterar à vontade. */
export function createFixtures(now = new Date()): Fixtures {
  const employees = structuredClone([...EMPLOYEES]);
  const groups = structuredClone([...GROUPS]);
  const schedules = structuredClone([...WORK_SCHEDULES]);
  const holidays = structuredClone([...HOLIDAYS]);
  const scenario = createScenario({ now, employees, groups, schedules, holidays });
  return { employees, groups, schedules, holidays, ...scenario };
}
