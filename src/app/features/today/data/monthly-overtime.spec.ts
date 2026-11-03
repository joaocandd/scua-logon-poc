import { createFixtures } from '../../../mocks/fixtures';
import { estimatedCost, monthlyOvertime, MonthlyOvertimeInput } from './monthly-overtime';

// Terça-feira, 3/11, 18h20. Os pedidos aprovados das fixtures caem três em novembro (hoje, na Tarde
// e na Flexível) e três em outubro (antes do feriado de Finados).
const NOW = new Date('2026-11-03T18:20:00-03:00');
const data = createFixtures(NOW);

const input: MonthlyOvertimeInput = {
  requests: data.requests,
  employees: data.employees,
  schedules: data.schedules,
  exceptions: data.exceptions,
  holidays: data.holidays,
  today: '2026-11-03',
};

describe('monthlyOvertime', () => {
  it('soma as horas aprovadas do mês até hoje e do mês anterior inteiro', () => {
    expect(monthlyOvertime(input)).toEqual({
      // Igor 22h → 23h, Natália 19h → 21h e Tatiane 22h → 23h30.
      current: { label: 'Novembro até hoje', monthName: 'novembro', minutes: 270, requestCount: 3 },
      // Lucas 17h → 18h30, Márcio 6h → 8h (Noturna) e Larissa 17h → 19h.
      previous: { label: 'Outubro inteiro', monthName: 'outubro', minutes: 330, requestCount: 3 },
    });
  });

  it('só os pedidos do grupo escolhido', () => {
    const comercial = data.employees.filter((e) => e.groupId === 'grp-comercial');
    const { current, previous } = monthlyOvertime({ ...input, employees: comercial });
    expect([current.minutes, previous.minutes, previous.requestCount]).toEqual([0, 90, 1]);
  });

  it('pedido acima de 2 h conta só 2 h, como na estação', () => {
    const lucas = data.requests.find((r) => r.id === 'ped-16')!;
    const long = { ...lucas, requestedEnd: '21:00' };
    const { previous } = monthlyOvertime({ ...input, requests: [long] });
    expect(previous.minutes).toBe(120);
  });

  it('em janeiro, o mês anterior é dezembro do ano anterior', () => {
    const { current, previous } = monthlyOvertime({ ...input, today: '2027-01-05' });
    expect([current.label, previous.label]).toEqual(['Janeiro até hoje', 'Dezembro inteiro']);
    expect(previous.minutes).toBe(0);
  });
});

describe('estimatedCost', () => {
  it('horas aprovadas vezes o custo médio da hora extra', () => {
    expect(estimatedCost(270, 45)).toBe(202.5);
    expect(estimatedCost(0, 45)).toBe(0);
  });
});
