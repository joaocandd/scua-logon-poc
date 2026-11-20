import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Configurações (/configuracoes) em 1280 px, 390 px e no tema escuro: o custo médio da hora extra
// e o botão do modo demo que restaura os dados da apresentação.

const costField = (page: Page) => page.getByLabel('Custo médio da hora extra (R$ por hora)');
const toast = (page: Page) => page.locator('app-toast-panel');

async function openSettings(page: Page, url = '/configuracoes'): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
}

test('salva o custo médio da hora extra', async ({ page }) => {
  await openSettings(page);
  await expect(costField(page)).toHaveValue('45,00');
  await expect(costField(page)).toHaveAccessibleDescription(
    'Salário, adicional e encargos, em média. Use vírgula nos centavos, como 45,50.',
  );
  await expectNoA11yViolations(page);

  await costField(page).fill('52,5');
  await page.getByRole('button', { name: 'Salvar custo' }).click();
  await expect(toast(page)).toContainText('Custo médio salvo: R$ 52,50 por hora.');
  await expect(costField(page)).toHaveValue('52,50');
});

test('o erro do campo só aparece depois de "Salvar custo"', async ({ page }) => {
  await openSettings(page);
  await costField(page).fill('');
  await costField(page).press('Tab');
  await expect(page.getByText('Informe o custo médio da hora extra.')).toBeHidden();

  await page.getByRole('button', { name: 'Salvar custo' }).click();
  await expect(costField(page)).toBeFocused();
  await expect(costField(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Informe o custo médio da hora extra.')).toBeVisible();
  await expectNoA11yViolations(page);

  await costField(page).fill('quarenta');
  await expect(
    page.getByText('Use só números, com vírgula nos centavos, como 45,50.'),
  ).toBeVisible();
  await expect(toast(page)).toBeHidden();
});

test('com a API fora do ar, oferece tentar de novo', async ({ page }) => {
  await openSettings(page, '/configuracoes?simular=erro');
  await expect(
    page.getByRole('heading', { name: 'Não conseguimos carregar as configurações' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test('sem permissão, diz a quem pedir acesso', async ({ page }) => {
  await openSettings(page, '/configuracoes?simular=sem-permissao');
  await expect(
    page.getByRole('heading', { name: 'Você não tem acesso às configurações' }),
  ).toBeVisible();
  await expect(page.getByText('peça acesso ao administrador do Scua Logon.')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('restaura os dados de demonstração depois de confirmar', async ({ page }) => {
  await openSettings(page);
  await costField(page).fill('60');
  await page.getByRole('button', { name: 'Salvar custo' }).click();
  await expect(toast(page)).toContainText('Custo médio salvo: R$ 60,00 por hora.');

  const restore = page.getByRole('button', { name: 'Restaurar dados de demonstração' });
  await restore.click();
  const dialog = page.getByRole('alertdialog', { name: 'Restaurar os dados de demonstração?' });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page);

  // Cancelar não muda nada e devolve o foco ao botão.
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await expect(restore).toBeFocused();
  await expect(costField(page)).toHaveValue('60,00');

  await restore.click();
  await dialog.getByRole('button', { name: 'Restaurar dados' }).click();
  await expect(toast(page)).toContainText('Dados de demonstração restaurados.');
  // Sem recarregar a página: o valor volta ao da demonstração.
  await expect(costField(page)).toHaveValue('45,00');
});

test('se a API cair ao restaurar, diz o que fazer', async ({ page }) => {
  await openSettings(page);
  // A API simulada lê o ?simular= a cada chamada: com ele na URL, a próxima chamada falha.
  await page.evaluate(() => history.replaceState(null, '', '/configuracoes?simular=erro'));
  await page.getByRole('button', { name: 'Restaurar dados de demonstração' }).click();
  await page.getByRole('button', { name: 'Restaurar dados' }).click();
  const section = page.getByRole('region', { name: 'Dados de demonstração' });
  await expect(section.getByRole('alert')).toHaveText(
    'Não conseguimos falar com o servidor. Tente de novo em instantes.',
  );
  await expect(toast(page)).toBeHidden();
  await expectNoA11yViolations(page);
});
