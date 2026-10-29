import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { EXTENSION_REQUEST_STATUSES, WORKSTATION_STATES } from '../../shared/models/status';
import { StatusBadge } from './status-badge';

const meta: Meta<StatusBadge> = {
  title: 'Componentes/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [StatusBadge] })],
  parameters: {
    docs: {
      description: {
        component:
          'Status de pedido de extensão ou de estação, sempre com ícone e rótulo em português. Estação liberada usa o laranja da marca; "Bloqueada" usa a hachura diagonal.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: [...EXTENSION_REQUEST_STATUSES, ...WORKSTATION_STATES],
    },
  },
  args: { status: 'aguardando_gestor' },
};

export default meta;
type Story = StoryObj<StatusBadge>;

export const Padrao: Story = { name: 'Padrão' };

const list = (statuses: readonly string[]) => ({
  props: { statuses },
  template: `
    <ul style="display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin: 0; padding: 0;">
      @for (status of statuses; track status) {
        <li><app-status-badge [status]="status" /></li>
      }
    </ul>
  `,
});

export const Pedidos: Story = {
  name: 'Status do pedido',
  render: () => list(EXTENSION_REQUEST_STATUSES),
};

export const Estacoes: Story = {
  name: 'Estado da estação',
  render: () => list(WORKSTATION_STATES),
};

export const SobreAreia: Story = {
  name: 'Sobre o fundo de areia',
  render: () => ({
    ...list([...EXTENSION_REQUEST_STATUSES, ...WORKSTATION_STATES]),
    styles: [
      ':host { display: block; padding: var(--space-4); background: var(--color-bg-subtle); }',
    ],
  }),
};
