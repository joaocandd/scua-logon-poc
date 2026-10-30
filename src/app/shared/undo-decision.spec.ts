import { ExtensionDecision, ExtensionRequest } from './models';
import { undoBlocker } from './undo-decision';

const NOW = new Date('2026-11-12T18:00:00-03:00');

function decision(step: ExtensionDecision['step'], outcome: ExtensionDecision['outcome']) {
  return { step, outcome, approverId: 'col-25', at: '2026-11-12T17:50:00-03:00' };
}

function request(overrides: Partial<ExtensionRequest>): ExtensionRequest {
  return {
    id: 'ped-01',
    employeeId: 'col-08',
    date: '2026-11-12',
    currentEnd: '17:00',
    requestedEnd: '19:30',
    reason: 'Fechamento do mês',
    status: 'aprovado',
    createdAt: '2026-11-12T16:00:00-03:00',
    expiresAt: '2026-11-12T19:30:00-03:00',
    decisions: [decision('gestor', 'aprovado')],
    ...overrides,
  };
}

describe('undoBlocker', () => {
  it('a decisão do gestor pode ser desfeita até o RH decidir ou o pedido vencer', () => {
    expect(undoBlocker(request({}), NOW)).toBeNull();
    expect(undoBlocker(request({ status: 'aguardando_rh' }), NOW)).toBeNull();
    expect(
      undoBlocker(
        request({ status: 'recusado', decisions: [decision('gestor', 'recusado')] }),
        NOW,
      ),
    ).toBeNull();
  });

  it('depois que o RH decide, explica o que o RH fez', () => {
    const validated = [decision('gestor', 'aprovado'), decision('rh', 'aprovado')];
    const refused = [decision('gestor', 'aprovado'), decision('rh', 'recusado')];
    expect(undoBlocker(request({ decisions: validated }), NOW)).toBe(
      'Não dá mais para desfazer: o RH já validou o pedido.',
    );
    expect(undoBlocker(request({ status: 'recusado', decisions: refused }), NOW)).toBe(
      'Não dá mais para desfazer: o RH já recusou o pedido.',
    );
  });

  it('depois que o pedido vence, diz a que horas venceu', () => {
    const later = new Date('2026-11-12T19:30:00-03:00');
    expect(undoBlocker(request({}), later)).toBe(
      'Não dá mais para desfazer: o pedido venceu às 19h30.',
    );
    expect(undoBlocker(request({ status: 'expirado' }), NOW)).toBe(
      'Não dá mais para desfazer: o pedido venceu às 19h30.',
    );
  });
});
