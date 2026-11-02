import { CURRENT_USER_ID } from './employees';

/**
 * Link de aprovação enviado por e-mail: dá acesso a um pedido só, para quem recebeu. Fica só na
 * API simulada; a tela nunca recebe esta lista.
 */
export interface ApprovalToken {
  token: string;
  requestId: string;
  /** Quem recebeu o e-mail e decide pelo link (Employee.id). */
  approverId: string;
}

// Um token de exemplo para cada estado da página /aprovacao/:token (lista no README). Todos foram
// enviados para a usuária da demonstração. Qualquer outro token é um link inválido.
export const APPROVAL_TOKENS: readonly ApprovalToken[] = [
  // Lucas Bittencourt: passa de 2 h extras no dia.
  { token: 'valido-ped-02', requestId: 'ped-02', approverId: CURRENT_USER_ID },
  // Mateus Farias: quebra a interjornada de 11 h.
  { token: 'valido-ped-04', requestId: 'ped-04', approverId: CURRENT_USER_ID },
  // Ana Ribeiro: o pedido venceu às 18h30, sem decisão.
  { token: 'expirado-ped-22', requestId: 'ped-22', approverId: CURRENT_USER_ID },
  // Igor Sampaio: Bianca, a gestora da área, já aprovou.
  { token: 'usado-ped-13', requestId: 'ped-13', approverId: CURRENT_USER_ID },
];
