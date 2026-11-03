import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectFocusTrapped, expectTabReachesEverything } from './support/keyboard';

// Todas as telas só com o teclado, em 1280 e 390 px: o Tab alcança tudo, na ordem do HTML, com
// o anel de foco e sem o foco ficar embaixo das barras fixas. Os diálogos prendem o foco e o
// devolvem para quem os abriu. Os fluxos completos com teclado ficam nos testes de cada feature.

test.skip(
  ({ colorScheme }) => colorScheme === 'dark',
  'O teclado não muda com o tema; o contraste do anel de foco é conferido pelo npm run contrast',
);

interface Screen {
  url: string;
  /** Algo que só aparece com a tela pronta, depois de os dados chegarem. */
  ready: (page: Page) => Locator;
}

const heading = (name: string) => (page: Page) =>
  page.getByRole('heading', { name, exact: true }).first();
const button = (name: string) => (page: Page) => page.getByRole('button', { name, exact: true });

const screens: Screen[] = [
  { url: '/entrar', ready: button('Entrar com conta corporativa') },
  { url: '/entrar/esqueci-minha-senha', ready: heading('Esqueci minha senha') },
  { url: '/aprovacao/valido-ped-02', ready: button('Aprovar o pedido de Lucas Bittencourt') },
  { url: '/aprovacao/expirado-ped-22', ready: heading('Link expirado') },
  { url: '/aprovacao/valido-ped-02?simular=erro', ready: button('Tentar de novo') },
  { url: '/hoje', ready: button('Renata Albuquerque') },
  { url: '/pessoas', ready: button('Renata Albuquerque') },
  { url: '/relatorios', ready: button('Renata Albuquerque') },
  { url: '/configuracoes', ready: button('Renata Albuquerque') },
  { url: '/endereco-que-nao-existe', ready: button('Renata Albuquerque') },
  { url: '/aprovacoes', ready: button('Aprovar o pedido de Lucas Bittencourt') },
  { url: '/aprovacoes/ped-02', ready: (page) => page.locator('#detalhe-titulo') },
  { url: '/aprovacoes?simular=vazio', ready: heading('Nenhum pedido aguardando') },
  { url: '/aprovacoes?simular=erro', ready: button('Tentar de novo') },
  { url: '/regras', ready: (page) => page.getByRole('link', { name: 'Comercial', exact: true }) },
  {
    url: '/regras?simular=sem-permissao',
    ready: heading('Você não tem acesso às regras de jornada'),
  },
  { url: '/regras/regra-comercial', ready: heading('Comercial') },
  { url: '/regras/nova', ready: heading('Nova regra') },
];

for (const { url, ready } of screens) {
  test(`${url}: o Tab alcança tudo, na ordem, com o foco visível`, async ({ page }) => {
    await page.goto(url);
    await expect(ready(page)).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

    await expectTabReachesEverything(page);
  });
}

interface DialogCase {
  name: string;
  url: string;
  /** Só no celular (o "Mais" da barra inferior). */
  mobileOnly?: boolean;
  /** O que fazer antes de abrir, como mudar um campo para haver o que salvar. */
  prepare?: (page: Page) => Promise<void>;
  trigger: (page: Page) => Locator;
  dialog: (page: Page) => Locator;
}

const dialogs: DialogCase[] = [
  {
    name: 'busca',
    url: '/hoje',
    trigger: button('Buscar'),
    dialog: (page) =>
      page.getByRole('dialog', { name: 'Buscar páginas, colaboradores, grupos e regras' }),
  },
  {
    name: '"Mais" da barra inferior',
    url: '/hoje',
    mobileOnly: true,
    trigger: button('Mais'),
    dialog: (page) => page.getByRole('dialog', { name: 'Mais áreas' }),
  },
  {
    name: 'recusar um pedido',
    url: '/aprovacoes',
    trigger: button('Recusar o pedido de Jéssica Moura'),
    dialog: (page) => page.getByRole('dialog', { name: 'Recusar o pedido de Jéssica Moura?' }),
  },
  {
    name: 'aprovar em lote',
    url: '/aprovacoes',
    prepare: async (page) => {
      await page.getByRole('checkbox', { name: 'Selecionar o pedido de Jéssica Moura' }).check();
      await page.getByRole('checkbox', { name: 'Selecionar o pedido de Mateus Farias' }).check();
    },
    trigger: button('Aprovar selecionados'),
    dialog: (page) => page.getByRole('alertdialog', { name: 'Aprovar 2 pedidos?' }),
  },
  {
    name: 'recusar pelo link do e-mail',
    url: '/aprovacao/valido-ped-04',
    trigger: button('Recusar o pedido de Mateus Farias'),
    dialog: (page) => page.getByRole('dialog', { name: 'Recusar o pedido de Mateus Farias?' }),
  },
  {
    name: 'salvar regra',
    url: '/regras/regra-comercial',
    prepare: (page) => page.getByLabel('Fim da jornada').fill('18:00'),
    trigger: button('Salvar regra'),
    dialog: (page) => page.getByRole('alertdialog', { name: 'Salvar a regra Comercial?' }),
  },
  {
    name: 'sair sem salvar',
    url: '/regras/regra-tarde',
    prepare: (page) => page.getByLabel('Fim da jornada').fill('21:00'),
    trigger: (page) => page.getByRole('main').getByRole('link', { name: 'Regras de jornada' }),
    dialog: (page) => page.getByRole('alertdialog', { name: 'Sair sem salvar?' }),
  },
];

for (const { name, url, mobileOnly, prepare, trigger, dialog } of dialogs) {
  test(`diálogo "${name}": prende o foco e o devolve ao fechar`, async ({ page, isMobile }) => {
    test.skip(!!mobileOnly && !isMobile, 'Só existe no celular');
    await page.goto(url);
    await prepare?.(page);
    await expect(trigger(page)).toBeVisible();

    // Abre com o teclado: o foco entra no diálogo.
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await expect
      .poll(() => dialog(page).evaluate((root) => root.contains(document.activeElement)))
      .toBe(true);

    await expectFocusTrapped(page, dialog(page));

    // Esc fecha sem fazer nada e o foco volta para quem abriu.
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
}
