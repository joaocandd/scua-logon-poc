import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { ICONS } from '../icon/icons';
import { Button } from './button';

type ButtonArgs = Button & { label: string };

const meta: Meta<ButtonArgs> = {
  title: 'Componentes/Button',
  component: Button,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Button] })],
  parameters: {
    docs: {
      description: {
        component:
          'Use `<button app-button>` para ações e `<a app-button>` para navegação. O rótulo diz a ação ("Aprovar", "Salvar regra"). Em `loading`, o botão fica com `aria-busy` e `aria-disabled`, ignora cliques e continua com o foco.',
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
    icon: { control: 'select', options: [undefined, ...Object.keys(ICONS)] },
  },
  args: {
    label: 'Aprovar',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
  },
  render: ({ label, ...args }) => ({
    props: { ...args, label },
    template: `<button app-button type="button" ${argsToTemplate(args)}>{{ label }}</button>`,
  }),
};

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primario: Story = { name: 'Primário' };

export const Secundario: Story = {
  name: 'Secundário',
  args: { variant: 'secondary', label: 'Cancelar' },
};

export const Ghost: Story = { args: { variant: 'ghost', label: 'Ver histórico' } };

export const Danger: Story = { args: { variant: 'danger', label: 'Recusar' } };

export const ComIcone: Story = { name: 'Com ícone', args: { icon: 'check', label: 'Aprovar' } };

export const Pequeno: Story = { args: { size: 'sm', label: 'Aprovar' } };

export const Carregando: Story = { args: { loading: true, label: 'Salvar regra' } };

export const Desabilitado: Story = { args: { disabled: true, label: 'Aprovar selecionados' } };

export const SoIcone: Story = {
  name: 'Só ícone',
  render: () => ({
    template: `
      <button app-button type="button" variant="ghost" icon="close" aria-label="Fechar"></button>
      <button app-button type="button" variant="secondary" size="sm" icon="delete" aria-label="Excluir intervalo"></button>
    `,
  }),
};

export const Link: Story = {
  render: () => ({
    template: `<a app-button href="#" variant="secondary" icon="inbox">Ver pedidos pendentes</a>`,
  }),
};

export const TodasAsVariantes: Story = {
  name: 'Todas as variantes e estados',
  render: () => ({
    props: {
      variants: ['primary', 'secondary', 'ghost', 'danger'],
      sizes: ['md', 'sm'],
    },
    template: `
      <div style="display: grid; gap: var(--space-4);">
        @for (size of sizes; track size) {
          @for (variant of variants; track variant) {
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);">
              <button app-button type="button" [variant]="variant" [size]="size">{{ variant }} {{ size }}</button>
              <button app-button type="button" [variant]="variant" [size]="size" icon="check">Com ícone</button>
              <button app-button type="button" [variant]="variant" [size]="size" loading>Carregando</button>
              <button app-button type="button" [variant]="variant" [size]="size" disabled>Desabilitado</button>
            </div>
          }
        }
      </div>
    `,
  }),
};
