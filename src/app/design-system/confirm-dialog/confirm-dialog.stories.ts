import { Component, inject, input, signal } from '@angular/core';
import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, screen } from 'storybook/test';
import { Button } from '../button/button';
import { ConfirmDialog, ConfirmOptions } from './confirm-dialog';

/** Página de exemplo: um botão que abre o diálogo e mostra a resposta. */
@Component({
  selector: 'app-confirm-dialog-demo',
  imports: [Button],
  template: `
    <button app-button type="button" [variant]="options().variant ?? 'primary'" (click)="ask()">
      {{ trigger() }}
    </button>
    <p role="status">{{ answer() }}</p>
  `,
})
class ConfirmDialogDemo {
  readonly options = input.required<ConfirmOptions>();
  readonly trigger = input.required<string>();
  protected readonly answer = signal('');
  private readonly confirm = inject(ConfirmDialog);

  protected async ask() {
    const confirmed = await this.confirm.open(this.options());
    this.answer.set(confirmed ? 'Você confirmou.' : 'Você cancelou.');
  }
}

const meta: Meta<ConfirmDialogDemo> = {
  title: 'Componentes/ConfirmDialog',
  component: ConfirmDialogDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Serviço que abre um diálogo de confirmação acessível, no lugar do `confirm()` nativo:',
          '`await confirmDialog.open({ title, message, confirmLabel, variant })` devolve `true` ou `false`.',
          'Foco preso no diálogo e começando em "Cancelar"; Esc fecha; o foco volta ao botão que abriu.',
        ].join(' '),
      },
    },
  },
  // Abre o diálogo para o addon de acessibilidade conferir o conteúdo aberto.
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(await screen.findByRole('alertdialog')).toBeVisible();
  },
};

export default meta;
type Story = StoryObj<ConfirmDialogDemo>;

export const Confirmacao: Story = {
  name: 'Confirmação',
  args: {
    trigger: 'Aprovar selecionados',
    options: {
      title: 'Aprovar 3 pedidos?',
      message: 'Ana Ribeiro, Bruno Lima e Carla Souza vão poder trabalhar até o horário pedido.',
      confirmLabel: 'Aprovar 3 pedidos',
    },
  },
};

export const Destrutiva: Story = {
  args: {
    trigger: 'Excluir regra',
    options: {
      title: 'Excluir a regra Comercial?',
      message: '37 colaboradores ficam sem regra de jornada até você escolher outra.',
      confirmLabel: 'Excluir regra',
      cancelLabel: 'Manter regra',
      variant: 'danger',
    },
  },
};

export const SemMensagem: Story = {
  name: 'Sem mensagem',
  args: {
    trigger: 'Sair sem salvar',
    options: {
      title: 'Sair sem salvar as alterações?',
      confirmLabel: 'Sair sem salvar',
      cancelLabel: 'Continuar editando',
    },
  },
};
