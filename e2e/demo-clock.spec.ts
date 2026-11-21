import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Relógio de demonstração (?relogio=): o app vive numa terça às 17h40, qualquer que seja o dia
// real. Este teste confere, nesse horário, cada cenário do docs/roteiro-demo.md, navegando pelo
// app como na apresentação (o relógio fica guardado na sessão da aba). Sem page.clock: o ponto é
// funcionar com o relógio de verdade do computador, como no sábado da demo.
const DEMO_URL = '/hoje?relogio=2026-11-24T17:40';
const BANNER = /Relógio de demonstração: terça, 24\/11, 17h4\d$/;

const banner = (page: Page) => page.getByRole('region', { name: 'Relógio de demonstração' });
const card = (page: Page, name: string) => page.getByRole('article', { name }).first();

test.skip(({ colorScheme }) => colorScheme === 'dark', 'Os cenários não mudam com o tema');

test('cada cenário do roteiro aparece na terça às 17h40', async ({ page, isMobile }) => {
  await page.goto(DEMO_URL);
  await expect(banner(page).locator('p')).toHaveText(BANNER);
  await expectNoA11yViolations(page);

  // Painel Hoje: pedidos aguardando, gente em jornada e o alerta da Noturna em observação.
  const pending = page.getByRole('region', { name: 'Pedidos aguardando', exact: true });
  await expect(pending).toContainText(/\d+ pedidos aguardando aprovação/);
  await expect(page.getByRole('link', { name: /^[1-9]\d* Em jornada$/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Alertas', exact: true })).toContainText(
    /\d+ estações liberadas sem aprovação/,
  );

  // Fluxo A: os cartões de Lucas (ped-02) e Mateus (ped-04), pelo menu.
  await page
    .getByRole('link', { name: /^Aprovações/ })
    .first()
    .click();
  await expect(page).toHaveURL('/aprovacoes');
  await expect(banner(page)).toBeVisible();
  await expect(card(page, 'Lucas Bittencourt')).toContainText('Passa de 2 h extras no dia.');
  await expect(card(page, 'Lucas Bittencourt')).toContainText(
    'Pede 2h30. Se aprovar, a estação libera só até 19h.',
  );
  await expect(card(page, 'Mateus Farias')).toContainText(
    'Quebra o descanso de 11 h entre jornadas.',
  );
  await expect(card(page, 'Jéssica Moura')).toBeVisible();
  await expect(card(page, 'Vinícius Amaral')).toBeVisible();

  // Fluxo B: o conflito da regra Fechamento do mês.
  if (isMobile) await page.getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('link', { name: 'Regras de jornada' }).click();
  await page.getByRole('link', { name: 'Fechamento do mês' }).click();
  await expect(page.getByText(/já estão na regra Comercial\./)).toBeVisible();

  // Estações: as liberadas sem aprovação.
  await page.goto('/estacoes?estado=sem_aprovacao');
  await expect(banner(page)).toBeVisible();
  await expect(page.getByRole('table', { name: 'Estações' }).getByRole('rowheader')).toHaveCount(6);
});

test('links do e-mail na terça às 17h40', async ({ page }) => {
  await page.goto('/aprovacao/valido-ped-02?relogio=2026-11-24T17:40');
  await expect(banner(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pedido de Lucas Bittencourt' })).toBeVisible();
  await page.goto('/aprovacao/valido-ped-04');
  await expect(page.getByRole('heading', { name: 'Pedido de Mateus Farias' })).toBeVisible();
  await page.goto('/aprovacao/expirado-ped-22');
  await expect(page.getByRole('heading', { name: 'Link expirado' })).toBeVisible();
  await expect(page.getByText('O pedido de Ana Ribeiro venceu às 18h30.')).toBeVisible();
  await page.goto('/aprovacao/usado-ped-13');
  await expect(page.getByRole('heading', { name: 'Pedido já decidido' })).toBeVisible();
});

test('"Desligar" volta ao relógio do computador e tira o parâmetro', async ({ page }) => {
  await page.goto(DEMO_URL);
  await banner(page).getByRole('button', { name: 'Desligar' }).click();
  await expect(page).toHaveURL('/hoje');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  // Continua desligado ao recarregar.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('sem o parâmetro, nada muda: sem faixa', async ({ page }) => {
  await page.goto('/hoje');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});
