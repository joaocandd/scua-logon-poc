import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { BarChart } from './bar-chart';
import { ChartDatum } from './chart-scale';
import { LineChart } from './line-chart';

// Dados fictícios, só para as histórias.
const WEEK: ChartDatum[] = [
  { label: '14/11', longLabel: 'sexta, 14/11', value: 6 },
  { label: '15/11', longLabel: 'sábado, 15/11', value: 0 },
  { label: '16/11', longLabel: 'domingo, 16/11', value: 0 },
  { label: '17/11', longLabel: 'segunda, 17/11', value: 9.5 },
  { label: '18/11', longLabel: 'terça, 18/11', value: 7 },
  { label: '19/11', longLabel: 'quarta, 19/11', value: 11 },
  { label: '20/11', longLabel: 'quinta, 20/11', value: 4.5 },
];

const MONTH: ChartDatum[] = Array.from({ length: 30 }, (_, i) => {
  const day = new Date(Date.UTC(2026, 9, 22 + i));
  const label = `${String(day.getUTCDate()).padStart(2, '0')}/${String(day.getUTCMonth() + 1).padStart(2, '0')}`;
  const weekend = [0, 6].includes(day.getUTCDay());
  return { label, value: weekend ? 0 : 40 + ((i * 37) % 90) };
});

const STATUSES: ChartDatum[] = [
  { label: 'Aguardando gestor', value: 8 },
  { label: 'Aguardando RH', value: 3 },
  { label: 'Aprovado', value: 5 },
  { label: 'Recusado', value: 2 },
  { label: 'Expirado', value: 1 },
];

const hours = (value: number) => `${value.toLocaleString('pt-BR')} h`;
const minutes = (value: number) => `${value.toLocaleString('pt-BR')} min`;

const meta: Meta<BarChart> = {
  title: 'Componentes/Gráficos',
  component: BarChart,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [BarChart, LineChart] })],
  parameters: {
    docs: {
      description: {
        component:
          'BarChart e LineChart em SVG, só com os tokens. Uma série por gráfico: o título diz o que é medido. Eixo a partir do zero com marcas redondas, valores escritos (todos quando cabem; senão o maior e o último), tooltip no mouse e no foco, setas para passar pelos pontos e "Ver como tabela" com os mesmos números. Status aparecem pelo rótulo, nunca só pela cor.',
      },
    },
  },
  args: {
    heading: 'Horas extras por dia',
    description: 'Horas extras aprovadas nos últimos 7 dias, pelo dia da jornada.',
    data: WEEK,
    format: hours,
    valueHeader: 'Horas extras',
  },
};

export default meta;
type Story = StoryObj<BarChart>;

export const Barras: Story = {};

export const BarrasTrintaDias: Story = {
  name: 'Barras, 30 dias',
  args: {
    heading: 'Ausências por dia',
    description: 'Colaboradores ausentes nos últimos 30 dias.',
    data: MONTH.map((d) => ({ ...d, value: Math.round(d.value / 20) })),
    format: (v: number) => v.toLocaleString('pt-BR'),
    valueHeader: 'Ausentes',
  },
};

export const PorStatus: Story = {
  name: 'Por status (categorias)',
  args: {
    heading: 'Pedidos de hoje por status',
    description: undefined,
    data: STATUSES,
    format: (v: number) => v.toLocaleString('pt-BR'),
    labelHeader: 'Status',
    valueHeader: 'Pedidos',
    orientation: 'horizontal',
  },
};

export const Linha: Story = {
  render: (args) => ({
    props: { ...args, data: MONTH, format: minutes },
    template: `<app-line-chart
      heading="Minutos bloqueados por dia"
      description="Soma dos minutos com a estação bloqueada dentro do expediente."
      [data]="data"
      [format]="format"
      valueHeader="Minutos bloqueados"
    />`,
  }),
};

export const Vazio: Story = {
  args: { data: [], emptyText: 'Nenhuma hora extra aprovada no período.' },
};

export const Estreito: Story = {
  name: 'Em 320 px',
  render: (args) => ({
    props: args,
    template: `<div style="width: 288px"><app-bar-chart [heading]="heading" [description]="description" [data]="data" [format]="format" /></div>`,
  }),
};
