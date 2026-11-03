import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Painel "Hoje" (/hoje) em 1280 px, 390 px e no tema escuro. Os dados de demonstração são
// relativos a "agora", e a hora decide o estado de cada estação. O relógio fica numa terça-feira
// às 18h20 em São Paulo: o Comercial já saiu (bloqueada), a Flexível está na jornada e a Tarde,
// no intervalo (18h às 19h).
const TUESDAY_EVENING = new Date('2026-11-03T18:20:00-03:00');

async function openPanel(page: Page, url = '/hoje'): Promise<void> {
  // Relógio falso: o tempo corre normalmente a partir das 18h20, e o teste pode pular adiante.
  await page.clock.install({ time: TUESDAY_EVENING });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
}

/** Contador pelo rótulo. O nome do link é o número e o rótulo, como na tela: "9 Em jornada". */
const counter = (page: Page, label: string) =>
  page.getByRole('link', { name: new RegExp(`^\\d+ ${label}$`) });

const list = (page: Page) => page.getByRole('table');

test('os contadores mostram o estado das estações agora', async ({ page }) => {
  await openPanel(page);

  await expect(counter(page, 'Em jornada')).toHaveAccessibleName('9 Em jornada');
  await expect(counter(page, 'Em intervalo')).toHaveAccessibleName('9 Em intervalo');
  await expect(counter(page, 'Hora extra aprovada')).toHaveAccessibleName('0 Hora extra aprovada');
  await expect(counter(page, 'Fora do expediente')).toHaveAccessibleName('0 Fora do expediente');
  await expect(page.getByText(/Atualizado (agora|há \d+ s)/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test('um contador abre a lista na própria página; "Fechar lista" devolve o foco', async ({
  page,
}) => {
  await openPanel(page);
  const interval = counter(page, 'Em intervalo');
  await interval.click();

  await expect(page).toHaveURL('/hoje?estado=intervalo');
  await expect(interval).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('heading', { level: 3, name: 'Em intervalo · 9' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Lista aberta: Em intervalo, 9 estações.');
  const bianca = list(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Bianca Nogueira' }) });
  await expect(bianca).toContainText('Atendimento');
  await expect(bianca).toContainText('Bloqueada: intervalo da jornada Tarde (das 18h às 19h).');
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Fechar lista' }).click();
  await expect(page).toHaveURL('/hoje');
  await expect(list(page)).toBeHidden();
  await expect(interval).toBeFocused();
});

test('o filtro por grupo vale para os contadores e para a lista', async ({ page }) => {
  await openPanel(page);
  await page.getByLabel('Grupo').selectOption({ label: 'Comercial' });

  await expect(page).toHaveURL('/hoje?grupo=grp-comercial');
  await expect(counter(page, 'Em jornada')).toHaveAccessibleName('0 Em jornada');
  await counter(page, 'Bloqueada').click();
  await expect(page).toHaveURL('/hoje?grupo=grp-comercial&estado=bloqueada');
  await expect(list(page).getByRole('rowheader')).toHaveCount(9);
  await expect(list(page)).toContainText('Bloqueada: fora da jornada Comercial (das 8h às 17h).');

  await counter(page, 'Em intervalo').click();
  await expect(page.getByText('Nenhuma estação em intervalo agora em Comercial.')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('ao vivo: consulta de novo e os números acompanham a hora', async ({ page }) => {
  await openPanel(page, '/hoje?estado=intervalo');
  await expect(counter(page, 'Em intervalo')).toHaveAccessibleName('9 Em intervalo');

  // 19h05: o intervalo da Tarde acabou, a Flexível terminou e a Natália segue na hora extra
  // aprovada (até 21h).
  await page.clock.fastForward('45:00');
  await expect(counter(page, 'Em intervalo')).toHaveAccessibleName('0 Em intervalo');
  await expect(counter(page, 'Em jornada')).toHaveAccessibleName('9 Em jornada');
  await expect(counter(page, 'Hora extra aprovada')).toHaveAccessibleName('1 Hora extra aprovada');
  await expect(page.getByText('Nenhuma estação em intervalo agora.')).toBeVisible();
  await expect(page.getByText('Atualizado agora')).toBeVisible();
});

test('sem estações controladas, diz por quê e leva às regras', async ({ page }) => {
  await openPanel(page, '/hoje?simular=vazio');
  await expect(page.getByRole('heading', { name: 'Nenhuma estação controlada' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver regras de jornada' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('com a API fora do ar, oferece tentar de novo', async ({ page }) => {
  await openPanel(page, '/hoje?simular=erro');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar o painel' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('sem permissão, diz a quem pedir acesso', async ({ page }) => {
  await openPanel(page, '/hoje?simular=sem-permissao');
  await expect(
    page.getByRole('heading', { name: 'Você não tem acesso ao painel Hoje' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});
