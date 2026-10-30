import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Caixa de aprovações (fluxo A, /aprovacoes) em 1280 px, 390 px e no tema escuro. Cada teste abre
// a página do zero: a API simulada começa com os dados de demonstração.

/** Cartão do pedido, pelo nome do colaborador (o título do cartão). */
const card = (page: Page, name: string) => page.getByRole('article', { name });

/** O aviso no rodapé. O mesmo texto também vai para a região viva do leitor de tela. */
const toast = (page: Page) => page.locator('app-toast-panel');

async function open(page: Page, url = '/aprovacoes'): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Aprovações' })).toBeVisible();
}

async function openWithRequests(page: Page, url = '/aprovacoes'): Promise<void> {
  await open(page, url);
  await expect(card(page, 'Lucas Bittencourt')).toBeVisible();
}

test('mostra o contexto para decidir, sem violações de acessibilidade', async ({ page }) => {
  await openWithRequests(page);

  // ped-02: 17h → 19h30 passa de 2 h extras.
  const lucas = card(page, 'Lucas Bittencourt');
  await expect(lucas).toContainText('Até 19h30 (+2h30)');
  await expect(lucas).toContainText('Passa de 2 h extras no dia.');
  await expect(lucas).toContainText('Pede 2h30. Se aprovar, a estação libera só até 19h.');
  await expect(lucas).toContainText('Depois de você, vai para a validação do RH.');
  await expect(lucas).toContainText(/Expira /);

  // ped-04: sai às 23h30 e entra às 10h do dia seguinte.
  const mateus = card(page, 'Mateus Farias');
  await expect(mateus).toContainText('Quebra o descanso de 11 h entre jornadas.');
  await expect(mateus).toContainText(
    'No dia seguinte, a estação só libera às 10h30, e não às 10h.',
  );
  await expect(mateus).toContainText('Sem validação do RH: a sua aprovação libera a estação.');

  await expectNoA11yViolations(page);
});

test('aprova com um toque: o cartão mostra o resultado e o foco vai para "Desfazer"', async ({
  page,
}) => {
  await openWithRequests(page);
  const jessica = card(page, 'Jéssica Moura');

  await jessica.getByRole('button', { name: 'Aprovar o pedido de Jéssica Moura' }).click();

  await expect(jessica).toContainText(/Aprovado às \d{1,2}h(\d{2})?/);
  await expect(
    jessica.getByRole('button', { name: 'Desfazer a decisão sobre Jéssica Moura' }),
  ).toBeFocused();
  await expect(toast(page)).toContainText('Pedido de Jéssica Moura aprovado.');
  await expectNoA11yViolations(page);

  // O pedido decidido continua na tela, e aparece em "Decididos hoje".
  await page.getByText('Decididos hoje').click();
  await expect(page).toHaveURL(/filtro=decididos-hoje/);
  await expect(card(page, 'Jéssica Moura')).toContainText(/Aprovado às/);
});

test('desfazer no cartão volta o pedido para aguardar e o foco para "Aprovar"', async ({
  page,
}) => {
  await openWithRequests(page);
  const jessica = card(page, 'Jéssica Moura');
  await jessica.getByRole('button', { name: 'Aprovar o pedido de Jéssica Moura' }).click();
  const undo = jessica.getByRole('button', { name: 'Desfazer a decisão sobre Jéssica Moura' });
  await expect(undo).toBeFocused();

  await page.keyboard.press('Enter');

  const approve = jessica.getByRole('button', { name: 'Aprovar o pedido de Jéssica Moura' });
  await expect(approve).toBeFocused();
  await expect(jessica).not.toContainText('Aprovado às');
  await expect(toast(page)).toContainText(
    'Decisão desfeita. O pedido de Jéssica Moura voltou a aguardar.',
  );
});

test('desfazer pelo aviso também volta o pedido', async ({ page }) => {
  await openWithRequests(page);
  const lucas = card(page, 'Lucas Bittencourt');
  await lucas.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }).click();
  await expect(toast(page)).toContainText(
    'Pedido de Lucas Bittencourt aprovado. Agora vai para a validação do RH.',
  );
  await expect(lucas).toContainText('Falta a validação do RH.');

  await toast(page).getByRole('button', { name: 'Desfazer' }).click();

  await expect(
    lucas.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }),
  ).toBeVisible();
  await expect(lucas).not.toContainText('Aprovado às');
});

test('recusar pede o motivo e o cartão mostra a recusa', async ({ page }) => {
  await openWithRequests(page);
  const lucas = card(page, 'Lucas Bittencourt');
  await lucas.getByRole('button', { name: 'Recusar o pedido de Lucas Bittencourt' }).click();

  const dialog = page.getByRole('dialog', { name: 'Recusar o pedido de Lucas Bittencourt?' });
  const reason = dialog.getByLabel('Motivo da recusa');
  await expect(reason).toBeFocused();
  await expect(dialog).toContainText('Até 19h30 (+2h30) · Entrega de proposta comercial');

  // Sem motivo: erro no campo e o foco continua nele.
  await dialog.getByRole('button', { name: 'Recusar pedido' }).click();
  await expect(dialog.getByText('Escreva o motivo da recusa.')).toBeVisible();
  await expect(reason).toHaveAttribute('aria-invalid', 'true');
  await expect(reason).toBeFocused();
  await expectNoA11yViolations(page);

  await reason.fill('A proposta pode ser entregue amanhã de manhã');
  await dialog.getByRole('button', { name: 'Recusar pedido' }).click();

  await expect(dialog).toBeHidden();
  await expect(lucas).toContainText(/Recusado às/);
  await expect(lucas).toContainText('Motivo: A proposta pode ser entregue amanhã de manhã');
  await expect(
    lucas.getByRole('button', { name: 'Desfazer a decisão sobre Lucas Bittencourt' }),
  ).toBeFocused();
  await expect(toast(page)).toContainText('Pedido de Lucas Bittencourt recusado.');
});

test('Esc fecha o diálogo de recusa sem recusar', async ({ page }) => {
  await openWithRequests(page);
  const lucas = card(page, 'Lucas Bittencourt');
  const reject = lucas.getByRole('button', { name: 'Recusar o pedido de Lucas Bittencourt' });
  await reject.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(reject).toBeFocused();
  await expect(lucas).not.toContainText('Recusado');
});

test('filtro por grupo fica na URL', async ({ page }) => {
  await openWithRequests(page);

  await page.getByLabel('Grupo').selectOption({ label: 'Financeiro' });

  await expect(page).toHaveURL(/grupo=grp-financeiro/);
  await expect(card(page, 'Larissa Fontes')).toBeVisible();
  await expect(card(page, 'Lucas Bittencourt')).toHaveCount(0);
});

test.describe('estados da tela', () => {
  test('?simular=vazio: nenhum pedido aguardando', async ({ page }) => {
    await open(page, '/aprovacoes?simular=vazio');

    await expect(page.getByRole('heading', { name: 'Nenhum pedido aguardando' })).toBeVisible();
    await expect(
      page.getByText('Pedidos de extensão aparecem aqui assim que alguém solicitar.'),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('?simular=erro: mensagem humana e "Tentar de novo"', async ({ page }) => {
    await open(page, '/aprovacoes?simular=erro');

    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os pedidos');
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('?simular=sem-permissao: explica quem tem acesso', async ({ page }) => {
    await open(page, '/aprovacoes?simular=sem-permissao');

    await expect(
      page.getByRole('heading', { name: 'Você não tem acesso às aprovações' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprovar' })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test('?simular=decidido: o cartão diz quem decidiu antes e quando', async ({ page }) => {
    await openWithRequests(page, '/aprovacoes?simular=decidido');
    const lucas = card(page, 'Lucas Bittencourt');

    await lucas.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }).click();

    await expect(lucas).toContainText(/Aprovado por Marina às \d{1,2}h(\d{2})?/);
    await expect(lucas).toContainText('Falta a validação do RH.');
    await expect(lucas.getByRole('button')).toHaveCount(0);
    await expect(toast(page)).toContainText(/Este pedido já foi aprovado por Marina às /);
    await expect(page.locator('#resultado-ped-02')).toBeFocused();
    await expectNoA11yViolations(page);
  });
});
