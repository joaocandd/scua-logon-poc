import { TestBed } from '@angular/core/testing';
import { describeSegment, resolveDay, TimelineSegment, WorkdayTimeline } from './workday-timeline';

const COMERCIAL: TimelineSegment[] = [
  { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
  { start: '12:00', end: '13:00', kind: 'locked', label: 'Almoço' },
];

const NOTURNA: TimelineSegment[] = [
  { start: '22:00', end: '06:00', kind: 'unlocked', label: 'Jornada' },
  { start: '02:00', end: '03:00', kind: 'locked', label: 'Intervalo' },
];

describe('resolveDay', () => {
  it('cobre o dia todo e bloqueia o que não tem segmento', () => {
    expect(resolveDay([{ start: '08:00', end: '17:00', kind: 'unlocked' }])).toEqual([
      { start: 0, end: 480, kind: 'locked', label: undefined },
      { start: 480, end: 1020, kind: 'unlocked', label: undefined },
      { start: 1020, end: 1440, kind: 'locked', label: undefined },
    ]);
  });

  it('sem segmentos, o dia inteiro fica bloqueado', () => {
    expect(resolveDay([])).toEqual([{ start: 0, end: 1440, kind: 'locked', label: undefined }]);
  });

  it('o segmento que vem depois fica por cima (almoço sobre a jornada)', () => {
    expect(resolveDay(COMERCIAL).map(describeSegment)).toEqual([
      'Bloqueada da 0h às 8h',
      'Liberada das 8h às 12h (Jornada)',
      'Bloqueada das 12h às 13h (Almoço)',
      'Liberada das 13h às 17h (Jornada)',
      'Bloqueada das 17h às 24h',
    ]);
  });

  it('divide em dois o segmento que atravessa a meia-noite', () => {
    expect(resolveDay(NOTURNA).map(describeSegment)).toEqual([
      'Liberada da 0h às 2h (Jornada)',
      'Bloqueada das 2h às 3h (Intervalo)',
      'Liberada das 3h às 6h (Jornada)',
      'Bloqueada das 6h às 22h',
      'Liberada das 22h às 24h (Jornada)',
    ]);
  });

  it('trata fim 00:00 como meia-noite', () => {
    expect(resolveDay([{ start: '18:00', end: '00:00', kind: 'unlocked' }]).at(-1)).toEqual({
      start: 1080,
      end: 1440,
      kind: 'unlocked',
      label: undefined,
    });
  });

  it('junta trechos vizinhos iguais', () => {
    const day = resolveDay([
      { start: '08:00', end: '12:00', kind: 'unlocked', label: 'Jornada' },
      { start: '12:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
    ]);
    expect(day).toHaveLength(3);
    expect(day[1]).toMatchObject({ start: 480, end: 1020 });
  });

  it('recusa horário em formato errado', () => {
    expect(() => resolveDay([{ start: '8h', end: '17:00', kind: 'unlocked' }])).toThrow(
      'Horário inválido',
    );
  });
});

describe('WorkdayTimeline', () => {
  async function render(segments: TimelineSegment[], now?: string) {
    const fixture = TestBed.createComponent(WorkdayTimeline);
    fixture.componentRef.setInput('segments', segments);
    fixture.componentRef.setInput('now', now);
    fixture.componentRef.setInput('label', 'Jornada Comercial');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('é um grupo com nome e descreve os horários em texto', async () => {
    const host = await render(COMERCIAL);
    expect(host.getAttribute('role')).toBe('group');
    expect(host.getAttribute('aria-label')).toBe('Jornada Comercial');

    const items = Array.from(
      host.querySelectorAll('.cdk-visually-hidden li'),
      (li) => li.textContent,
    );
    expect(items).toEqual([
      'Bloqueada da 0h às 8h',
      'Liberada das 8h às 12h (Jornada)',
      'Bloqueada das 12h às 13h (Almoço)',
      'Liberada das 13h às 17h (Jornada)',
      'Bloqueada das 17h às 24h',
    ]);
  });

  it('desenha os trechos liberados na proporção do dia', async () => {
    const host = await render(COMERCIAL);
    const segments = Array.from(host.querySelectorAll<HTMLElement>('.segment'));
    expect(segments.map((s) => [s.style.left, s.style.width])).toEqual([
      [`${(480 / 1440) * 100}%`, `${(240 / 1440) * 100}%`],
      [`${(780 / 1440) * 100}%`, `${(240 / 1440) * 100}%`],
    ]);
  });

  it('separa trechos liberados seguidos, como jornada e hora extra', async () => {
    const host = await render([
      ...COMERCIAL,
      { start: '17:00', end: '19:30', kind: 'unlocked', label: 'Hora extra aprovada' },
    ]);
    const segments = Array.from(host.querySelectorAll('.segment'));
    expect(segments.map((s) => s.classList.contains('joined'))).toEqual([false, false, true]);
  });

  it('esconde a parte visual do leitor de tela e mostra a legenda', async () => {
    const host = await render(COMERCIAL);
    const visual = host.querySelector('.bar')?.parentElement;
    expect(visual?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('.legend')?.textContent).toContain('Liberada');
    expect(host.querySelector('.legend')?.textContent).toContain('Bloqueada');
  });

  it('sem "agora", não mostra marcador', async () => {
    const host = await render(COMERCIAL);
    expect(host.querySelector('.now-line')).toBeNull();
    expect(host.querySelector('.cdk-visually-hidden p')).toBeNull();
  });

  it('com "agora", marca a hora na barra e diz o estado nesse momento', async () => {
    const host = await render(COMERCIAL, '14:30');
    const line = host.querySelector<HTMLElement>('.now-line');
    expect(line?.style.left).toBe(`${(870 / 1440) * 100}%`);
    expect(host.querySelector('.now-label')?.textContent?.trim()).toBe('Agora 14h30');
    expect(host.querySelector('.cdk-visually-hidden p')?.textContent).toBe(
      'Agora, 14h30: liberada (Jornada).',
    );
  });

  it('no intervalo da jornada noturna, diz que está bloqueada', async () => {
    const host = await render(NOTURNA, '02:15');
    expect(host.querySelector('.cdk-visually-hidden p')?.textContent).toBe(
      'Agora, 2h15: bloqueada (Intervalo).',
    );
    expect(host.querySelector('.now-label')?.getAttribute('data-edge')).toBeNull();
  });

  it('perto da meia-noite, o rótulo "agora" encosta na borda', async () => {
    const host = await render(NOTURNA, '23:50');
    expect(host.querySelector('.now-label')?.getAttribute('data-edge')).toBe('end');
  });
});
