import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Casca do app: menu lateral (desktop, 1280 px), barra inferior (celular, 390 px), busca com
// Ctrl+K e menu do usuário com o tema.

const AREAS = [
  { name: 'Hoje', path: '/hoje' },
  { name: 'Aprovações', path: '/aprovacoes' },
  { name: 'Pessoas', path: '/pessoas' },
  { name: 'Regras de jornada', path: '/regras' },
  { name: 'Relatórios', path: '/relatorios' },
  { name: 'Configurações', path: '/configuracoes' },
];

const PENDING = /^Aprovações \d+ pendentes?$/;
const SEARCH_LABEL = 'Buscar páginas, colaboradores, grupos e regras';

/** Abre a página e espera o usuário simulado e o número de pendentes chegarem da API. */
async function open(page: Page, url = '/hoje'): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Renata Albuquerque' })).toBeVisible();
  await expect(page.getByRole('link', { name: PENDING })).toBeVisible();
}

/** Elemento com o foco agora. */
const focused = (page: Page) => page.locator(':focus');

/** Aperta a tecla até o foco chegar em `target`. */
async function pressUntilFocused(page: Page, key: string, target: Locator): Promise<void> {
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(key);
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`${key} não levou o foco até ${target}`);
}

async function expectOnPage(page: Page, area: { name: string; path: string }): Promise<void> {
  await expect(page).toHaveURL(area.path);
  await expect(page.getByRole('heading', { level: 1, name: area.name })).toBeVisible();
  // O foco vai para o <main>, sem anel de foco.
  const main = page.getByRole('main');
  await expect(main).toBeFocused();
  await expect(main).toHaveCSS('outline-style', 'none');
}

test.describe('Casca no desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'O menu lateral só aparece a partir de 1024 px');

  test('sem violações de acessibilidade, com o menu do usuário e a busca abertos', async ({
    page,
  }) => {
    await open(page);
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(1);
    await expect(page.getByRole('banner')).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'Renata Albuquerque' }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Escuro' })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: SEARCH_LABEL }).fill('fin');
    await expect(page.getByRole('option', { name: /Financeiro/ }).first()).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('percorre todo o menu só com teclado', async ({ page }) => {
    await open(page);

    // Ordem do Tab: pular para o conteúdo, marca, busca, conta e as seis áreas.
    const order = [
      'Pular para o conteúdo',
      'Scua Logon',
      'Buscar',
      'Renata Albuquerque',
      'Hoje',
      PENDING,
      'Pessoas',
      'Regras de jornada',
      'Relatórios',
      'Configurações',
    ];
    for (const name of order) {
      await page.keyboard.press('Tab');
      await expect(focused(page)).toHaveAccessibleName(name);
    }

    // Cada área abre com Enter, fica marcada como a página atual e o foco vai para o <main>.
    // Do <main>, Shift+Tab volta pelo menu até a próxima área.
    const nav = page.getByRole('navigation', { name: 'Principal' });
    for (const area of [...AREAS].reverse()) {
      const link = nav.locator(`a[href="${area.path}"]`);
      if (!(await link.evaluate((el) => el === document.activeElement))) {
        await pressUntilFocused(page, 'Shift+Tab', link);
      }
      await page.keyboard.press('Enter');
      await expectOnPage(page, area);
      await expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  test('"Pular para o conteúdo" aparece com o foco e leva ao <main>', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page).toHaveURL('/hoje');
  });

  test('no primeiro carregamento o foco não vai para o <main>', async ({ page }) => {
    await open(page, '/pessoas');
    await expect(page.getByRole('main')).not.toBeFocused();
  });

  test('busca com Ctrl+K: setas, Enter e Esc', async ({ page }) => {
    await open(page);

    // Esc fecha e devolve o foco para quem abriu.
    const searchButton = page.getByRole('button', { name: 'Buscar' });
    await searchButton.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: SEARCH_LABEL });
    const combobox = dialog.getByRole('combobox', { name: SEARCH_LABEL });
    await expect(combobox).toBeFocused();
    // Com o diálogo modal aberto, o resto da página sai da árvore de acessibilidade.
    await expect(page.getByRole('button', { name: 'Buscar', includeHidden: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(searchButton).toBeFocused();

    // Sem texto, a lista mostra as páginas. As setas mudam a opção ativa.
    await page.keyboard.press('Control+k');
    await expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'page-hoje');
    await page.keyboard.press('ArrowDown');
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'page-aprovacoes');
    await page.keyboard.press('ArrowUp');
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'page-hoje');

    // Encontra colaboradores, grupos e regras, sem acento e sem maiúscula.
    await page.keyboard.type('joao');
    await expect(dialog.getByRole('option', { name: /João Pedro Antunes/ })).toBeVisible();
    await combobox.fill('ti');
    await expect(dialog.getByRole('group', { name: 'Grupos' })).toContainText('TI');
    await combobox.fill('noturna');
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'schedule-regra-noturna');
    await expect(dialog.getByRole('status')).toHaveText('1 resultado');

    // Enter abre o resultado ativo; o foco vai para o <main>.
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL('/regras?regra=regra-noturna');
    await expect(page.getByRole('main')).toBeFocused();

    // Nada encontrado vira texto, para todos.
    await page.keyboard.press('Control+k');
    await combobox.fill('xyzw');
    await expect(dialog.getByRole('status')).toHaveText('Nada encontrado para “xyzw”.');
    await expect(dialog).toContainText('Tente outro nome, grupo ou regra.');
  });

  test('digitando antes de os dados chegarem, Enter abre o primeiro resultado', async ({
    page,
  }) => {
    // ?simular=lento: a API demora de 3 a 5 s. A pessoa digita antes de as regras chegarem.
    await page.goto('/hoje?simular=lento');
    await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: SEARCH_LABEL });
    const combobox = dialog.getByRole('combobox', { name: SEARCH_LABEL });
    // Antes, passa pelas páginas com as setas (depois disso o Listbox não escolhe sozinho).
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'page-hoje');
    await page.keyboard.press('ArrowDown');
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'page-aprovacoes');
    await combobox.fill('noturna');
    await expect(dialog).toContainText('Buscando colaboradores, grupos e regras…');

    await expect(combobox).toHaveAttribute('aria-activedescendant', 'schedule-regra-noturna', {
      timeout: 10_000,
    });
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/regras?regra=regra-noturna');
  });

  test('busca com a API fora do ar: as páginas continuam e o erro vira texto', async ({ page }) => {
    await page.goto('/hoje?simular=erro');
    // Sem resposta da API: o menu continua, sem o número de pendentes e sem o nome da pessoa.
    await expect(page.getByRole('button', { name: 'Sua conta' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aprovações', exact: true })).toBeVisible();

    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: SEARCH_LABEL });
    await expect(dialog).toContainText('Não conseguimos buscar colaboradores, grupos e regras');
    await expect(dialog.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    await dialog.getByRole('combobox').fill('pessoas');
    await expect(dialog.getByRole('option', { name: 'Pessoas' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('o tema escolhido no menu do usuário fica guardado', async ({ page }) => {
    await open(page);
    const trigger = page.getByRole('button', { name: 'Renata Albuquerque' });
    const html = page.locator('html');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitemradio', { name: 'Claro' })).toBeFocused();
    await expect(page.getByRole('menuitemradio', { name: 'Do sistema' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(trigger).toBeFocused();

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await trigger.click();
    await expect(page.getByRole('menuitemradio', { name: 'Escuro' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('menuitemradio', { name: 'Do sistema' }).click();
    await expect(html).not.toHaveAttribute('data-theme');
  });
});

test.describe('Casca no celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'A barra inferior só aparece abaixo de 1024 px');

  test('sem violações de acessibilidade, com o "Mais", o menu e a busca abertos', async ({
    page,
  }) => {
    await open(page);
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('link')).toHaveCount(2);
    await expect(nav.getByRole('button', { name: 'Mais' })).toBeVisible();
    await expectNoA11yViolations(page);

    await nav.getByRole('button', { name: 'Mais' }).click();
    await expect(page.getByRole('dialog', { name: 'Mais áreas' })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Renata Albuquerque' }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Escuro' })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByRole('combobox', { name: SEARCH_LABEL }).fill('fin');
    await expect(page.getByRole('option', { name: /Financeiro/ }).first()).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('"Mais" abre as outras áreas, só com teclado', async ({ page }) => {
    await open(page);
    const more = page.getByRole('button', { name: 'Mais' });

    // Ordem do Tab: pular para o conteúdo, marca, busca, conta e a barra inferior.
    for (const name of [
      'Pular para o conteúdo',
      'Scua Logon',
      'Buscar',
      'Renata Albuquerque',
      'Hoje',
      PENDING,
      'Mais',
    ]) {
      await page.keyboard.press('Tab');
      await expect(focused(page)).toHaveAccessibleName(name);
    }

    // Esc fecha e devolve o foco ao "Mais".
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: 'Mais áreas' });
    await expect(sheet).toBeVisible();
    // Com o diálogo modal aberto, o resto da página sai da árvore de acessibilidade.
    await expect(page.getByRole('button', { name: 'Mais', includeHidden: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(more).toBeFocused();

    // Cada área do "Mais" abre com Enter; o painel fecha e o foco vai para o <main>.
    // Do <main>, o Tab segue para a barra inferior.
    for (const area of AREAS.filter((a) => !['/hoje', '/aprovacoes'].includes(a.path))) {
      await pressUntilFocused(page, 'Tab', more);
      await page.keyboard.press('Enter');
      await expect(sheet).toBeVisible();
      await pressUntilFocused(page, 'Tab', sheet.getByRole('link', { name: area.name }));
      await page.keyboard.press('Enter');
      await expect(sheet).toBeHidden();
      await expectOnPage(page, area);
    }

    // Numa área do "Mais", o botão fica marcado.
    await expect(more).toHaveClass(/active/);
  });

  test('a barra inferior leva a Hoje e Aprovações', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: PENDING }).click();
    await expect(page).toHaveURL('/aprovacoes');
    await expect(page.getByRole('link', { name: PENDING })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('link', { name: 'Hoje' }).click();
    await expectOnPage(page, AREAS[0]);
  });
});
