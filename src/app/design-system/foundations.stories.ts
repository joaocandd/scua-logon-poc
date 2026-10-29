import type { Meta, StoryObj } from '@storybook/angular-vite';

// Os exemplos usam var(--token): o que aparece aqui é sempre o que está no tokens.css.

const COLORS = [
  { token: '--color-bg', use: 'Fundo da página' },
  { token: '--color-bg-subtle', use: 'Fundo de áreas secundárias (areia)' },
  { token: '--color-surface', use: 'Cards, diálogos e tabelas' },
  { token: '--color-text', use: 'Texto principal' },
  { token: '--color-text-muted', use: 'Texto secundário' },
  { token: '--color-border', use: 'Divisórias e bordas decorativas' },
  { token: '--color-border-strong', use: 'Borda de campos e controles' },
  { token: '--color-primary', use: 'Botão primário' },
  { token: '--color-on-primary', use: 'Texto sobre o primário' },
  {
    token: '--color-accent',
    use: 'Laranja da marca: áreas grandes, ícones, gráficos. Nunca sobre areia',
  },
  { token: '--color-link', use: 'Links de texto' },
  { token: '--color-highlight-bg', use: 'Fundo de destaque (pêssego)' },
  { token: '--color-text-on-highlight', use: 'Texto sobre o destaque' },
  { token: '--color-focus-ring', use: 'Anel de foco' },
  { token: '--color-hatch', use: 'Hachura da estação bloqueada' },
];

const STATUSES = [
  { token: '--status-approved', use: 'Aprovado' },
  { token: '--status-pending', use: 'Aguardando gestor ou RH' },
  { token: '--status-rejected', use: 'Recusado' },
  { token: '--status-neutral', use: 'Expirado ou cancelado' },
  { token: '--status-blocked', use: 'Estação bloqueada' },
];

const TEXT_SIZES = [
  { token: '--text-2xl', px: 32, use: 'Título da página (h1)' },
  { token: '--text-xl', px: 24, use: 'Título de seção (h2)' },
  { token: '--text-lg', px: 20, use: 'Subtítulo (h3)' },
  { token: '--text-md', px: 16, use: 'Corpo de texto' },
  { token: '--text-sm', px: 14, use: 'Tabelas e textos de apoio' },
  { token: '--text-xs', px: 12, use: 'Legendas' },
];

const WEIGHTS = [400, 500, 600, 700];

const SPACES = [1, 2, 3, 4, 6, 8].map((n) => ({ token: `--space-${n}`, px: n * 4 }));

const RADII = [
  { token: '--radius-sm', value: '8px', use: 'Botões e campos' },
  { token: '--radius-md', value: '12px', use: 'Blocos internos' },
  { token: '--radius-lg', value: '16px', use: 'Cards' },
  { token: '--radius-pill', value: '999px', use: 'Etiquetas de status' },
];

// Cada exemplo tem fundo e texto próprios, para ficar legível também no tema escuro.
const FRAME = 'background: var(--color-bg); color: var(--color-text); padding: var(--space-6);';
const TABLE = 'border-collapse: collapse; font-size: var(--text-sm); width: 100%;';
const CELL =
  'border-bottom: 1px solid var(--color-border); padding: var(--space-2) var(--space-3); text-align: left;';
const SWATCH =
  'width: 48px; height: 32px; border-radius: var(--radius-sm); box-shadow: var(--shadow-ring);';

const colorTable = (caption: string) => `
  <table style="${TABLE}">
    <caption style="text-align: left; font-weight: 600; padding-bottom: var(--space-2);">${caption}</caption>
    <thead>
      <tr>
        <th scope="col" style="${CELL}">Amostra</th>
        <th scope="col" style="${CELL}">Token</th>
        <th scope="col" style="${CELL}">Uso</th>
      </tr>
    </thead>
    <tbody>
      @for (item of items; track item.token) {
        <tr>
          <td style="${CELL}">
            <div aria-hidden="true" style="${SWATCH}" [style.background]="'var(' + item.token + ')'"></div>
          </td>
          <td style="${CELL}"><code>{{ item.token }}</code></td>
          <td style="${CELL}">{{ item.use }}</td>
        </tr>
      }
    </tbody>
  </table>`;

const meta: Meta = {
  title: 'Fundamentos',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cores, tipografia, espaçamentos e raios do design system. Os valores vêm de ' +
          '`src/styles/tokens.css`; use o botão de tema na barra para ver o tema escuro.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Cores: Story = {
  render: () => ({
    props: { items: COLORS },
    template: `<div style="${FRAME}">${colorTable('Cores semânticas')}</div>`,
  }),
};

export const Status: Story = {
  render: () => ({
    props: { items: STATUSES },
    template: `
      <div style="${FRAME}">
        ${colorTable('Cores de status')}
        <p style="font-size: var(--text-sm); color: var(--color-text-muted);">
          Status nunca aparece só pela cor: sempre com ícone e rótulo.
        </p>
      </div>`,
  }),
};

export const Tipografia: Story = {
  render: () => ({
    props: { sizes: TEXT_SIZES, weights: WEIGHTS },
    template: `
      <div style="${FRAME}">
        <table style="${TABLE}">
          <caption style="text-align: left; font-weight: 600; padding-bottom: var(--space-2);">
            Tamanhos (fonte Montserrat, entrelinha 1,2 em títulos e 1,5 no corpo)
          </caption>
          <thead>
            <tr>
              <th scope="col" style="${CELL}">Token</th>
              <th scope="col" style="${CELL}">Uso</th>
              <th scope="col" style="${CELL}">Exemplo</th>
            </tr>
          </thead>
          <tbody>
            @for (size of sizes; track size.token) {
              <tr>
                <td style="${CELL}"><code>{{ size.token }}</code> · {{ size.px }} px</td>
                <td style="${CELL}">{{ size.use }}</td>
                <td style="${CELL}" [style.font-size]="'var(' + size.token + ')'">Pedido aprovado</td>
              </tr>
            }
          </tbody>
        </table>
        <p style="margin-top: var(--space-6); font-weight: 600;">Pesos</p>
        <ul style="list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2);">
          @for (weight of weights; track weight) {
            <li [style.font-weight]="weight">{{ weight }} · Fora do horário da sua jornada</li>
          }
        </ul>
      </div>`,
  }),
};

export const Espacamentos: Story = {
  name: 'Espaçamentos',
  render: () => ({
    props: { spaces: SPACES },
    template: `
      <div style="${FRAME}">
        <ul style="list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3);">
          @for (space of spaces; track space.token) {
            <li style="display: flex; align-items: center; gap: var(--space-4);">
              <code style="width: 96px;">{{ space.token }}</code>
              <span style="width: 48px;">{{ space.px }} px</span>
              <div aria-hidden="true" style="height: 16px; background: var(--color-accent);"
                   [style.width]="'var(' + space.token + ')'"></div>
            </li>
          }
        </ul>
      </div>`,
  }),
};

export const Raios: Story = {
  render: () => ({
    props: { radii: RADII },
    template: `
      <div style="${FRAME}">
        <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-6);">
          @for (radius of radii; track radius.token) {
            <li style="display: grid; gap: var(--space-2); justify-items: start;">
              <div aria-hidden="true"
                   style="width: 96px; height: 64px; background: var(--color-highlight-bg); border: 2px solid var(--color-primary);"
                   [style.border-radius]="'var(' + radius.token + ')'"></div>
              <code>{{ radius.token }}</code>
              <span style="font-size: var(--text-sm);">{{ radius.value }} · {{ radius.use }}</span>
            </li>
          }
        </ul>
      </div>`,
  }),
};
