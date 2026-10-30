import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Skeleton } from './skeleton';

const meta: Meta<Skeleton> = {
  title: 'Componentes/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Skeleton] })],
  parameters: {
    docs: {
      description: {
        component: [
          'Esqueleto de carregamento: ocupa o lugar do conteúdo que ainda não chegou, com o mesmo tamanho, para a tela não pular.',
          'É só visual. A região que carrega leva `aria-busy="true"` e um texto como "Carregando pedidos" em `role="status"`.',
          'Com movimento reduzido, para de pulsar.',
        ].join(' '),
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['text', 'heading', 'block'] },
  },
  args: { variant: 'text', width: '100%' },
};

export default meta;
type Story = StoryObj<Skeleton>;

export const Linha: Story = {};

export const Titulo: Story = { name: 'Título', args: { variant: 'heading', width: '40%' } };

export const Bloco: Story = { args: { variant: 'block', width: '8rem' } };

export const CartaoCarregando: Story = {
  name: 'Cartão carregando',
  render: () => ({
    template: `
      <div aria-busy="true" style="display: grid; gap: var(--space-2); max-width: 24rem; padding: var(--space-4); border-radius: var(--radius-lg); box-shadow: var(--shadow-ring);">
        <app-skeleton variant="heading" width="60%" />
        <app-skeleton width="40%" />
        <app-skeleton />
        <app-skeleton width="80%" />
        <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2);">
          <app-skeleton variant="block" width="7rem" />
          <app-skeleton variant="block" width="7rem" />
        </div>
      </div>
      <p role="status" class="cdk-visually-hidden">Carregando pedidos</p>
    `,
  }),
};
