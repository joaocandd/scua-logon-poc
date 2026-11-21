import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Pessoas (/pessoas): os 40 colaboradores com matrícula, cargo, grupo, regra, a estação agora
// (motor de regras) e as horas extras dos últimos 30 dias. O relógio fica numa terça às 18h20,
// como em /estacoes: o Comercial já saiu e a Flexível está na jornada.
const TUESDAY_EVENING = new Date('2026-11-03T18:20:00-03:00');

async function openPeople(page: Page, url = '/pessoas'): Promise<void> {
  await page.clock.install({ time: TUESDAY_EVENING });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Pessoas' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Colaboradores' })).toBeVisible();
}

const table = (page: Page) => page.getByRole('table', { name: 'Colaboradores' });
/** Os nomes na ordem da lista (o link de cada linha; as iniciais ficam fora). */
const names = (page: Page) => table(page).getByRole('rowheader').getByRole('link');
const rowOf = (page: Page, name: string) =>
  table(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name }) });

test('lista os 40 colaboradores com matrícula, cargo, grupo, regra, estação e horas extras', async ({
  page,
}) => {
  await openPeople(page);

  await expect(page.getByRole('link', { name: 'Colaboradores' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(table(page).getByRole('columnheader')).toHaveText([
    'Nome',
    'Matrícula',
    'Cargo',
    'Grupo',
    'Regra',
    'Estação agora',
    'Horas extras (30 dias)',
  ]);
  await expect(table(page).getByRole('rowheader')).toHaveCount(40);
  await expect(page.locator('p.count')).toHaveText('40 colaboradores');
  await expect(names(page).first()).toHaveText('Aline Cardoso');

  const joao = rowOf(page, 'João Pedro Antunes');
  await expect(joao).toContainText('20296');
  await expect(joao).toContainText('Executivo de contas');
  await expect(joao).toContainText('Comercial');
  await expect(joao).toContainText('Bloqueada');
  await expect(joao).toContainText(/\d+(,\d)? h/);
  // A diretora não está em nenhuma regra: a estação dela não é controlada.
  await expect(rowOf(page, 'Renata Albuquerque')).toContainText('Estação sem controle');
  await expectNoA11yViolations(page);
});

test('busca por nome ou matrícula e filtros vão para a URL', async ({ page }) => {
  await openPeople(page);

  await page.getByLabel('Buscar por nome ou matrícula').fill('20296');
  await expect(page).toHaveURL(/busca=20296/);
  await expect(names(page)).toHaveText(['João Pedro Antunes']);
  await expect(page.getByRole('status')).toHaveText('1 colaborador de 40');

  await page.getByLabel('Buscar por nome ou matrícula').fill('');
  await page.getByLabel('Grupo', { exact: true }).selectOption({ label: 'TI' });
  await expect(page).toHaveURL(/grupo=grp-ti/);
  await expect(table(page).getByRole('rowheader')).toHaveCount(5);

  await page.getByLabel('Regra', { exact: true }).selectOption({ label: 'Comercial' });
  await expect(page.getByRole('heading', { name: 'Nenhum colaborador encontrado' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL('/pessoas');
  await expect(table(page).getByRole('rowheader')).toHaveCount(40);

  await page.getByLabel('Ordem').selectOption({ label: 'Nome, de Z a A' });
  await expect(page).toHaveURL(/ordem=desc/);
  await expect(names(page).first()).toHaveText('Wellington Prates');

  // A URL abre o mesmo recorte.
  await page.goto('/pessoas?estado=sem_aprovacao');
  await expect(page.getByLabel('Estado da estação')).toHaveValue('sem_aprovacao');
  await expect(table(page).getByRole('rowheader')).toHaveCount(6);
});

test('o nome abre o perfil: cadastro, estação, jornada de hoje, horas extras, pedidos e eventos', async ({
  page,
  isMobile,
}) => {
  await openPeople(page, '/pessoas?grupo=grp-comercial');
  await page.getByRole('link', { name: 'João Pedro Antunes' }).click();
  await expect(page).toHaveURL('/pessoas/col-08?grupo=grp-comercial');

  const profile = page.getByRole('article', { name: 'João Pedro Antunes' });
  await expect(
    profile.getByRole('heading', { level: 2, name: 'João Pedro Antunes' }),
  ).toBeFocused();
  await expect(profile).toContainText('Edição de cadastro fica fora desta prova de conceito.');
  await expect(profile).toContainText('20296');
  await expect(profile).toContainText('joao.antunes@empresa.example');
  await expect(profile.getByRole('link', { name: 'Marina Couto' })).toHaveAttribute(
    'href',
    '/pessoas/col-07',
  );
  await expect(profile).toContainText(/Admissão\s*\d\d\/\d\d\/20\d\d/);
  await expect(profile).toContainText('Bloqueada: fora da jornada Comercial');
  await expect(
    profile.getByRole('group', { name: /Jornada de João Pedro Antunes hoje/ }),
  ).toBeVisible();
  await expect(
    profile.getByRole('heading', { name: 'Horas extras nos últimos 30 dias' }),
  ).toBeVisible();
  await expect(profile.getByRole('link', { name: /^Até \d+h/ }).first()).toHaveAttribute(
    'href',
    /^\/aprovacoes\/ped-/,
  );
  await expect(
    profile.getByRole('link', { name: 'Ver tudo de João Pedro Antunes na auditoria' }),
  ).toHaveAttribute('href', '/relatorios/auditoria?pessoa=col-08');
  await expectNoA11yViolations(page);

  // Fechar (desktop) ou Voltar (celular) leva à lista com os filtros, e o foco volta ao nome.
  await page
    .getByRole('link', { name: isMobile ? 'Voltar para a lista' : 'Fechar o perfil' })
    .click();
  await expect(page).toHaveURL('/pessoas?grupo=grp-comercial');
  await expect(page.getByRole('link', { name: 'João Pedro Antunes' })).toBeFocused();
});

test('perfil de quem não existe diz isso', async ({ page }) => {
  await page.goto('/pessoas/col-99');
  await expect(
    page.getByRole('heading', { name: 'Não encontramos este colaborador' }),
  ).toBeVisible();
});

test('a busca (Ctrl+K) abre o perfil do colaborador', async ({ page }) => {
  await page.goto('/hoje');
  await expect(page.getByRole('button', { name: 'Renata Albuquerque' })).toBeVisible();
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page
    .getByRole('combobox', { name: 'Buscar páginas, colaboradores, grupos e regras' })
    .fill('larissa');
  await page.getByRole('option', { name: /Larissa Fontes/ }).click();
  await expect(page).toHaveURL('/pessoas/col-02');
  await expect(page.getByRole('heading', { level: 2, name: 'Larissa Fontes' })).toBeVisible();
});

test('aba Grupos: um cartão por grupo, e "Ver colaboradores" abre a lista filtrada', async ({
  page,
}) => {
  await page.goto('/pessoas');
  await page.getByRole('link', { name: 'Grupos', exact: true }).click();
  await expect(page).toHaveURL('/pessoas/grupos');
  await expect(page.getByRole('link', { name: 'Grupos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(6);
  const ti = page.getByRole('article', { name: 'TI' });
  await expect(ti).toContainText('5 colaboradores');
  await expect(ti.getByRole('link', { name: 'Thiago Moreira' })).toHaveAttribute(
    'href',
    '/pessoas/col-32',
  );
  await expect(ti.getByRole('link', { name: 'Renata Albuquerque' })).toBeVisible();
  await expect(ti.getByRole('link', { name: 'Flexível' })).toHaveAttribute(
    'href',
    '/regras/regra-flexivel',
  );
  await expectNoA11yViolations(page);

  await ti.getByRole('link', { name: 'Ver colaboradores de TI' }).click();
  await expect(page).toHaveURL('/pessoas?grupo=grp-ti');
  await expect(table(page).getByRole('rowheader')).toHaveCount(5);
});
