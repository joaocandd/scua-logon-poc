import { ApplicationRef, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog, ConfirmOptions } from './confirm-dialog';

@Component({
  template: `<button type="button" (click)="ask()">Aprovar selecionados</button>`,
})
class Host {
  private readonly confirm = inject(ConfirmDialog);
  answer?: Promise<boolean>;

  ask(options: Partial<ConfirmOptions> = {}) {
    this.answer = this.confirm.open({
      title: 'Aprovar 3 pedidos?',
      message: 'Ana, Bruno e Carla vão poder trabalhar até o horário pedido.',
      confirmLabel: 'Aprovar 3 pedidos',
      ...options,
    });
  }
}

describe('ConfirmDialog', () => {
  async function open(options: Partial<ConfirmOptions> = {}) {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const opener = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    opener.focus();
    fixture.componentInstance.ask(options);
    await TestBed.inject(ApplicationRef).whenStable();

    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const [cancel, confirm] = Array.from(dialog.querySelectorAll('button'));
    return { fixture, opener, dialog, cancel, confirm, answer: fixture.componentInstance.answer! };
  }

  async function settle() {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('abre um alertdialog com nome e descrição', async () => {
    const { dialog } = await open();
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    const message = document.getElementById(dialog.getAttribute('aria-describedby')!);
    expect(title?.textContent).toBe('Aprovar 3 pedidos?');
    expect(message?.textContent).toBe(
      'Ana, Bruno e Carla vão poder trabalhar até o horário pedido.',
    );
  });

  it('começa com o foco em "Cancelar"', async () => {
    const { cancel, confirm } = await open();
    expect(cancel.textContent?.trim()).toBe('Cancelar');
    expect(confirm.textContent?.trim()).toBe('Aprovar 3 pedidos');
    expect(document.activeElement).toBe(cancel);
  });

  it('resolve true ao confirmar e devolve o foco a quem abriu', async () => {
    const { confirm, opener, answer } = await open();
    confirm.click();
    await settle();

    await expect(answer).resolves.toBe(true);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('resolve false ao cancelar', async () => {
    const { cancel, answer } = await open();
    cancel.click();
    await settle();
    await expect(answer).resolves.toBe(false);
  });

  it('Esc fecha como "Cancelar" e devolve o foco', async () => {
    const { cancel, opener, answer } = await open();
    cancel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await settle();

    await expect(answer).resolves.toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('usa a variante danger e os rótulos pedidos', async () => {
    const { cancel, confirm } = await open({
      title: 'Excluir a regra Comercial?',
      confirmLabel: 'Excluir regra',
      cancelLabel: 'Manter regra',
      variant: 'danger',
    });
    expect(cancel.textContent?.trim()).toBe('Manter regra');
    expect(confirm.dataset['variant']).toBe('danger');
    cancel.click();
    await settle();
  });

  it('sem mensagem, não aponta aria-describedby para nada', async () => {
    const { dialog, cancel } = await open({ message: undefined });
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
    cancel.click();
    await settle();
  });
});
