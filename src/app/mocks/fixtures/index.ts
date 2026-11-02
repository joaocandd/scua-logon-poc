import {
  ActivityEvent,
  Employee,
  ExtensionRequest,
  Group,
  Holiday,
  ScheduleException,
  WorkSchedule,
} from '../../shared/models';
import { APPROVAL_TOKENS, ApprovalToken } from './approval-tokens';
import { EMPLOYEES } from './employees';
import { GROUPS } from './groups';
import { HOLIDAYS } from './holidays';
import { createScenario } from './scenario';
import { WORK_SCHEDULES } from './work-schedules';

export type { ApprovalToken } from './approval-tokens';
export { CURRENT_USER_ID, HR_VALIDATOR_ID } from './employees';
export { createLiveRequest } from './scenario';

export interface Fixtures {
  employees: Employee[];
  groups: Group[];
  schedules: WorkSchedule[];
  holidays: Holiday[];
  exceptions: ScheduleException[];
  requests: ExtensionRequest[];
  events: ActivityEvent[];
  /** Links de aprovação enviados por e-mail. */
  tokens: ApprovalToken[];
}

/** Dados de demonstração, em cópias novas: a API simulada pode alterar à vontade. */
export function createFixtures(now = new Date()): Fixtures {
  const employees = structuredClone([...EMPLOYEES]);
  const groups = structuredClone([...GROUPS]);
  const schedules = structuredClone([...WORK_SCHEDULES]);
  const holidays = structuredClone([...HOLIDAYS]);
  const scenario = createScenario({ now, employees, groups, schedules, holidays });
  const tokens = structuredClone([...APPROVAL_TOKENS]);
  return { employees, groups, schedules, holidays, ...scenario, tokens };
}
