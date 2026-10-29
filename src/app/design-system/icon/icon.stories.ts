import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Icon } from './icon';
import { ICONS } from './icons';

const meta: Meta<Icon> = {
  title: 'Componentes/Icon',
  component: Icon,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Icon] })],
  parameters: {
    docs: {
      description: {
        component:
          'Ícone do Material Symbols (Outlined, peso 400) em SVG. Sempre decorativo: acompanhe de texto ou use `aria-label` no botão. Para um ícone novo, acrescente o nome em `scripts/icons.mjs` e rode `npm run icons`.',
      },
    },
  },
  argTypes: {
    name: { control: 'select', options: Object.keys(ICONS) },
  },
  args: { name: 'check_circle' },
};

export default meta;
type Story = StoryObj<Icon>;

export const Padrao: Story = { name: 'Padrão' };

export const Todos: Story = {
  render: () => ({
    props: { names: Object.keys(ICONS) },
    template: `
      <ul style="display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: var(--space-4); list-style: none; padding: 0; font-size: var(--text-sm);">
        @for (name of names; track name) {
          <li style="display: flex; align-items: center; gap: var(--space-2);">
            <app-icon [name]="name" style="font-size: var(--text-xl);" />
            <code>{{ name }}</code>
          </li>
        }
      </ul>
    `,
  }),
};

export const AcompanhaOTexto: Story = {
  name: 'Acompanha o tamanho e a cor do texto',
  render: () => ({
    template: `
      <p style="font-size: var(--text-sm); display: flex; align-items: center; gap: var(--space-1);">
        <app-icon name="check_circle" /> 14 px
      </p>
      <p style="font-size: var(--text-xl); display: flex; align-items: center; gap: var(--space-2); color: var(--status-approved);">
        <app-icon name="check_circle" /> 24 px, cor de status
      </p>
    `,
  }),
};
