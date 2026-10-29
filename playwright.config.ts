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
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
