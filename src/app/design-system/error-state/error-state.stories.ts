import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { ErrorState } from './error-state';

const meta: Meta<ErrorState> = {
  title: 'Componentes/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Erro ao carregar dados: diz o que aconteceu e o que fazer, com o botão "Tentar de novo". Só aceita texto para pessoas; nunca mostre código HTTP, JSON ou stack.',
      },
    },
  },
  argTypes: {
    headingLevel: { control: 'inline-radio', options: [2, 3] },
  },
  args: {
    retrying: false,
    headingLevel: 2,
    retry: fn(),
  },
};

export default meta;
type Story = StoryObj<ErrorState>;

export const Padrao: Story = { name: 'Padrão' };

export const Personalizado: Story = {
  args: {
    heading: 'Não foi possível carregar os pedidos',
    description: 'A lista não respondeu a tempo. Tente de novo em alguns segundos.',
  },
};

export const TentandoDeNovo: Story = { name: 'Tentando de novo', args: { retrying: true } };
