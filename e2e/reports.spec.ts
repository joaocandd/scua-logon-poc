import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Relatórios (/relatorios): horas extras, tempo de bloqueio e ausências, com período e grupo na
// URL, gráficos com teclado e tabela, e "Exportar CSV" em cada bloco. A série é fictícia e
// determinística: o relógio fica numa quinta-feira à tarde para os números não mudarem.
const THURSDAY = new Date('2026-11-12T15:00:00-03:00');

async function openReports(page: Page, url = '/relatorios'): Promise<void> {
  await page.clock.install({ time: THURSDAY });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 2, name: 'Horas extras' })).toBeVisible();
}

const block = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

test('três blocos, com gráfico por dia e por grupo, sem violações', async ({ page }) => {
  await openReports(page);

  for (const name of ['Horas extras', 'Tempo de bloqueio', 'Ausência']) {
    await expect(block(page, name)).toBeVisible();
    await expect(block(page, name).getByRole('button', { name: /^Exportar CSV/ })).toBeVisible();
  }
  const overtime = block(page, 'Horas extras');
  await expect(overtime.getByRole('group', { name: 'Horas extras por dia' })).toBeVisible();
  await expect(overtime.getByRole('group', { name: 'Horas extras por grupo' })).toBeVisible();
  // Um ponto por dia, com nome: 30 dias.
  await expect(
    overtime.getByRole('group', { name: 'Horas extras por dia' }).getByRole('img'),
  ).toHaveCount(30);
  await expect(page.getByText('Números fictícios, gerados para a demonstração.')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('período e grupo vão para a URL; com um grupo, some o gráfico por grupo', async ({ page }) => {
  await openReports(page);

  await page.getByLabel('Período', { exact: true }).selectOption('7');
  await expect(page).toHaveURL(/periodo=7/);
  const days = block(page, 'Horas extras').getByRole('group', { name: 'Horas extras por dia' });
  await expect(days.getByRole('img')).toHaveCount(7);

  await page.getByLabel('Grupo', { exact: true }).selectOption({ label: 'Atendimento' });
  await expect(page).toHaveURL(/grupo=grp-atendimento/);
  await expect(block(page, 'Horas extras')).toContainText('nos últimos 7 dias · Atendimento');
  await expect(page.getByRole('group', { name: 'Horas extras por grupo' })).toHaveCount(0);

  // Abrir a URL direto mostra o mesmo recorte.
  await page.reload();
  await expect(page.getByLabel('Período', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Grupo', { exact: true })).toHaveValue('grp-atendimento');
  await expect(days.getByRole('img')).toHaveCount(7);
});

test('gráfico só com teclado: setas passam pelos dias e o tooltip mostra o valor', async ({
  page,
}) => {
  await openReports(page, '/relatorios?periodo=7');
  const chart = page.getByRole('group', { name: 'Horas extras por dia' });
  const first = chart.getByRole('img').first();
  await first.focus();
  await expect(first).toBeFocused();
  await expect(first).toHaveCSS('outline-style', 'solid');
  await expect(first).toHaveAccessibleName(/^\w{3}, 06\/11: /);

  await page.keyboard.press('ArrowRight');
  await expect(chart.getByRole('img').nth(1)).toBeFocused();
  await page.keyboard.press('End');
  const last = chart.getByRole('img').last();
  await expect(last).toBeFocused();
  await expect(last).toHaveAccessibleName(/^qui, 12\/11 \(até agora\): /);
  const tooltip = block(page, 'Horas extras').locator('.tooltip');
  await expect(tooltip).toContainText('qui, 12/11 (até agora)');
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
});

test('"Ver como tabela" mostra os mesmos números e volta para o gráfico', async ({ page }) => {
  await openReports(page, '/relatorios?periodo=7');
  const overtime = block(page, 'Horas extras');
  // O texto do botão muda ao abrir: o localizador vai pelo elemento, não pelo nome.
  const toggle = overtime.locator('button.table-toggle').first();
  await expect(toggle).toHaveText(/Ver como tabela/);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const table = overtime.getByRole('table', { name: 'Horas extras por dia' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(8); // cabeçalho + 7 dias
  await expect(table.getByRole('columnheader')).toHaveText(['Dia', 'Horas extras']);
  await expectNoA11yViolations(page);

  await expect(toggle).toHaveText(/Ver como gráfico/);
  await toggle.click();
  await expect(table).toBeHidden();
  await expect(overtime.getByRole('group', { name: 'Horas extras por dia' })).toBeVisible();
});

test('"Exportar CSV" baixa o bloco com o recorte da tela', async ({ page }) => {
  await openReports(page, '/relatorios?periodo=7&grupo=grp-ti');
  const download = page.waitForEvent('download');
  await block(page, 'Ausência')
    .getByRole('button', { name: /^Exportar CSV/ })
    .click();
  const file = await download;

  expect(file.suggestedFilename()).toBe('ausencia-7-dias-ti.csv');
  const text = (await readFile(await file.path())).toString('utf8');
  const lines = text.replace(/^\uFEFF/, '').split('\r\n');
  expect(lines[0]).toBe('Dia;Grupo;Ausentes;Com jornada');
  expect(lines).toHaveLength(8);
  expect(lines.slice(1).every((line) => line.includes(';TI;'))).toBe(true);
  await expect(page.getByRole('region', { name: 'Aviso' })).toContainText(
    'Arquivo ausencia-7-dias-ti.csv baixado.',
  );
});
