import { expect, test, type Page } from '@playwright/test';
import { screens } from './support/screens';

// Nenhum erro ou aviso no console do navegador, em todas as rotas e estados simulados da lista
// do axe. Também conta exceção sem tratamento (pageerror). O teste espera os dados chegarem
// (inclusive no ?simular=lento) para pegar o que aparece depois da primeira pintura.

/** Começa a ouvir o console antes de abrir a página. Devolve a lista, que cresce sozinha. */
function watchConsole(page: Page): string[] {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      messages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => messages.push(`exceção: ${error.message}`));
  return messages;
}

for (const { url, ready } of screens) {
  test(`${url} sem erros nem avisos no console`, async ({ page }) => {
    const messages = watchConsole(page);
    await page.goto(url);

    await expect(page.getByRole('heading', { name: ready, exact: true }).first()).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 });
    expect(messages).toEqual([]);
  });
}
