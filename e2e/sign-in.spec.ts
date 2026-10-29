import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// "Senha" exato: sem isso, o botão "Mostrar senha" também casa com o rótulo.
const usernameField = (page: Page) => page.getByLabel('Usuário', { exact: true });
const passwordField = (page: Page) => page.getByLabel('Senha', { exact: true });
const submitButton = (page: Page) => page.getByRole('button', { name: 'Entrar', exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/entrar');
  // A rota carrega sob demanda: o Tab só faz sentido depois que a tela aparece.
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
});

test('/entrar abre sem violações de acessibilidade; no celular, só o formulário', async ({
  page,
  isMobile,
}) => {
  await expect(page).toHaveTitle('Entrar · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await expect(page.getByText('Hora extra só com aprovação.')).toBeVisible({ visible: !isMobile });
  await expectNoA11yViolations(page);
});

test('o Tab percorre a tela na ordem de leitura', async ({ page }) => {
  const order = [
    usernameField(page),
    passwordField(page),
    page.getByRole('button', { name: 'Mostrar senha' }),
    page.getByRole('link', { name: 'Esqueci minha senha' }),
    submitButton(page),
    page.getByRole('button', { name: 'Entrar com conta corporativa' }),
  ];
  for (const target of order) {
    await page.keyboard.press('Tab');
    await expect(target).toBeFocused();
  }
});

test('entra só com o teclado', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(usernameField(page)).toBeFocused();
  await page.keyboard.type('marina.alves');
  await page.keyboard.press('Tab');
  await page.keyboard.type('qualquer-senha');

  // Mostra a senha com a barra de espaço e volta para o campo.
  await page.keyboard.press('Tab');
  const reveal = page.getByRole('button', { name: 'Mostrar senha' });
  await expect(reveal).toBeFocused();
  await page.keyboard.press('Space');
  await expect(reveal).toHaveAttribute('aria-pressed', 'true');
  await expect(passwordField(page)).toHaveAttribute('type', 'text');
  await expect(passwordField(page)).toHaveValue('qualquer-senha');
  await page.keyboard.press('Shift+Tab');

  // Enter no campo envia o formulário.
  await page.keyboard.press('Enter');
  await expect(submitButton(page)).toHaveAttribute('aria-busy', 'true');
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});

test('credencial inválida: alerta acima do formulário e foco na senha', async ({ page }) => {
  await usernameField(page).fill('marina.alves');
  await passwordField(page).fill('erro');
  await submitButton(page).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Usuário ou senha incorretos. Confira e tente de novo.',
  );
  await expect(passwordField(page)).toBeFocused();
  await expect(page).toHaveURL(/\/entrar$/);
  await expectNoA11yViolations(page);
});

test('campos vazios: erro em cada campo e foco no primeiro', async ({ page }) => {
  await submitButton(page).click();

  await expect(page.getByText('Informe o usuário.')).toBeVisible();
  await expect(page.getByText('Informe a senha.')).toBeVisible();
  await expect(usernameField(page)).toBeFocused();
  await expect(usernameField(page)).toHaveAttribute('aria-invalid', 'true');
  await expectNoA11yViolations(page);
});

test('entra com a conta corporativa simulada', async ({ page }) => {
  const corporate = page.getByRole('button', { name: 'Entrar com conta corporativa' });
  await corporate.click();

  await expect(corporate).toHaveAttribute('aria-busy', 'true');
  await expect(page).toHaveURL(/\/hoje$/);
});

test('"Esqueci minha senha" abre a página de ajuda e volta', async ({ page }) => {
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();

  await expect(page).toHaveURL(/\/entrar\/esqueci-minha-senha$/);
  await expect(page).toHaveTitle('Esqueci minha senha · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Esqueci minha senha' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: 'Voltar para Entrar' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});
