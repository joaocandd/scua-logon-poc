import { TestBed } from '@angular/core/testing';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(ErrorState);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, button: host.querySelector('button') as HTMLButtonElement };
  }

  it('mostra uma mensagem humana padrão, anunciada como alerta', async () => {
    const { host } = await render();
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.querySelector('h2')?.textContent).toBe('Não foi possível carregar');
    expect(alert?.querySelector('p')?.textContent).toBe('Verifique sua conexão e tente de novo.');
  });

  it('aceita título e mensagem próprios', async () => {
    const { host } = await render({
      heading: 'Não foi possível carregar os pedidos',
      description: 'Tente de novo em alguns segundos.',
      headingLevel: 3,
    });
    expect(host.querySelector('h3')?.textContent).toBe('Não foi possível carregar os pedidos');
    expect(host.querySelector('p')?.textContent).toBe('Tente de novo em alguns segundos.');
  });

  it('"Tentar de novo" emite retry', async () => {
    const { fixture, button } = await render();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    expect(button.textContent?.trim()).toBe('Tentar de novo');
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('durante a nova tentativa, o botão fica ocupado e não emite de novo', async () => {
    const { fixture, button } = await render({ retrying: true });
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    expect(button.getAttribute('aria-busy')).toBe('true');
    button.click();
    expect(retry).not.toHaveBeenCalled();
  });
});
