import { ActivityEvent, Employee, ExtensionRequest } from '../../../shared/models';
import { InboxItem } from './approval-inbox';
import { detailTimeline, historyEntries, nowMarker } from './request-detail';

const LUCAS: Employee = {
  id: 'col-14',
  name: 'Lucas Bittencourt',
  email: 'lucas@empresa.example',
  jobTitle: 'Representante comercial',
  groupId: 'grp-comercial',
};

// Comercial: 8h às 17h, almoço das 12h às 13h. 12/11/2026 é quinta.
const COMERCIAL_SHIFT = {
  name: 'jornada Comercial',
  start: 480,
  end: 1020,
  breaks: [{ label: 'Almoço', start: 720, end: 780 }],
};

function item(overrides: Partial<ExtensionRequest> = {}, shift = COMERCIAL_SHIFT): InboxItem {
  return {
    request: {
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
    },
    employee: LUCAS,
    group: undefined,
    schedule: undefined,
    shift,
    context: null,
  };
}

describe('detailTimeline', () => {
  it('aguardando: jornada, almoço, hora extra pedida até o limite e o que passa dele', () => {
    const timeline = detailTimeline(item());
    expect(timeline.label).toBe('Jornada de Lucas Bittencourt, qui, 12/11');
    expect(timeline.segments).toEqual([
      { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
      { start: '12:00', end: '13:00', kind: 'locked', label: 'Almoço' },
      { start: '17:00', end: '19:00', kind: 'requested', label: 'Hora extra pedida' },
      { start: '19:00', end: '19:30', kind: 'locked', label: 'Acima do limite de 2 h' },
    ]);
    expect(timeline.notes).toEqual([
      'Se aprovar, a estação bloqueia às 19h, no limite de 2 h extras.',
      'Se recusar, bloqueia às 17h, no fim da jornada.',
    ]);
  });

  it('dentro do limite, sem o trecho "acima do limite"', () => {
    const timeline = detailTimeline(item({ requestedEnd: '18:30' }));
    expect(timeline.segments.at(-1)).toEqual({
      start: '17:00',
      end: '18:30',
      kind: 'requested',
      label: 'Hora extra pedida',
    });
    expect(timeline.notes[0]).toBe('Se aprovar, a estação bloqueia às 18h30.');
  });

  it('aprovado: a hora extra aparece liberada', () => {
    const timeline = detailTimeline(item({ requestedEnd: '18:30', status: 'aprovado' }));
    expect(timeline.segments.at(-1)).toMatchObject({
      kind: 'unlocked',
      label: 'Hora extra aprovada',
    });
    expect(timeline.notes).toEqual(['A estação bloqueia às 18h30.']);
  });

  it('aguardando o RH: diz o que acontece com e sem a validação', () => {
    expect(detailTimeline(item({ status: 'aguardando_rh' })).notes).toEqual([
      'Se o RH validar, a estação bloqueia às 19h, no limite de 2 h extras.',
      'Sem a validação, bloqueia às 17h, no fim da jornada.',
    ]);
  });

  it('recusado: só a jornada, e a estação bloqueia no fim dela', () => {
    const timeline = detailTimeline(item({ status: 'recusado' }));
    expect(timeline.segments).toHaveLength(2);
    expect(timeline.notes).toEqual(['A estação bloqueia às 17h, no fim da jornada.']);
  });

  it('jornada que atravessa a meia-noite (Noturna, 22h às 6h)', () => {
    const noturna = { name: 'jornada Noturna', start: 1320, end: 1800, breaks: [] };
    const timeline = detailTimeline(item({ currentEnd: '06:00', requestedEnd: '07:30' }, noturna));
    expect(timeline.segments).toEqual([
      { start: '22:00', end: '06:00', kind: 'unlocked', label: 'Jornada' },
      { start: '06:00', end: '07:30', kind: 'requested', label: 'Hora extra pedida' },
    ]);
    expect(timeline.notes[0]).toBe('Se aprovar, a estação bloqueia às 7h30.');
  });

  it('sem jornada prevista no dia', () => {
    expect(detailTimeline(item({}, null as never))).toEqual({
      label: 'Jornada de Lucas Bittencourt, qui, 12/11',
      segments: [],
      notes: ['Sem jornada prevista neste dia.'],
    });
  });
});

describe('nowMarker', () => {
  it('só no dia do pedido', () => {
    expect(nowMarker('2026-11-12', Date.parse('2026-11-12T18:05:00-03:00'))).toBe('18:05');
    expect(nowMarker('2026-11-13', Date.parse('2026-11-12T18:05:00-03:00'))).toBeUndefined();
  });
});

describe('historyEntries', () => {
  it('do mais antigo para o mais novo, com dia e hora', () => {
    const events: ActivityEvent[] = [
      {
        id: 'evt-2',
        type: 'pedido_aprovado',
        at: '2026-11-12T18:03:00-03:00',
        summary: 'Renata Albuquerque aprovou o pedido de Lucas Bittencourt.',
      },
      {
        id: 'evt-1',
        type: 'pedido_criado',
        at: '2026-11-12T16:00:00-03:00',
        summary: 'Lucas Bittencourt pediu extensão até 19h30 (Entrega de proposta comercial).',
      },
    ];
    expect(historyEntries(events)).toEqual([
      {
        id: 'evt-1',
        at: '2026-11-12T16:00:00-03:00',
        when: 'qui, 12/11 às 16h',
        summary: 'Lucas Bittencourt pediu extensão até 19h30 (Entrega de proposta comercial).',
      },
      {
        id: 'evt-2',
        at: '2026-11-12T18:03:00-03:00',
        when: 'qui, 12/11 às 18h03',
        summary: 'Renata Albuquerque aprovou o pedido de Lucas Bittencourt.',
      },
    ]);
  });
});
