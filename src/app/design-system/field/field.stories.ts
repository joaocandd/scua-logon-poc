import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Field, FieldControl } from './field';

type FieldArgs = Field & { disabled: boolean };

const meta: Meta<FieldArgs> = {
  title: 'Componentes/Field',
  component: Field,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [Field, FieldControl] }),
    (story) => ({ ...story(), styles: [':host { display: block; max-width: 24rem; }'] }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Envolve um controle nativo marcado com `appFieldControl`. O Field liga rótulo, ajuda e erro ao controle (`for`, `aria-describedby`, `aria-invalid`, `aria-required`) e anuncia o erro quando ele aparece. Use `autocomplete` no controle quando fizer sentido.',
      },
    },
  },
  args: {
    label: 'Nome da regra',
    hint: '',
    error: '',
    required: false,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-field [label]="label" [hint]="hint" [error]="error" [required]="required">
        <input appFieldControl type="text" [disabled]="disabled" />
      </app-field>
    `,
  }),
};

export default meta;
type Story = StoryObj<FieldArgs>;

export const Texto: Story = {};

export const ComAjuda: Story = {
  name: 'Com ajuda',
  args: { hint: 'Aparece na lista de regras e nos relatórios.' },
};

export const Obrigatorio: Story = { name: 'Obrigatório', args: { required: true } };

export const ComErro: Story = {
  name: 'Com erro',
  args: {
    required: true,
    hint: 'Aparece na lista de regras e nos relatórios.',
    error: 'Dê um nome à regra.',
  },
};

export const Desabilitado: Story = { args: { disabled: true } };

export const Hora: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: var(--space-4);">
        <app-field label="Início da jornada" hint="Formato 24 h" required>
          <input appFieldControl type="time" value="08:00" />
        </app-field>
        <app-field label="Fim da jornada" required error="O fim precisa ser depois do início, ou marque que a jornada atravessa a meia-noite.">
          <input appFieldControl type="time" value="07:00" />
        </app-field>
      </div>
    `,
  }),
};

export const Data: Story = {
  render: () => ({
    template: `
      <app-field label="Data da exceção" hint="A regra volta ao normal no dia seguinte.">
        <input appFieldControl type="date" value="2026-11-20" />
      </app-field>
    `,
  }),
};

export const Selecao: Story = {
  name: 'Seleção',
  render: () => ({
    template: `
      <div style="display: grid; gap: var(--space-4);">
        <app-field label="Grupo" required>
          <select appFieldControl>
            <option value="">Escolha um grupo</option>
            <option>Financeiro</option>
            <option>Comercial</option>
            <option>Atendimento</option>
          </select>
        </app-field>
        <app-field label="Aprovação" error="Escolha quem aprova a hora extra.">
          <select appFieldControl>
            <option value="">Escolha</option>
            <option>Só o gestor</option>
            <option>Gestor e RH</option>
          </select>
        </app-field>
      </div>
    `,
  }),
};

export const TextoLongo: Story = {
  name: 'Texto longo',
  render: () => ({
    template: `
      <app-field label="Motivo da recusa" hint="O colaborador vê este texto." required>
        <textarea appFieldControl rows="3"></textarea>
      </app-field>
    `,
  }),
};
