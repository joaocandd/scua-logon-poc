import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/angular-vite';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Violação de acessibilidade conta como erro, não como aviso.
    a11y: { test: 'error' },
  },
  decorators: [
    // Botão claro/escuro na barra do Storybook: põe data-theme no <html>, como o app fará.
    withThemeByDataAttribute({
      themes: { claro: 'light', escuro: 'dark' },
      defaultTheme: 'claro',
      attributeName: 'data-theme',
      parentSelector: 'html',
    }),
  ],
};

export default preview;
