import { Group } from '../../shared/models';
import { CURRENT_USER_ID } from './employees';

// Cada grupo é aprovado pelo gestor da área e pela diretora de operações (a usuária simulada).
export const GROUPS: readonly Group[] = [
  { id: 'grp-financeiro', name: 'Financeiro', approverIds: ['col-01', CURRENT_USER_ID] },
  { id: 'grp-comercial', name: 'Comercial', approverIds: ['col-07', CURRENT_USER_ID] },
  { id: 'grp-atendimento', name: 'Atendimento', approverIds: ['col-16', CURRENT_USER_ID] },
  { id: 'grp-operacoes', name: 'Operações', approverIds: ['col-26', CURRENT_USER_ID] },
  { id: 'grp-ti', name: 'TI', approverIds: ['col-32', CURRENT_USER_ID] },
  { id: 'grp-rh', name: 'RH', approverIds: ['col-37', CURRENT_USER_ID] },
];
