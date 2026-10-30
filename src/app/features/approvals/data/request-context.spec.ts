import { createFixtures } from '../../../mocks/fixtures';
import { ExtensionRequest, ScheduleException, WorkSchedule } from '../../../shared/models';
import { appliesTo } from '../../../shared/schedule-engine';
import { requestContext, RequestContextInput } from './request-context';

describe('requestContext', () => {
  describe('com os dados de demonstração', () => {
    // Quinta de manhã: os pedidos em aberto caem na jornada de hoje (12/11).
    const data = createFixtures(new Date('2026-11-12T10:00:00-03:00'));

    function contextOf(id: string) {
      const request = data.requests.find((r) => r.id === id)!;
      const employee = data.employees.find((e) => e.id === request.employeeId)!;
      return requestContext({
        request,
        schedule: data.schedules.find((s) => appliesTo(s, employee))!,
        exceptions: data.exceptions.filter((e) => e.employeeId === employee.id),
        holidays: data.holidays,
        history: data.requests.filter((r) => r.employeeId === employee.id),
      });
    }

    it('ped-02 passa de 2 h extras no dia e diz até quando a estação libera', () => {
      const context = contextOf('ped-02');
      expect(context.extraMinutes).toBe(150);
      expect(context.alerts).toEqual([
        {
          kind: 'limite_diario',
          title: 'Passa de 2 h extras no dia',
          detail: 'Pede 2h30. Se aprovar, a estação libera só até 19h.',
        },
      ]);
    });

    it('ped-04 quebra a interjornada e diz a que horas a estação libera no dia seguinte', () => {
      const context = contextOf('ped-04');
      expect(context.extraMinutes).toBe(90);
      expect(context.alerts).toEqual([
        {
          kind: 'interjornada',
          title: 'Quebra o descanso de 11 h entre jornadas',
          detail: 'No dia seguinte, a estação só libera às 10h30, e não às 10h.',
        },
      ]);
    });

    it('pedido dentro das regras não tem alerta', () => {
      expect(contextOf('ped-01').alerts).toEqual([]);
      expect(contextOf('ped-07').alerts).toEqual([]); // Noturna: 6h → 7h30, volta às 22h
    });

    it('diz se ainda vai para a validação do RH, conforme a regra', () => {
      expect(contextOf('ped-01').needsHrValidation).toBe(true); // Comercial
      expect(contextOf('ped-04').needsHrValidation).toBe(false); // Tarde
    });

    it('soma as horas extras já aprovadas no mês', () => {
      expect(contextOf('ped-02').monthOvertimeMinutes).toBe(90); // ped-16: 17h → 18h30
      expect(contextOf('ped-03').monthOvertimeMinutes).toBe(120); // ped-18: 17h → 19h
      expect(contextOf('ped-05').monthOvertimeMinutes).toBe(0);
    });
  });

  describe('regras', () => {
    const TARDE: WorkSchedule = {
      id: 'regra-tarde',
      name: 'Tarde',
      weekdays: [1, 2, 3, 4, 5, 6],
      start: '14:00',
      end: '22:00',
      breaks: [{ label: 'Pausa', start: '18:00', end: '19:00' }],
      warningMinutes: [15, 5],
      requiresHrValidation: false,
      observationMode: false,
      assignment: { groupIds: [], excludedEmployeeIds: [] },
    };
    // 12/11/2026 é quinta; 13/11 é sexta.
    const nextDayAt10: ScheduleException = {
      id: 'exc',
      employeeId: 'col-01',
      date: '2026-11-13',
      kind: 'horario',
      start: '10:00',
      end: '18:00',
      breaks: [],
      reason: 'Treinamento',
    };

    function pedido(
      requestedEnd: string,
      overrides: Partial<ExtensionRequest> = {},
    ): ExtensionRequest {
      return {
        id: 'ped-x',
        employeeId: 'col-01',
        date: '2026-11-12',
        currentEnd: '22:00',
        requestedEnd,
        reason: 'Atendimento a cliente',
        status: 'aguardando_gestor',
        createdAt: '2026-11-12T19:00:00-03:00',
        expiresAt: '2026-11-12T23:00:00-03:00',
        decisions: [],
        ...overrides,
      };
    }

    function context(request: ExtensionRequest, input: Partial<RequestContextInput> = {}) {
      return requestContext({
        request,
        schedule: TARDE,
        exceptions: [],
        holidays: [],
        history: [],
        ...input,
      });
    }

    const kinds = (request: ExtensionRequest, input?: Partial<RequestContextInput>) =>
      context(request, input).alerts.map((a) => a.kind);

    it('exatamente 2 h extras não passa do limite; 2h01 passa', () => {
      expect(kinds(pedido('00:00'))).toEqual([]);
      expect(kinds(pedido('00:01'))).toEqual(['limite_diario']);
    });

    it('a interjornada conta do fim liberado, que nunca passa de 2 h extras', () => {
      // Pede até 0h30 (+2h30), mas a estação libera só até 0h: descanso até 11h, entrada às 10h.
      const { alerts, unlockedUntil } = context(pedido('00:30'), { exceptions: [nextDayAt10] });
      expect(unlockedUntil).toBe(24 * 60);
      expect(alerts.map((a) => a.detail)).toEqual([
        'Pede 2h30. Se aprovar, a estação libera só até 0h.',
        'No dia seguinte, a estação só libera às 11h, e não às 10h.',
      ]);
    });

    it('sem jornada no dia seguinte, não há interjornada para quebrar', () => {
      const sabado = pedido('23:30', { date: '2026-11-14' }); // domingo sem jornada Tarde
      expect(kinds(sabado)).toEqual([]);
    });

    it('descanso de 11 h que termina antes da entrada não gera alerta', () => {
      // Sai às 23h e volta às 14h: 15 h de descanso.
      expect(kinds(pedido('23:00'))).toEqual([]);
    });

    it('no mês, só conta pedido aprovado do mesmo mês, até 2 h por dia', () => {
      const history = [
        pedido('23:00', { id: 'a', date: '2026-11-03', status: 'aprovado' }), // 1 h
        pedido('01:00', { id: 'b', date: '2026-11-04', status: 'aprovado' }), // 3 h, conta 2 h
        pedido('23:00', { id: 'c', date: '2026-11-05', status: 'recusado' }),
        pedido('23:00', { id: 'd', date: '2026-10-30', status: 'aprovado' }), // outro mês
        pedido('23:00', { id: 'ped-x', status: 'aprovado' }), // o próprio pedido
      ];
      expect(context(pedido('23:00'), { history }).monthOvertimeMinutes).toBe(180);
    });
  });
});
