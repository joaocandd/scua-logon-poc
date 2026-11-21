import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Auditoria (/relatorios/auditoria): registro só de leitura, com filtros na URL e "Exportar CSV".
const THURSDAY = new Date('2026-11-12T15:00:00-03:00');

async function openAudit(page: Page, url = '/relatorios/auditoria'): Promise<void> {
  await page.clock.install({ time: THURSDAY });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Auditoria' })).toBeVisible();
}

const table = (page: Page) => page.getByRole('table', { name: 'Registro de eventos' });

test('registro só de leitura, do mais novo para o mais antigo, sem violações', async ({ page }) => {
  await openAudit(page);
  await expect(page.getByText('Os registros não podem ser editados.')).toBeVisible();
  await expect(table(page).getByRole('columnheader')).toHaveText([
    'Quando',
    'Tipo',
    'Quem',
    'O que aconteceu',
  ]);
  // Nenhuma ação por linha: o registro não se edita.
  await expect(table(page).getByRole('button')).toHaveCount(0);
  await expect(table(page).getByRole('link')).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test('filtros por tipo, pessoa e período vão para a URL', async ({ page }) => {
  await openAudit(page);

  await page.getByLabel('Tipo').selectOption({ label: 'Acessos' });
  await expect(page).toHaveURL(/tipo=acessos/);
  const types = table(page).locator('td.type');
  await expect(types.first()).toHaveText('Acesso');
  expect(new Set(await types.allTextContents())).toEqual(new Set(['Acesso']));

  await page.getByLabel('Pessoa').selectOption({ label: 'Thiago Moreira' });
  await expect(page).toHaveURL(/pessoa=col-32/);
  for (const actor of await table(page).locator('td.actor').allTextContents()) {
    expect(actor).toContain('Thiago Moreira');
  }

  await page.getByLabel('Período').selectOption({ label: 'Hoje' });
  await expect(page).toHaveURL(/periodo=hoje/);
  await expect(page.getByRole('heading', { name: 'Nenhum evento encontrado' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL('/relatorios/auditoria');
});

test('entrar no console vira um acesso no registro', async ({ page }) => {
  await page.clock.install({ time: THURSDAY });
  await page.goto('/entrar');
  await page.getByLabel('Usuário', { exact: true }).fill('renata.albuquerque');
  await page.getByLabel('Senha', { exact: true }).fill('qualquer-senha');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/hoje');

  // Pela navegação do app: o banco simulado vive enquanto a página não recarrega.
  await page.getByRole('link', { name: 'Ver o registro de hoje' }).click();
  await page.getByLabel('Tipo').selectOption({ label: 'Acessos' });
  await expect(table(page).getByRole('row').nth(1)).toContainText(
    'Renata Albuquerque entrou no Scua Logon.',
  );
});

test('"Exportar CSV" baixa o que a tela mostra', async ({ page }) => {
  await openAudit(page, '/relatorios/auditoria?tipo=regras&periodo=30');
  await expect(table(page)).toBeVisible();
  const rows = await table(page).locator('tbody tr').count();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('auditoria-30-dias.csv');
  const lines = (await readFile(await file.path()))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .split('\r\n');
  expect(lines[0]).toBe('Quando;Tipo;Quem;O que aconteceu');
  expect(lines).toHaveLength(rows + 1);
});
