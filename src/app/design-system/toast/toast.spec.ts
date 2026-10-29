import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Toast, ToastOptions } from './toast';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Toast', () => {
  let toast: Toast;

  beforeEach(() => {
    toast = TestBed.inject(Toast);
  });

  async function show(options: ToastOptions) {
    toast.show(options);
    await TestBed.inject(ApplicationRef).whenStable();
    return document.querySelector<HTMLElement>('.toast');
  }

  async function settle() {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  const buttons = (element: HTMLElement | null) =>
    Array.from(element?.querySelectorAll('button') ?? []);

  it('mostra a mensagem e anuncia para o leitor de tela', async () => {
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
    const element = await show({ message: 'Regra salva' });

    expect(element?.querySelector('.message')?.textContent).toBe('Regra salva');
    expect(announce).toHaveBeenCalledWith('Regra salva', 'polite');
  });

  it('sem undo, só tem o botão de fechar, com nome acessível', async () => {
    const element = await show({ message: 'Regra salva' });
    const [close] = buttons(element);
    expect(buttons(element)).toHaveLength(1);
    expect(close.getAttribute('aria-label')).toBe('Fechar aviso');
  });

  it('"Desfazer" chama o undo uma vez e fecha o aviso', async () => {
    const undo = vi.fn();
    const element = await show({ message: 'Pedido aprovado', undo });
    const [undoButton] = buttons(element);

    expect(undoButton.textContent?.trim()).toBe('Desfazer');
    undoButton.click();
    await settle();

    expect(undo).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.toast')).toBeNull();
  });

  it('some sozinho depois do tempo', async () => {
    await show({ message: 'Regra salva', duration: 30 });
    await wait(80);
    await settle();
    expect(document.querySelector('.toast')).toBeNull();
  });

  it('para o tempo com o mouse em cima e retoma ao sair', async () => {
    const element = await show({ message: 'Pedido aprovado', duration: 40 });
    const panel = element?.parentElement;
    panel?.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(100);
    await settle();
    expect(document.querySelector('.toast')).not.toBeNull();

    panel?.dispatchEvent(new MouseEvent('mouseleave'));
    await wait(100);
    await settle();
    expect(document.querySelector('.toast')).toBeNull();
  });

  it('para o tempo com o foco dentro; Esc fecha e devolve o foco', async () => {
    const before = document.body.appendChild(document.createElement('button'));
    before.focus();
    const element = await show({ message: 'Pedido aprovado', undo: vi.fn(), duration: 40 });
    const [undoButton] = buttons(element);

    undoButton.focus();
    await wait(100);
    await settle();
    expect(document.querySelector('.toast')).not.toBeNull();

    undoButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(document.querySelector('.toast')).toBeNull();
    expect(document.activeElement).toBe(before);
    before.remove();
  });

  it('um aviso novo substitui o anterior', async () => {
    const firstUndo = vi.fn();
    await show({ message: 'Pedido aprovado', undo: firstUndo });
    const element = await show({ message: 'Pedido recusado' });

    expect(document.querySelectorAll('.toast')).toHaveLength(1);
    expect(element?.querySelector('.message')?.textContent).toBe('Pedido recusado');
    expect(buttons(element)).toHaveLength(1);
    toast.dismiss();
  });
});
