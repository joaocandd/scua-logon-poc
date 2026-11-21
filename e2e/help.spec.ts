import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Ajuda (/ajuda): perguntas frequentes em <details>, aberta pelo menu do usuário.

test('o menu do usuário leva à Ajuda; as perguntas abrem com o teclado', async ({ page }) => {
  await page.goto('/hoje');
  const trigger = page.getByRole('button', { name: 'Renata Albuquerque' });
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Ajuda' }).click();
  await expect(page).toHaveURL('/ajuda');
  await expect(page.getByRole('heading', { level: 1, name: 'Ajuda' })).toBeVisible();

  const questions = page.locator('summary');
  await expect(questions).toHaveCount(5);
  await expect(questions.first()).toHaveText('O que é o Scua Logon?');

  const answer = page.getByText('É o software de gestão de jornada');
  await expect(answer).toBeHidden();
  await questions.first().focus();
  await page.keyboard.press('Enter');
  await expect(answer).toBeVisible();
  await expectNoA11yViolations(page);
});
