import { TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { BarChart } from './bar-chart';
import { ChartBase } from './chart-base';
import {
  axisMargin,
  barPath,
  ChartDatum,
  niceScale,
  visibleLabels,
  visibleValues,
} from './chart-scale';
import { LineChart } from './line-chart';

const WEEK: ChartDatum[] = [
  { label: '14/11', value: 2, longLabel: 'sexta, 14/11' },
  { label: '15/11', value: 0 },
  { label: '16/11', value: 7 },
  { label: '17/11', value: 3.5 },
];

const hours = (value: number) => `${value.toLocaleString('pt-BR')} h`;

describe('niceScale', () => {
  it('começa no zero e termina num valor redondo acima do maior', () => {
    expect(niceScale(7)).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(43)).toEqual({ max: 50, ticks: [0, 10, 20, 30, 40, 50] });
    expect(niceScale(1180)).toEqual({ max: 1250, ticks: [0, 250, 500, 750, 1000, 1250] });
  });

  it('valor já redondo vira o topo do eixo', () => {
    expect(niceScale(20).max).toBe(20);
  });

  it('tudo zero (ou nada) tem eixo de 0 a 1', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
  });

  it('valores pequenos com decimais', () => {
    expect(niceScale(0.7)).toEqual({ max: 0.8, ticks: [0, 0.2, 0.4, 0.6, 0.8] });
  });
});

describe('visibleLabels e visibleValues', () => {
  it('mostra todos os rótulos quando cabem; senão um a cada N, sempre com o último', () => {
    expect(visibleLabels(4, 60)).toEqual([true, true, true, true]);
    expect(visibleLabels(5, 20, 44)).toEqual([false, true, false, false, true]);
  });

  it('escreve todos os valores quando cabem; senão só o maior e o último', () => {
    expect(visibleValues([1, 5, 2], 40)).toEqual([true, true, true]);
    expect(visibleValues([1, 5, 2], 10)).toEqual([false, true, true]);
    // Tudo zero: só o último.
    expect(visibleValues([0, 0, 0], 10)).toEqual([false, false, true]);
  });

  it('margem esquerda cabe o maior rótulo do eixo', () => {
    expect(axisMargin(['0', '1.250'])).toBe(43);
  });
});

describe('barPath', () => {
  it('altura zero não desenha nada', () => {
    expect(barPath(0, 100, 20, 0)).toBe('');
  });

  it('topo arredondado em 4 px e base reta', () => {
    expect(barPath(10, 20, 20, 80)).toBe('M10,100 V24 Q10,20 14,20 H26 Q30,20 30,24 V100 Z');
  });
});

describe.each([
  ['BarChart', BarChart],
  ['LineChart', LineChart],
] as [string, Type<ChartBase>][])('%s', (_, component) => {
  async function render(data: ChartDatum[] = WEEK) {
    const fixture = TestBed.createComponent(component);
    fixture.componentRef.setInput('heading', 'Horas extras por dia');
    fixture.componentRef.setInput('description', 'Horas aprovadas, pelo dia da jornada.');
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('format', hours);
    fixture.componentRef.setInput('valueHeader', 'Horas extras');
    await fixture.whenStable();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  const marks = (host: HTMLElement) => [...host.querySelectorAll<SVGGElement>('g.mark')];

  it('tem título, descrição e o SVG nomeado pelo título', async () => {
    const { host } = await render();
    const heading = host.querySelector('h3');
    expect(heading?.textContent?.trim()).toBe('Horas extras por dia');
    expect(host.textContent).toContain('Horas aprovadas, pelo dia da jornada.');
    const svg = host.querySelector('svg.svg');
    expect(svg?.getAttribute('role')).toBe('group');
    expect(svg?.getAttribute('aria-labelledby')).toBe(heading?.id);
  });

  it('eixo vertical com a escala certa', async () => {
    const { host } = await render();
    const ticks = [...host.querySelectorAll('text.tick')].map((t) => t.textContent?.trim());
    expect(ticks).toEqual(['0 h', '2 h', '4 h', '6 h', '8 h']);
  });

  it('cada ponto tem nome e valor escrito; só um ponto entra no Tab', async () => {
    const { host } = await render();
    expect(marks(host).map((m) => m.getAttribute('aria-label'))).toEqual([
      'sexta, 14/11: 2 h',
      '15/11: 0 h',
      '16/11: 7 h',
      '17/11: 3,5 h',
    ]);
    expect(marks(host).map((m) => m.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    const values = [...host.querySelectorAll('text.value')].map((t) => t.textContent?.trim());
    expect(values).toEqual(['2 h', '0 h', '7 h', '3,5 h']);
  });

  it('setas, Home e End passam o foco; o tooltip mostra o ponto com foco; Esc fecha', async () => {
    const { fixture, host } = await render();
    marks(host)[0].focus();
    await fixture.whenStable();
    expect(host.querySelector('.tooltip')?.textContent).toContain('2 h');

    const svg = host.querySelector('svg.svg')!;
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(marks(host)[1]);
    expect(marks(host)[1].getAttribute('tabindex')).toBe('0');

    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(marks(host)[3]);
    expect(host.querySelector('.tooltip')?.textContent).toContain('3,5 h');
    expect(host.querySelector('.focus-ring')).not.toBeNull();

    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(host.querySelector('.tooltip')).toBeNull();
  });

  it('o mouse sobre um ponto abre o tooltip; sair do gráfico fecha', async () => {
    const { fixture, host } = await render();
    marks(host)[2].dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    expect(host.querySelector('.tooltip')?.textContent).toContain('7 h');
    host.querySelector('.plot')!.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(host.querySelector('.tooltip')).toBeNull();
  });

  it('"Ver como tabela" mostra os mesmos números', async () => {
    const { fixture, host } = await render();
    const toggle = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ver como tabela'),
    )!;
    const table = host.querySelector('table')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(table.closest('[hidden]')).not.toBeNull();

    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('Ver como gráfico');
    expect(table.closest('[hidden]')).toBeNull();
    expect(host.querySelector('svg.svg')?.closest('[hidden]')).not.toBeNull();
    expect(table.querySelector('caption')?.textContent?.trim()).toBe('Horas extras por dia');
    const rows = [...table.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.children].map((c) => c.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['sexta, 14/11', '2 h'],
      ['15/11', '0 h'],
      ['16/11', '7 h'],
      ['17/11', '3,5 h'],
    ]);
    expect(toggle.getAttribute('aria-controls')).toBe(table.parentElement?.id);
  });

  it('sem dados, mostra o texto de vazio no lugar do gráfico', async () => {
    const { host } = await render([]);
    expect(host.querySelector('svg.svg')).toBeNull();
    expect(host.textContent).toContain('Nenhum dado no período.');
    expect(host.querySelector('button')).toBeNull();
  });
});

describe('BarChart deitado', () => {
  it('rótulo de cada categoria à esquerda, valor na ponta e o mesmo teclado', async () => {
    const fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('heading', 'Pedidos de hoje por status');
    fixture.componentRef.setInput('orientation', 'horizontal');
    fixture.componentRef.setInput('data', [
      { label: 'Aguardando gestor', value: 8 },
      { label: 'Aprovado', value: 0 },
    ]);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const text = (selector: string) =>
      [...host.querySelectorAll(selector)].map((t) => t.textContent?.trim());
    expect(text('text.category')).toEqual(['Aguardando gestor', 'Aprovado']);
    expect(text('text.value')).toEqual(['8', '0']);
    // Valor zero não desenha barra.
    expect(host.querySelectorAll('path.bar')).toHaveLength(1);
    const marks = [...host.querySelectorAll<SVGGElement>('g.mark')];
    expect(marks.map((m) => m.getAttribute('aria-label'))).toEqual([
      'Aguardando gestor: 8',
      'Aprovado: 0',
    ]);
    marks[0].focus();
    host
      .querySelector('svg.svg')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(marks[1]);
    expect(host.querySelector('.tooltip')?.textContent).toContain('Aprovado');
  });
});
