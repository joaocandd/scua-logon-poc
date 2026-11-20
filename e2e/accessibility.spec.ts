import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';
import { screens } from './support/screens';

// Todas as rotas, com os estados simulados (?simular=) das telas principais, sem violações do
// axe. Roda nos quatro projetos: 1280 e 390 px, nos temas claro e escuro. Os estados que só
// aparecem depois de uma ação (diálogos, erro ao enviar, pedido decidido) ficam nos testes de cada
// feature.

test('a página inicial abre o painel Hoje', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page).toHaveTitle('Hoje · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});

test('o título da aba repete o <h1> de cada área', async ({ page }) => {
  const areas = [
    { path: '/aprovacoes', heading: 'Aprovações' },
    { path: '/regras', heading: 'Regras de jornada' },
    { path: '/pessoas', heading: 'Pessoas' },
    { path: '/relatorios', heading: 'Relatórios' },
    { path: '/configuracoes', heading: 'Configurações' },
    { path: '/endereco-que-nao-existe', heading: 'Página não encontrada' },
  ];
  for (const { path, heading } of areas) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page).toHaveTitle(`${heading} · Scua Logon`);
  }
});

for (const { url, ready, loading } of screens) {
  test(`${url} sem violações de acessibilidade`, async ({ page }) => {
    await page.goto(url);

    await expect(page.getByRole('heading', { name: ready, exact: true }).first()).toBeVisible();
    // A API simulada leva de 3 a 5 s no modo lento: o axe roda com a tela ainda carregando.
    if (!loading) await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expectNoA11yViolations(page);
  });
}

// Áreas fora do escopo da PoC: a tela diz o que teria e onde está o plano, sem parecer quebrada.
const outOfScope = [
  { path: '/pessoas', mentions: 'colaborador com o grupo e a regra de jornada' },
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
