import { addDays, toLocal } from '../../shared/date';
import {
  ActivityEvent,
  Employee,
  ExtensionRequest,
  Group,
  Holiday,
  OBSERVATION_DAYS,
  ScheduleException,
  Settings,
  WorkSchedule,
} from '../../shared/models';
import { APPROVAL_TOKENS, ApprovalToken } from './approval-tokens';
import { EMPLOYEES } from './employees';
import { GROUPS } from './groups';
import { HOLIDAYS } from './holidays';
import { createScenario } from './scenario';
import { SETTINGS } from './settings';
import { WORK_SCHEDULES } from './work-schedules';

export type { ApprovalToken } from './approval-tokens';
export { CURRENT_USER_ID, HR_VALIDATOR_ID } from './employees';
export { createLiveRequest } from './scenario';

/** Há quantos dias a regra em observação das fixtures (Noturna) começou a observar. */
const OBSERVED_DAYS_AGO = 2;

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
  settings: Settings;
}

/** Dados de demonstração, em cópias novas: a API simulada pode alterar à vontade. */
export function createFixtures(now = new Date()): Fixtures {
  const employees = structuredClone([...EMPLOYEES]);
  const groups = structuredClone([...GROUPS]);
  const schedules = structuredClone([...WORK_SCHEDULES]);
  // A observação começou há 2 dias: ainda faltam alguns, qualquer que seja o dia em que o app abre.
  const observationEndsOn = addDays(toLocal(now).date, OBSERVATION_DAYS - 1 - OBSERVED_DAYS_AGO);
  for (const schedule of schedules) {
    if (schedule.observationMode) schedule.observationEndsOn = observationEndsOn;
  }
  const holidays = structuredClone([...HOLIDAYS]);
  const scenario = createScenario({ now, employees, groups, schedules, holidays });
  const tokens = structuredClone([...APPROVAL_TOKENS]);
  const settings = { ...SETTINGS };
  return { employees, groups, schedules, holidays, ...scenario, tokens, settings };
}
