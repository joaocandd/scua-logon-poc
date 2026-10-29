import { WorkSchedule } from '../../shared/models';
import { CURRENT_USER_ID } from './employees';

const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export const WORK_SCHEDULES: readonly WorkSchedule[] = [
  {
    id: 'regra-comercial',
    name: 'Comercial',
    weekdays: [...WEEKDAYS],
    start: '08:00',
    end: '17:00',
    breaks: [{ label: 'Almoço', start: '12:00', end: '13:00' }],
    warningMinutes: [15, 5],
    requiresHrValidation: true,
    observationMode: false,
    assignment: { groupIds: ['grp-comercial', 'grp-financeiro'], excludedEmployeeIds: [] },
  },
  {
    id: 'regra-flexivel',
    name: 'Flexível',
    weekdays: [...WEEKDAYS],
    start: '10:00',
    end: '19:00',
    breaks: [{ label: 'Almoço', start: '13:00', end: '14:00' }],
    warningMinutes: [15, 5],
    requiresHrValidation: false,
    observationMode: false,
    assignment: { groupIds: ['grp-ti', 'grp-rh'], excludedEmployeeIds: [] },
  },
  {
    id: 'regra-tarde',
    name: 'Tarde',
    weekdays: [...WEEKDAYS, 6],
    start: '14:00',
    end: '22:00',
    breaks: [{ label: 'Pausa', start: '18:00', end: '19:00' }],
    warningMinutes: [15, 5],
    requiresHrValidation: false,
    observationMode: false,
    assignment: { groupIds: ['grp-atendimento'], excludedEmployeeIds: [] },
  },
  {
    id: 'regra-noturna',
    name: 'Noturna',
    weekdays: [...WEEKDAYS],
    start: '22:00',
    end: '06:00',
    breaks: [{ label: 'Pausa', start: '02:00', end: '03:00' }],
    warningMinutes: [30, 15, 5],
    requiresHrValidation: true,
    observationMode: false,
    // A diretora de operações não trabalha à noite e fica sem regra (estação sem controle).
    assignment: { groupIds: ['grp-operacoes'], excludedEmployeeIds: [CURRENT_USER_ID] },
  },
];
