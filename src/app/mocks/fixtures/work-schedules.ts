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
    // Em observação: registra quem seria bloqueado, sem bloquear. O painel "Hoje" mostra essas
    // estações liberadas fora da jornada. O último dia (`observationEndsOn`) sai de createFixtures.
    observationMode: true,
    // A diretora de operações não trabalha à noite e fica sem regra (estação sem controle).
    assignment: { groupIds: ['grp-operacoes'], excludedEmployeeIds: [CURRENT_USER_ID] },
  },
  {
    id: 'regra-fechamento',
    name: 'Fechamento do mês',
    weekdays: [...WEEKDAYS],
    start: '08:00',
    end: '18:00',
    breaks: [{ label: 'Almoço', start: '12:00', end: '13:00' }],
    warningMinutes: [15, 5],
    requiresHrValidation: true,
    // Cenário da demo: o RH começou a regra do Financeiro, que ainda está na Comercial. O editor
    // mostra o conflito na hora. Fica por último e em observação, então não muda a estação de
    // ninguém (a Comercial vence) e não registra bloqueios: das 8h às 18h, com o mesmo almoço,
    // ela libera sempre que a Comercial libera.
    observationMode: true,
    assignment: { groupIds: ['grp-financeiro'], excludedEmployeeIds: [] },
  },
];
