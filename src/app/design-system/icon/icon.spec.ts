import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { ICONS } from './icons';

describe('Icon', () => {
  async function render(name: keyof typeof ICONS) {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('desenha o SVG do ícone pedido', async () => {
    const host = await render('check');
    expect(host.querySelector('path')?.getAttribute('d')).toBe(ICONS.check);
    expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -960 960 960');
  });

  it('fica escondido do leitor de tela e fora da ordem de foco', async () => {
    const host = await render('lock');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('svg')?.getAttribute('focusable')).toBe('false');
  });
});
