import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

test('a página inicial abre o painel Hoje sem violações de acessibilidade', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page).toHaveTitle('Hoje · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expectNoA11yViolations(page);
});

const pages = [
  { path: '/aprovacoes', heading: 'Aprovações' },
  { path: '/regras', heading: 'Regras de jornada' },
  { path: '/pessoas', heading: 'Pessoas' },
  { path: '/relatorios', heading: 'Relatórios' },
  { path: '/configuracoes', heading: 'Configurações' },
  { path: '/endereco-que-nao-existe', heading: 'Página não encontrada' },
];

for (const { path, heading } of pages) {
  test(`${path} abre sem violações de acessibilidade`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveTitle(`${heading} · Scua Logon`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

// Áreas fora do escopo da PoC: a tela diz o que teria e onde está o plano, sem parecer quebrada.
const outOfScope = [
  { path: '/pessoas', mentions: 'colaborador com o grupo e a regra de jornada' },
  { path: '/relatorios', mentions: 'relatórios de horas extras e de bloqueios' },
  { path: '/configuracoes', mentions: 'feriados da empresa, avisos padrão, permissões' },
];

for (const { path, mentions } of outOfScope) {
  test(`${path} diz o que está fora do escopo desta prova de conceito`, async ({ page }) => {
    await page.goto(path);

    const heading = page.getByRole('heading', {
      level: 2,
      name: 'Fora do escopo desta prova de conceito',
    });
    await expect(heading).toBeVisible();
    await expect(page.getByText(mentions)).toBeVisible();
    await expect(
      page.getByText(/O plano de migração desta área está na proposta de arquitetura\./),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });
}
