import { DailyGroupStats, Employee, ExtensionRequest } from '../../../shared/models';
import { todayRequestsByStatus, weekOvertime } from './today-charts';

const NOW = Date.parse('2026-11-12T15:00:00-03:00');

const employees = new Map<string, Employee>([
  ['col-1', { id: 'col-1', name: 'Ana', email: '', jobTitle: '', groupId: 'grp-ti' }],
  ['col-2', { id: 'col-2', name: 'Bia', email: '', jobTitle: '', groupId: 'grp-rh' }],
]);

function request(
  id: string,
  employeeId: string,
  status: ExtensionRequest['status'],
  createdAt: string,
): ExtensionRequest {
  return {
    id,
    employeeId,
    status,
    createdAt,
    date: '2026-11-12',
    currentEnd: '17:00',
    requestedEnd: '18:00',
    reason: '',
    expiresAt: '2026-11-12T21:00:00Z',
    decisions: [],
  };
}

const REQUESTS = [
  request('p1', 'col-1', 'aguardando_gestor', '2026-11-12T13:00:00Z'),
  request('p2', 'col-2', 'aprovado', '2026-11-12T14:00:00Z'),
  request('p3', 'col-1', 'aprovado', '2026-11-12T12:00:00Z'),
  // 23h30 de ontem em São Paulo: não é de hoje.
  request('p4', 'col-1', 'recusado', '2026-11-12T02:30:00Z'),
];

describe('gráficos do painel Hoje', () => {
  it('pedidos de hoje por status, com todos os status e o rótulo do badge', () => {
    const data = todayRequestsByStatus(REQUESTS, employees, null, NOW);
    expect(data.map((d) => d.label)).toEqual([
      'Aguardando gestor',
      'Aguardando RH',
      'Aprovado',
      'Recusado',
      'Expirado',
      'Cancelado',
    ]);
    expect(data.map((d) => d.value)).toEqual([1, 0, 2, 0, 0, 0]);
  });

  it('respeita o grupo escolhido', () => {
    const data = todayRequestsByStatus(REQUESTS, employees, 'grp-rh', NOW);
    expect(data.map((d) => d.value)).toEqual([0, 0, 1, 0, 0, 0]);
  });

  it('horas extras dos últimos 7 dias, em horas', () => {
    const rows: DailyGroupStats[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-11-${String(i + 3).padStart(2, '0')}`,
      groupId: 'grp-ti',
      overtimeMinutes: 90,
      approvedCount: 1,
      blockedMinutes: 0,
      absentCount: 0,
      scheduledCount: 0,
    }));
    const week = weekOvertime(rows, null);
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ label: '06/11', value: 1.5 });
    expect(weekOvertime(rows, 'grp-rh')).toEqual([]);
  });
});
