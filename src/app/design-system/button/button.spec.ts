import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button, ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `
    <form (submit)="submitted = true; $event.preventDefault()">
      <button
        app-button
        type="submit"
        [variant]="variant()"
        [loading]="loading()"
        [disabled]="disabled()"
        icon="check"
        (click)="clicks = clicks + 1"
      >
        Aprovar
      </button>
    </form>
    <a app-button href="/aprovacoes" variant="ghost">Ver pedidos</a>
  `,
})
class Host {
  readonly variant = signal<ButtonVariant>('primary');
  readonly loading = signal(false);
  readonly disabled = signal(false);
  clicks = 0;
  submitted = false;
}

describe('Button', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      button: root.querySelector('button') as HTMLButtonElement,
      link: root.querySelector('a') as HTMLAnchorElement,
    };
  }

  it('é o próprio <button>, com a variante e o ícone', async () => {
    const { button, host, fixture } = await render();
    expect(button.textContent?.trim()).toBe('Aprovar');
    expect(button.dataset['variant']).toBe('primary');
    expect(button.dataset['size']).toBe('md');
    expect(button.querySelector('app-icon')).not.toBeNull();

    host.variant.set('danger');
    await fixture.whenStable();
    expect(button.dataset['variant']).toBe('danger');
  });

  it('dispara o clique e envia o formulário quando está livre', async () => {
    const { button, host } = await render();
    button.click();
    expect(host.clicks).toBe(1);
    expect(host.submitted).toBe(true);
  });

  it('em loading, mostra o spinner, usa aria-busy e continua focável', async () => {
    const { button, host, fixture } = await render();
    host.loading.set(true);
    await fixture.whenStable();

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    expect(button.querySelector('.spinner')).not.toBeNull();
    expect(button.querySelector('app-icon')).toBeNull();

    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('em loading, ignora o clique e não envia o formulário', async () => {
    const { button, host, fixture } = await render();
    host.loading.set(true);
    await fixture.whenStable();

    button.click();
    expect(host.clicks).toBe(0);
    expect(host.submitted).toBe(false);
  });

  it('disabled usa o atributo nativo', async () => {
    const { button, host, fixture } = await render();
    host.disabled.set(true);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('aria-disabled')).toBe(false);
  });

  it('como <a>, continua link e não ganha estados de botão', async () => {
    const { link } = await render();
    expect(link.getAttribute('href')).toBe('/aprovacoes');
    expect(link.dataset['variant']).toBe('ghost');
    expect(link.hasAttribute('disabled')).toBe(false);
    expect(link.hasAttribute('aria-busy')).toBe(false);
  });
});
