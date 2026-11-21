import { TestBed } from '@angular/core/testing';
import { startDemoClock, stopDemoClock } from '../../shared/clock';
import { DemoClockBanner, demoClockLabel } from './demo-clock-banner';

describe('DemoClockBanner', () => {
  afterEach(() => stopDemoClock(null));

  it('dia da semana por extenso, data e hora de São Paulo', () => {
    expect(demoClockLabel(Date.parse('2026-11-24T17:40:00-03:00'))).toBe('terça, 24/11, 17h40');
    expect(demoClockLabel(Date.parse('2026-11-21T09:05:00-03:00'))).toBe('sábado, 21/11, 9h05');
  });

  it('sem o relógio de demonstração, não aparece', async () => {
    const fixture = TestBed.createComponent(DemoClockBanner);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
  });

  it('ligado, mostra a hora do relógio e o botão "Desligar"', async () => {
    startDemoClock('?relogio=2026-11-24T17:40', null);
    const fixture = TestBed.createComponent(DemoClockBanner);
    await fixture.whenStable();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe('Relógio de demonstração');
    // O espaço entre os elementos vem da margem (gap) da faixa.
    expect(section?.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Relógio de demonstração: terça, 24/11, 17h40',
    );
    expect(section?.querySelector('button')?.textContent?.trim()).toBe('Desligar');
  });
});
