import { Component, inject, input, signal } from '@angular/core';
import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, screen } from 'storybook/test';
import { Button } from '../button/button';
import { Toast } from './toast';

/** Página de exemplo: um botão que mostra o aviso. */
@Component({
  selector: 'app-toast-demo',
  imports: [Button],
  template: `
    <button app-button type="button" (click)="show()">{{ trigger() }}</button>
    <p role="status">{{ log() }}</p>
  `,
})
class ToastDemo {
  readonly trigger = input.required<string>();
  readonly message = input.required<string>();
  readonly withUndo = input(false);
  protected readonly log = signal('');
  private readonly toast = inject(Toast);

  protected show() {
    this.log.set('');
    this.toast.show({
      message: this.message(),
      undo: this.withUndo() ? () => this.log.set('Ação desfeita.') : undefined,
    });
  }
}

const meta: Meta<ToastDemo> = {
  title: 'Componentes/Toast (aviso)',
  component: ToastDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Aviso curto no rodapé, anunciado para leitor de tela: `toast.show({ message, undo })`.',
          'Com `undo`, mostra "Desfazer" e fica 10 s; sem, 5 s. O tempo para com o mouse ou o foco no aviso.',
          'Esc ou o botão de fechar tiram o aviso e devolvem o foco para onde estava.',
        ].join(' '),
      },
    },
  },
  // Mostra o aviso para o addon de acessibilidade conferir.
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(await screen.findByRole('button', { name: 'Fechar aviso' })).toBeVisible();
  },
};

export default meta;
type Story = StoryObj<ToastDemo>;

export const Simples: Story = {
  args: { trigger: 'Salvar regra', message: 'Regra salva' },
};

export const ComDesfazer: Story = {
  name: 'Com "Desfazer"',
  args: { trigger: 'Aprovar pedido', message: 'Pedido de Ana Ribeiro aprovado', withUndo: true },
};
