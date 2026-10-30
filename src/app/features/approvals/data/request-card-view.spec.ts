import { Employee, ExtensionDecision, ExtensionRequest } from '../../../shared/models';
import { InboxItem } from './approval-inbox';
import {
  CardViewOptions,
  dayLabel,
  expiresLabel,
  outcomeOf,
  toCardView,
} from './request-card-view';

// Quinta, 12/11/2026, 18h00 em São Paulo.
const NOW = Date.parse('2026-11-12T18:00:00-03:00');

function person(id: string, name: string): Employee {
  return {
    id,
    name,
    email: `${id}@empresa.example`,
    jobTitle: 'Analista',
    groupId: 'grp-comercial',
  };
}

const LUCAS = person('col-14', 'Lucas Bittencourt');
const MARINA = person('col-07', 'Marina Couto');
const RENATA = person('col-25', 'Renata Albuquerque');
const employeeById = new Map([LUCAS, MARINA, RENATA].map((e) => [e.id, e]));

function decision(
  approverId: string,
  outcome: ExtensionDecision['outcome'] = 'aprovado',
  step: ExtensionDecision['step'] = 'gestor',
  extra: Partial<ExtensionDecision> = {},
): ExtensionDecision {
  return { step, outcome, approverId, at: '2026-11-12T18:03:00-03:00', ...extra };
}

function request(overrides: Partial<ExtensionRequest> = {}): ExtensionRequest {
  return {
    id: 'ped-02',
    employeeId: LUCAS.id,
    date: '2026-11-12',
    currentEnd: '17:00',
    requestedEnd: '19:30',
    reason: 'Entrega de proposta comercial',
    status: 'aguardando_gestor',
    createdAt: '2026-11-12T16:00:00-03:00',
    expiresAt: '2026-11-12T19:30:00-03:00',
    decisions: [],
    ...overrides,
  };
}

function item(overrides: Partial<ExtensionRequest> = {}): InboxItem {
  return {
    request: request(overrides),
    employee: LUCAS,
    group: { id: 'grp-comercial', name: 'Comercial', approverIds: [MARINA.id, RENATA.id] },
    schedule: undefined,
    context: {
      extraMinutes: 150,
      unlockedUntil: 19 * 60,
      monthOvertimeMinutes: 90,
      alerts: [
        { kind: 'limite_diario', title: 'Passa de 2 h extras no dia', detail: 'Pede 2h30.' },
      ],
      needsHrValidation: true,
    },
  };
}

const options = (extra: Partial<CardViewOptions> = {}): CardViewOptions => ({
  now: NOW,
  meId: RENATA.id,
  employeeById,
  ...extra,
});

describe('toCardView', () => {
  it('pedido aguardando: horário pedido, contexto e tempo para decidir', () => {
    expect(toCardView(item(), options())).toMatchObject({
      employeeName: 'Lucas Bittencourt',
      groupName: 'Comercial',
      day: 'Hoje, 12/11',
      until: 'Até 19h30',
      extra: '+2h30',
      showStatus: false,
      expires: { text: 'Expira em 1h30', soon: false },
      monthOvertime: '1h30 de hora extra aprovada em novembro',
      hrNote: 'Depois de você, vai para a validação do RH.',
      canDecide: true,
      outcome: null,
      undo: null,
    });
  });

  it('sem hora extra no mês e sem validação do RH', () => {
    const base = item();
    const view = toCardView(
      { ...base, context: { ...base.context!, monthOvertimeMinutes: 0, needsHrValidation: false } },
      options(),
    );
    expect(view.monthOvertime).toBe('Nenhuma hora extra aprovada em novembro');
    expect(view.hrNote).toBe('Sem validação do RH: a sua aprovação libera a estação.');
  });

  it('decidido nesta visita: resultado curto e "Desfazer"', () => {
    const view = toCardView(
      item({ status: 'aguardando_rh', decisions: [decision(RENATA.id)] }),
      options({ session: { decidedHere: true, busy: null } }),
    );
    expect(view.canDecide).toBe(false);
    expect(view.showStatus).toBe(true);
    expect(view.expires).toBeNull();
    expect(view.outcome).toEqual({
      text: 'Aprovado às 18h03',
      note: 'Falta a validação do RH.',
      tone: 'approved',
    });
    expect(view.undo).toEqual({ available: true });
  });

  it('decidido nesta visita, mas o RH já validou: explica por que não dá para desfazer', () => {
    const view = toCardView(
      item({
        status: 'aprovado',
        decisions: [decision(RENATA.id), decision('col-37', 'aprovado', 'rh')],
      }),
      options({ session: { decidedHere: true, busy: null } }),
    );
    expect(view.outcome?.text).toBe('Validado pelo RH às 18h03');
    expect(view.undo).toEqual({
      available: false,
      reason: 'Não dá mais para desfazer: o RH já validou o pedido.',
    });
  });

  it('a API recusou o "Desfazer": o cartão mostra o motivo dela', () => {
    const view = toCardView(
      item({ status: 'aprovado', decisions: [decision(RENATA.id)] }),
      options({ session: { decidedHere: true, busy: null, undoError: 'O pedido venceu.' } }),
    );
    expect(view.undo).toEqual({ available: false, reason: 'O pedido venceu.' });
  });

  it('desfeito: volta a ter "Aprovar" e "Recusar", sem resultado', () => {
    const view = toCardView(item(), options({ session: { decidedHere: false, busy: null } }));
    expect(view.canDecide).toBe(true);
    expect(view.outcome).toBeNull();
    expect(view.undo).toBeNull();
  });
});

describe('outcomeOf', () => {
  const of = (overrides: Partial<ExtensionRequest>, extra: Partial<CardViewOptions> = {}) =>
    outcomeOf(request(overrides), options(extra));

  it('decisão de outra pessoa: diz quem e quando', () => {
    expect(of({ status: 'aguardando_rh', decisions: [decision(MARINA.id)] })).toEqual({
      text: 'Aprovado por Marina às 18h03',
      note: 'Falta a validação do RH.',
      tone: 'approved',
    });
  });

  it('decisão sua de outra visita: "por você"', () => {
    expect(of({ status: 'aprovado', decisions: [decision(RENATA.id)] })?.text).toBe(
      'Aprovado por você às 18h03',
    );
  });

  it('recusa mostra o motivo', () => {
    const refused = decision(MARINA.id, 'recusado', 'gestor', { reason: 'Pode ficar para amanhã' });
    expect(of({ status: 'recusado', decisions: [refused] })).toEqual({
      text: 'Recusado por Marina às 18h03',
      note: 'Motivo: Pode ficar para amanhã',
      tone: 'rejected',
    });
  });

  it('recusa do RH', () => {
    const decisions = [decision(MARINA.id), decision('col-37', 'recusado', 'rh')];
    expect(of({ status: 'recusado', decisions })?.text).toBe('Recusado pelo RH às 18h03');
  });

  it('expirado e cancelado', () => {
    expect(of({ status: 'expirado' })).toEqual({
      text: 'Expirou às 19h30, sem decisão',
      note: null,
      tone: 'neutral',
    });
    expect(of({ status: 'cancelado' })?.text).toBe('Lucas cancelou o pedido');
  });

  it('aguardando o gestor não tem resultado', () => {
    expect(of({})).toBeNull();
  });
});

describe('dayLabel', () => {
  it('hoje, amanhã e ontem por extenso; os outros com o dia da semana', () => {
    expect(dayLabel('2026-11-12', '2026-11-12')).toBe('Hoje, 12/11');
    expect(dayLabel('2026-11-13', '2026-11-12')).toBe('Amanhã, 13/11');
    expect(dayLabel('2026-11-11', '2026-11-12')).toBe('Ontem, 11/11');
    expect(dayLabel('2026-11-17', '2026-11-12')).toBe('ter, 17/11');
  });
});

describe('expiresLabel', () => {
  const at = (iso: string) => expiresLabel(iso, NOW);

  it('menos de 1 h: em minutos e com atenção', () => {
    expect(at('2026-11-12T18:45:00-03:00')).toEqual({ text: 'Expira em 45 min', soon: true });
  });

  it('até 12 h: em horas', () => {
    expect(at('2026-11-12T20:10:00-03:00')).toEqual({ text: 'Expira em 2h10', soon: false });
  });

  it('mais longe: o dia e a hora', () => {
    expect(at('2026-11-13T19:30:00-03:00').text).toBe('Expira amanhã às 19h30');
    expect(at('2026-11-17T19:30:00-03:00').text).toBe('Expira ter, 17/11 às 19h30');
  });

  it('prazo que já passou não fica negativo', () => {
    expect(at('2026-11-12T17:00:00-03:00').text).toBe('Expira em 0 min');
  });
});
