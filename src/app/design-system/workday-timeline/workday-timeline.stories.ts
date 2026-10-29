import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { WorkdayTimeline } from './workday-timeline';

const meta: Meta<WorkdayTimeline> = {
  title: 'Componentes/WorkdayTimeline',
  component: WorkdayTimeline,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Um dia de 0h a 24h: laranja onde a estação está liberada, hachura onde está bloqueada.',
          'Horário sem segmento fica bloqueado. Na sobreposição vale o segmento que vem depois na lista (o almoço por cima da jornada).',
          'Um segmento com fim antes do início atravessa a meia-noite e vira dois trechos na barra.',
          'O leitor de tela recebe a lista dos horários em texto.',
        ].join(' '),
      },
    },
  },
  args: {
    label: 'Jornada Comercial',
    segments: [
      { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
      { start: '12:00', end: '13:00', kind: 'locked', label: 'Almoço' },
    ],
  },
};

export default meta;
type Story = StoryObj<WorkdayTimeline>;

export const Comercial: Story = { name: 'Comercial (8h–17h, almoço 12h–13h)' };

export const ComAgora: Story = { name: 'Com marcador de agora', args: { now: '14:32' } };

export const NoIntervalo: Story = { name: 'Agora no intervalo', args: { now: '12:20' } };

export const ComHoraExtra: Story = {
  name: 'Com hora extra aprovada',
  args: {
    label: 'Jornada Comercial com hora extra',
    now: '17:40',
    segments: [
      { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
      { start: '12:00', end: '13:00', kind: 'locked', label: 'Almoço' },
      { start: '17:00', end: '19:30', kind: 'unlocked', label: 'Hora extra aprovada' },
    ],
  },
};

export const Noturna: Story = {
  name: 'Noturna (22h–6h, atravessa a meia-noite)',
  args: {
    label: 'Jornada Noturna',
    now: '23:15',
    segments: [
      { start: '22:00', end: '06:00', kind: 'unlocked', label: 'Jornada' },
      { start: '02:00', end: '03:00', kind: 'locked', label: 'Intervalo' },
    ],
  },
};

export const DiaBloqueado: Story = {
  name: 'Dia todo bloqueado (folga ou feriado)',
  args: { label: 'Feriado: Proclamação da República', segments: [], now: '10:00' },
};

export const AgoraNasPontas: Story = {
  name: 'Agora perto da meia-noite',
  args: { now: '00:10' },
};
