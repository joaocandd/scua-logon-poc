import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

test('a página inicial abre o painel Hoje sem violações de acessibilidade', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page).toHaveTitle('Hoje · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expectNoA11yViolations(page);
});

const pages = [
  { path: '/aprovacoes', heading: 'Aprovações' },
  { path: '/regras', heading: 'Regras de jornada' },
  { path: '/pessoas', heading: 'Pessoas' },
  { path: '/relatorios', heading: 'Relatórios' },
  { path: '/configuracoes', heading: 'Configurações' },
  { path: '/endereco-que-nao-existe', heading: 'Página não encontrada' },
];

for (const { path, heading } of pages) {
  test(`${path} abre sem violações de acessibilidade`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveTitle(`${heading} · Scua Logon`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expectNoA11yViolations(page);
  });
}
