import { ActivityEvent, Employee } from '../../../shared/models';
import { auditCsv, auditPeople, auditRows, parseAuditPeriod, parseKind } from './audit-log';

const NOW = Date.parse('2026-11-12T15:00:00-03:00');

const people = new Map<string, Employee>([
  ['col-07', { id: 'col-07', name: 'Marina Couto', email: '', jobTitle: '', groupId: 'g' }],
  ['col-08', { id: 'col-08', name: 'João Pedro Antunes', email: '', jobTitle: '', groupId: 'g' }],
  ['col-37', { id: 'col-37', name: 'Juliana Prado', email: '', jobTitle: '', groupId: 'g' }],
]);

// Do mais novo para o mais antigo, como a API.
const EVENTS: ActivityEvent[] = [
  {
    id: 'e5',
    type: 'pedido_aprovado',
    at: '2026-11-12T21:03:00Z',
    actorId: 'col-07',
    employeeId: 'col-08',
    summary: 'Marina Couto aprovou o pedido de João Pedro Antunes.',
  },
  {
    id: 'e4',
    type: 'acesso',
    at: '2026-11-12T12:00:00Z',
    actorId: 'col-07',
    summary: 'Marina Couto entrou no Scua Logon.',
  },
  {
    id: 'e3',
    type: 'pedido_expirado',
    at: '2026-11-10T22:00:00Z',
    employeeId: 'col-08',
    summary: 'O pedido de João Pedro Antunes expirou sem decisão.',
  },
  {
    id: 'e2',
    type: 'regra_salva',
    at: '2026-11-01T12:00:00Z',
    actorId: 'col-37',
    summary: 'Juliana Prado salvou a regra Tarde; com "aspas".',
  },
  {
    id: 'e1',
    type: 'regra_criada',
    at: '2026-10-01T12:00:00Z',
    actorId: 'col-37',
    summary: 'Juliana Prado criou a regra Flexível.',
  },
];

const all = { personId: null, kind: null, period: '30' } as const;

describe('auditoria', () => {
  it('filtros da URL', () => {
    expect(parseKind('acessos')).toBe('acessos');
    expect(parseKind('outro')).toBeNull();
    expect(parseAuditPeriod('hoje')).toBe('hoje');
    expect(parseAuditPeriod(null)).toBe('30');
  });

  it('últimos 30 dias, com tipo, quem fez (ou o sistema) e quando', () => {
    const rows = auditRows(EVENTS, people, all, NOW);
    expect(rows.map((r) => r.id)).toEqual(['e5', 'e4', 'e3', 'e2']);
    expect(rows[0]).toMatchObject({
      when: 'qui, 12/11 às 18h03',
      typeLabel: 'Pedido aprovado',
      actor: 'Marina Couto',
    });
    expect(rows[2].actor).toBe('Sistema');
  });

  it('filtra por período, tipo e pessoa (quem fez ou quem foi afetado)', () => {
    expect(auditRows(EVENTS, people, { ...all, period: 'hoje' }, NOW)).toHaveLength(2);
    expect(auditRows(EVENTS, people, { ...all, kind: 'acessos' }, NOW).map((r) => r.id)).toEqual([
      'e4',
    ]);
    expect(auditRows(EVENTS, people, { ...all, personId: 'col-08' }, NOW).map((r) => r.id)).toEqual(
      ['e5', 'e3'],
    );
    expect(auditRows(EVENTS, people, { ...all, kind: 'regras' }, NOW).map((r) => r.id)).toEqual([
      'e2',
    ]);
  });

  it('pessoas do registro em ordem alfabética', () => {
    expect(auditPeople(EVENTS, people).map((p) => p.name)).toEqual([
      'João Pedro Antunes',
      'Juliana Prado',
      'Marina Couto',
    ]);
  });

  it('CSV com hora de São Paulo e aspas quando precisa', () => {
    const lines = auditCsv(auditRows(EVENTS, people, all, NOW)).split('\r\n');
    expect(lines[0]).toBe('Quando;Tipo;Quem;O que aconteceu');
    expect(lines[1]).toBe(
      '2026-11-12 18:03;Pedido aprovado;Marina Couto;Marina Couto aprovou o pedido de João Pedro Antunes.',
    );
    expect(lines[4]).toBe(
      '2026-11-01 09:00;Regra salva;Juliana Prado;"Juliana Prado salvou a regra Tarde; com ""aspas""."',
    );
  });
});
