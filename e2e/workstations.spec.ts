import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Estações (/estacoes): lista com o estado pelo motor de regras, busca e filtros na URL. O relógio
// fica numa terça às 18h20, como no painel "Hoje": o Comercial já saiu, a Flexível está na jornada
// e a Noturna, em observação, deixa a estação liberada sem aprovação.
const TUESDAY_EVENING = new Date('2026-11-03T18:20:00-03:00');

async function openStations(page: Page, url = '/estacoes'): Promise<void> {
  await page.clock.install({ time: TUESDAY_EVENING });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Estações' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Estações' })).toBeVisible();
}

const table = (page: Page) => page.getByRole('table', { name: 'Estações' });
const rowOf = (page: Page, hostname: RegExp) =>
  table(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: hostname }) });

test('lista as estações com máquina, colaborador, grupo, estado, regra e última atividade', async ({
  page,
}) => {
  await openStations(page);

  await expect(table(page).getByRole('columnheader')).toHaveText([
    'Estação',
    'Colaborador',
    'Grupo',
    'Estado',
    'Regra',
    'Última atividade',
  ]);
  await expect(table(page).getByRole('rowheader')).toHaveCount(39);
  await expect(page.locator('p.count')).toHaveText('39 estações');

  const joao = rowOf(page, /^COM-(PC|NB)-008$/);
  await expect(joao).toContainText('João Pedro Antunes');
  await expect(joao).toContainText('Bloqueada');
  await expect(joao).toContainText('hoje às 17h');
  await expect(joao.getByRole('link', { name: 'Comercial' })).toHaveAttribute(
    'href',
    '/regras/regra-comercial',
  );
  await expectNoA11yViolations(page);
});

test('busca e filtros vão para a URL; "Limpar filtros" volta à lista inteira', async ({ page }) => {
  await openStations(page);

  await page.getByLabel('Buscar por nome ou máquina').fill('joao');
  await expect(page).toHaveURL(/busca=joao/);
  await expect(table(page).getByRole('rowheader')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('1 estação de 39');

  await page.getByLabel('Buscar por nome ou máquina').fill('');
  await page.getByLabel('Estado').selectOption({ label: 'Liberada sem aprovação' });
  await expect(page).toHaveURL(/estado=sem_aprovacao/);
  await expect(table(page).getByRole('rowheader')).toHaveCount(6);

  await page.getByLabel('Grupo', { exact: true }).selectOption({ label: 'TI' });
  await expect(page.getByRole('heading', { name: 'Nenhuma estação encontrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL('/estacoes');
  await expect(table(page).getByRole('rowheader')).toHaveCount(39);

  // A URL abre o mesmo recorte.
  await page.goto('/estacoes?grupo=grp-ti&busca=TI-');
  await expect(table(page).getByRole('rowheader')).toHaveCount(5);
  await expect(page.getByLabel('Buscar por nome ou máquina')).toHaveValue('TI-');
  await expect(page.getByLabel('Grupo', { exact: true })).toHaveValue('grp-ti');
});

test('no menu: Estações fica entre Aprovações e Pessoas', async ({ page, isMobile }) => {
  test.skip(isMobile, 'No celular, Estações fica no "Mais" (shell.spec.ts)');
  await openStations(page);
  const nav = page.getByRole('navigation', { name: 'Principal' });
  await expect(nav.getByRole('link', { name: 'Estações' })).toHaveAttribute('aria-current', 'page');
});
