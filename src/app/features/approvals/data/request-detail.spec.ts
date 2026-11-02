import { ActivityEvent } from '../../../shared/models';
import { historyEntries, nowMarker } from './request-detail';

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
