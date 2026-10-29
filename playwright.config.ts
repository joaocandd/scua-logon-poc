import { defineConfig, devices } from '@playwright/test';

const port = 4200;
const baseURL = `http://localhost:${port}`;
const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [[isCI ? 'github' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
  },
  // Desktop para o RH; celular para o gestor que aprova pedidos fora da mesa.
  // O tema escuro roda à parte para o axe conferir o contraste das telas nele também.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // 390 px: largura de celular de referência da equipe (Pixel 7 tem 412 px).
    { name: 'celular', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop-escuro', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npm start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
