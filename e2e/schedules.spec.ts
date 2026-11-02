import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Regras de jornada (fluxo B, /regras) em 1280 px, 390 px e no tema escuro. Cada teste abre a
// página do zero: a API simulada começa com os dados de demonstração.

/** Linha da regra na tabela, pelo nome (o cabeçalho da linha). */
const row = (page: Page, name: string) =>
  page.getByRole('row').filter({ has: page.getByRole('rowheader', { name, exact: true }) });

async function openList(page: Page, url = '/regras'): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Regras de jornada' })).toBeVisible();
}

test('lista as regras com horário, grupos, colaboradores e status', async ({ page }) => {
  await openList(page);

  const comercial = row(page, 'Comercial');
  await expect(comercial).toContainText('Das 8h às 17h');
  await expect(comercial).toContainText('Seg a sex');
  await expect(comercial).toContainText('Comercial, Financeiro');
  await expect(comercial.getByRole('cell').nth(2)).toHaveText(/15/);
  await expect(comercial).toContainText('Ativa');

  // Noturna: atravessa a meia-noite e deixa a diretora de fora.
  const noturna = row(page, 'Noturna');
  await expect(noturna).toContainText('Das 22h às 6h');
  await expect(noturna.getByRole('cell').nth(2)).toHaveText(/6/);

  await expectNoA11yViolations(page);
});

test('sem regras, explica o que acontece', async ({ page }) => {
  await openList(page, '/regras?simular=vazio');
  await expect(page.getByRole('heading', { name: 'Nenhuma regra de jornada' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('sem permissão, diz a quem pedir acesso', async ({ page }) => {
  await openList(page, '/regras?simular=sem-permissao');
  await expect(
    page.getByRole('heading', { name: 'Você não tem acesso às regras de jornada' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test('com a API fora do ar, oferece tentar de novo', async ({ page }) => {
  await openList(page, '/regras?simular=erro');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar as regras' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  await expectNoA11yViolations(page);
});
