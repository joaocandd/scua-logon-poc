import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Página pública do link do e-mail (/aprovacao/:token), fora da casca do app. Tokens de exemplo
// nas fixtures: valido-ped-02, valido-ped-04, expirado-ped-22 e usado-ped-13.

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Abre um link válido e espera o pedido aparecer. */
async function openValid(page: Page, url: string, name: string): Promise<void> {
  await open(page, url);
  await expect(page.getByRole('heading', { level: 1, name: `Pedido de ${name}` })).toBeVisible();
}

const notice = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ });
const pendingLink = (page: Page) =>
  page.getByRole('link', { name: 'Ver outros pedidos pendentes' });

test('link válido: o pedido com o contexto do fluxo A, fora do menu do app', async ({ page }) => {
  await openValid(page, '/aprovacao/valido-ped-02', 'Lucas Bittencourt');

  await expect(page).toHaveTitle('Pedido de hora extra · Scua Logon');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Até 19h30 (+2h30)');
  await expect(page.getByRole('main')).toContainText(
    'Passa de 2 h extras no dia. Pede 2h30. Se aprovar, a estação libera só até 19h.',
  );
  await expect(page.getByRole('main')).toContainText('1h30 de hora extra nos últimos 30 dias');
  await expect(page.getByRole('group', { name: /^Jornada de Lucas Bittencourt, / })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(
    'Se aprovar, a estação bloqueia às 19h, no limite de 2 h extras.',
  );
  await expect(pendingLink(page)).toBeVisible();
  await expectNoA11yViolations(page);
});

test('o link do ped-04 mostra a interjornada', async ({ page }) => {
  await openValid(page, '/aprovacao/valido-ped-04', 'Mateus Farias');
  await expect(page.getByRole('main')).toContainText(
    'No dia seguinte, a estação só libera às 10h30, e não às 10h.',
  );
});

test('aprovar confirma e mostra "Desfazer"; desfazer volta o pedido', async ({ page }) => {
  await openValid(page, '/aprovacao/valido-ped-02', 'Lucas Bittencourt');

  await page.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }).click();

  await expect(notice(page)).toHaveText('Pedido aprovado. Agora vai para a validação do RH.');
  await expect(page.getByRole('main')).toContainText(/Aprovado às \d{1,2}h(\d{2})?/);
  const undo = page.getByRole('button', { name: 'Desfazer a decisão sobre Lucas Bittencourt' });
  await expect(undo).toBeFocused();
  await expect(page.getByRole('main')).toContainText(
    'Se o RH validar, a estação bloqueia às 19h, no limite de 2 h extras.',
  );
  await expectNoA11yViolations(page);

  await page.keyboard.press('Enter');

  await expect(notice(page)).toHaveText('Decisão desfeita. O pedido voltou a aguardar.');
  await expect(
    page.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }),
  ).toBeFocused();
});

test('recusar pede o motivo e confirma', async ({ page }) => {
  await openValid(page, '/aprovacao/valido-ped-04', 'Mateus Farias');
  await page.getByRole('button', { name: 'Recusar o pedido de Mateus Farias' }).click();

  const dialog = page.getByRole('dialog', { name: 'Recusar o pedido de Mateus Farias?' });
  await dialog.getByRole('button', { name: 'Recusar pedido' }).click();
  await expect(dialog.getByText('Escreva o motivo da recusa.')).toBeVisible();
  await dialog.getByLabel('Motivo da recusa').fill('O atendimento pode ficar com o turno da noite');
  await dialog.getByRole('button', { name: 'Recusar pedido' }).click();

  await expect(dialog).toBeHidden();
  await expect(notice(page)).toHaveText('Pedido recusado.');
  await expect(page.getByRole('main')).toContainText(
    'Motivo: O atendimento pode ficar com o turno da noite',
  );
  await expect(
    page.getByRole('button', { name: 'Desfazer a decisão sobre Mateus Farias' }),
  ).toBeFocused();
  await expectNoA11yViolations(page);
});

test('quem usou o link e volta a ele vê a própria decisão, com "Desfazer"', async ({ page }) => {
  await openValid(page, '/aprovacao/valido-ped-04', 'Mateus Farias');
  await page.getByRole('button', { name: 'Aprovar o pedido de Mateus Farias' }).click();
  await expect(notice(page)).toHaveText('Pedido aprovado.');

  // Sai e volta pelo histórico do navegador, sem recarregar: a API simulada guarda a decisão.
  await pendingLink(page).click();
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Faprovacoes$/);
  await page.goBack();

  await expect(page.getByRole('main')).toContainText(/Aprovado por você às/);
  await expect(
    page.getByRole('button', { name: 'Desfazer a decisão sobre Mateus Farias' }),
  ).toBeVisible();
});

test.describe('link que não serve mais', () => {
  const cases = [
    {
      url: '/aprovacao/nao-existe',
      title: 'Link inválido',
      message: 'Este link não é válido. Confira se ele veio completo do e-mail.',
    },
    {
      url: '/aprovacao/expirado-ped-22',
      title: 'Link expirado',
      message: 'Este link expirou. O pedido de Ana Ribeiro venceu às 18h30.',
    },
    {
      url: '/aprovacao/usado-ped-13',
      title: 'Pedido já decidido',
      message: /^Este pedido já foi aprovado por Bianca às \d{1,2}h(\d{2})?\.$/,
    },
  ];

  for (const { url, title, message } of cases) {
    test(`${title}: mensagem humana e o link para os pendentes`, async ({ page }) => {
      await open(page, url);

      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.locator('.closed-message')).toHaveText(message);
      await expect(page.getByRole('button')).toHaveCount(0);
      await expect(pendingLink(page)).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }
});

test('?simular=erro: mensagem humana e "Tentar de novo"', async ({ page }) => {
  await open(page, '/aprovacao/valido-ped-02?simular=erro');

  await expect(page.getByRole('alert')).toContainText('Não foi possível abrir o pedido');
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  await expect(pendingLink(page)).toBeVisible();
  await expectNoA11yViolations(page);
});

test('?simular=decidido: ao aprovar, a página diz quem decidiu antes', async ({ page }) => {
  await openValid(page, '/aprovacao/valido-ped-02?simular=decidido', 'Lucas Bittencourt');

  await page.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }).click();

  const heading = page.getByRole('heading', { level: 1, name: 'Pedido já decidido' });
  await expect(heading).toBeFocused();
  await expect(page.locator('.closed-message')).toHaveText(
    /^Este pedido já foi aprovado por Marina às \d{1,2}h(\d{2})?\.$/,
  );
  await expectNoA11yViolations(page);
});

test('"Ver outros pedidos pendentes" passa pelo login e chega em /aprovacoes', async ({ page }) => {
  await open(page, '/aprovacao/expirado-ped-22');

  await pendingLink(page).click();
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Faprovacoes$/);
  await page.getByRole('button', { name: 'Entrar com conta corporativa' }).click();

  await expect(page).toHaveURL(/\/aprovacoes$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Aprovações' })).toBeVisible();
});
