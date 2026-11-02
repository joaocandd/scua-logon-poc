import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Regras de jornada (fluxo B, /regras) em 1280 px, 390 px e no tema escuro. Cada teste abre a
// página do zero: a API simulada começa com os dados de demonstração.

/** Linha da regra na tabela, pelo nome (o cabeçalho da linha). */
const row = (page: Page, name: string) =>
  page.getByRole('row').filter({ has: page.getByRole('rowheader', { name, exact: true }) });

/** Caixa do dia da semana no editor ("Seg", "Ter"...). */
const day = (page: Page, name: string) => page.getByRole('checkbox', { name, exact: true });

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

test('o nome da regra leva ao editor', async ({ page }) => {
  await openList(page);
  await row(page, 'Noturna').getByRole('link', { name: 'Noturna' }).click();

  await expect(page).toHaveURL('/regras/regra-noturna');
  await expect(page).toHaveTitle('Regra de jornada · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Noturna' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nome da regra' })).toHaveValue('Noturna');
  await expect(day(page, 'Sex')).toBeChecked();
  await expect(day(page, 'Sáb')).not.toBeChecked();
  await expectNoA11yViolations(page);
});

test('cria uma regra: os erros só aparecem depois de "Salvar regra"', async ({ page }) => {
  await openList(page);
  await page.getByRole('link', { name: 'Nova regra' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nova regra' })).toBeVisible();

  // Sem nome e sem dias, mas nada de erro enquanto a pessoa preenche.
  const name = page.getByRole('textbox', { name: 'Nome da regra' });
  for (const weekday of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']) await day(page, weekday).uncheck();
  await expect(page.getByText('Dê um nome para a regra.')).toBeHidden();

  // Primeira tentativa: os dois erros aparecem e o foco vai para o nome.
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await expect(page.getByText('Dê um nome para a regra.')).toBeVisible();
  await expect(page.getByText('Escolha ao menos um dia da semana.')).toBeVisible();
  await expect(name).toBeFocused();
  await expectNoA11yViolations(page);

  // Nome de outra regra, sem acento e em minúsculas.
  await name.fill('flexivel');
  await expect(
    page.getByText('Já existe uma regra chamada Flexível. Escolha outro nome.'),
  ).toBeVisible();

  await name.fill('Plantão de fim de semana');
  await day(page, 'Sáb').check();
  await day(page, 'Dom').check();
  await page.getByRole('button', { name: 'Salvar regra' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Plantão de fim de semana' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/regras\/regra-[\w-]+$/);
  await expect(page.locator('app-toast-panel')).toContainText(
    'Regra Plantão de fim de semana criada.',
  );

  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  const created = row(page, 'Plantão de fim de semana');
  await expect(created).toContainText('Sáb e dom');
  await expect(created).toContainText('Nenhum grupo');
});

test('edita o nome de uma regra', async ({ page }) => {
  await page.goto('/regras/regra-tarde');
  const name = page.getByRole('textbox', { name: 'Nome da regra' });
  await expect(name).toHaveValue('Tarde');

  await name.fill('  Tarde e noite ');
  await page.getByRole('button', { name: 'Salvar regra' }).click();

  await expect(page.locator('app-toast-panel')).toContainText('Regra Tarde e noite salva.');
  await expect(page.getByRole('heading', { level: 1, name: 'Tarde e noite' })).toBeVisible();
  // O campo fica como foi salvo, sem os espaços nas pontas.
  await expect(name).toHaveValue('Tarde e noite');
});

test('regra que não existe explica e leva de volta à lista', async ({ page }) => {
  await page.goto('/regras/regra-que-nao-existe');
  await expect(page.getByRole('heading', { name: 'Esta regra não existe mais' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver regras de jornada' })).toBeVisible();
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
