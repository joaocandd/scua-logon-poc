import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Button } from '../button/button';
import { PageHeader } from './page-header';

const meta: Meta<PageHeader> = {
  title: 'Componentes/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [PageHeader, Button] })],
  parameters: {
    docs: {
      description: {
        component:
          'Topo de cada página: o único `<h1>` da tela, uma descrição curta e as ações principais (por projeção). As ações quebram para baixo do título no celular.',
      },
    },
  },
  args: {
    heading: 'Regras de jornada',
    description: 'Horários em que cada grupo pode usar a estação de trabalho.',
  },
};

export default meta;
type Story = StoryObj<PageHeader>;

export const SoTitulo: Story = { name: 'Só título', args: { description: undefined } };

export const ComDescricao: Story = { name: 'Com descrição' };

export const ComAcoes: Story = {
  name: 'Com ações',
  render: (args) => ({
    props: args,
    template: `
      <app-page-header [heading]="heading" [description]="description">
        <button app-button type="button" variant="secondary" icon="download">Exportar</button>
        <button app-button type="button" icon="add">Nova regra</button>
      </app-page-header>
    `,
  }),
};
