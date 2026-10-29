// Modelo de domínio. Nomes em inglês (glossário do CLAUDE.md); valores da API em português.
export type { ActivityEvent, ActivityEventType } from './activity-event';
export type { Employee } from './employee';
export type { ApprovalStep, ExtensionDecision, ExtensionRequest } from './extension-request';
export type { Group } from './group';
export type { Holiday } from './holiday';
export type {
  AlternateHoursException,
  DayOffException,
  ScheduleException,
} from './schedule-exception';
export {
  EXTENSION_REQUEST_STATUSES,
  WORKSTATION_STATES,
  type ExtensionRequestStatus,
  type WorkstationState,
} from './status';
export type { Break, ScheduleAssignment, Weekday, WorkSchedule } from './work-schedule';
export type { Workstation, WorkstationStatus } from './workstation';
