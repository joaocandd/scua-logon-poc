import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Button } from '../button/button';
import { ICONS } from '../icon/icons';
import { EmptyState } from './empty-state';

const meta: Meta<EmptyState> = {
  title: 'Componentes/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [EmptyState, Button] })],
  parameters: {
    docs: {
      description: {
        component:
          'Estado vazio: diz o que aparece ali e, se houver, o que a pessoa pode fazer. A ação é opcional e vem por projeção.',
      },
    },
  },
  argTypes: {
    icon: { control: 'select', options: Object.keys(ICONS) },
    headingLevel: { control: 'inline-radio', options: [2, 3] },
  },
  args: {
    heading: 'Nenhum pedido aguardando',
    description: 'Pedidos de extensão aparecem aqui assim que alguém solicitar.',
    icon: 'inbox',
    headingLevel: 2,
  },
};

export default meta;
type Story = StoryObj<EmptyState>;

export const Padrao: Story = { name: 'Padrão' };

export const SemTexto: Story = {
  name: 'Sem texto',
  args: { heading: 'Nenhuma exceção cadastrada', description: undefined },
};

export const ComAcao: Story = {
  name: 'Com ação',
  args: {
    heading: 'Nenhum colaborador encontrado',
    description: 'Nenhum nome ou matrícula combina com a busca.',
    icon: 'search_off',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-empty-state [heading]="heading" [description]="description" [icon]="icon" [headingLevel]="headingLevel">
        <button app-button type="button" variant="secondary">Limpar busca</button>
      </app-empty-state>
    `,
  }),
};
