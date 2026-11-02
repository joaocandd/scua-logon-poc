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
  // Em "Todos", o Lucas tem dois cartões (o pedido aguardando e o ped-16, já aprovado).
  await expect(card(page, 'Lucas Bittencourt').first()).toBeVisible();
}

test('mostra o contexto para decidir, sem violações de acessibilidade', async ({ page }) => {
  await openWithRequests(page);

  // ped-02: 17h → 19h30 passa de 2 h extras.
  const lucas = card(page, 'Lucas Bittencourt');
  await expect(lucas).toContainText('Até 19h30 (+2h30)');
  await expect(lucas).toContainText('Passa de 2 h extras no dia.');
  await expect(lucas).toContainText('Pede 2h30. Se aprovar, a estação libera só até 19h.');
  await expect(lucas).toContainText('Depois de você, vai para a validação do RH.');
  // ped-16: 1h30 aprovada na jornada anterior.
  await expect(lucas).toContainText('1h30 de hora extra nos últimos 30 dias');
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

test('recusar e desfazer só com o teclado', async ({ page }) => {
  await openWithRequests(page);
  const jessica = card(page, 'Jéssica Moura');
  const reject = jessica.getByRole('button', { name: 'Recusar o pedido de Jéssica Moura' });
  await reject.focus();

  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Recusar o pedido de Jéssica Moura?' });
  await expect(dialog.getByLabel('Motivo da recusa')).toBeFocused();
  await page.keyboard.type('Fila coberta pelo turno da noite');
  await page.keyboard.press('Tab'); // Cancelar
  await page.keyboard.press('Tab'); // Recusar pedido
  await expect(dialog.getByRole('button', { name: 'Recusar pedido' })).toBeFocused();
  await page.keyboard.press('Enter');

  const undo = jessica.getByRole('button', { name: 'Desfazer a decisão sobre Jéssica Moura' });
  await expect(undo).toBeFocused();
  await expect(jessica).toContainText('Motivo: Fila coberta pelo turno da noite');
  await page.keyboard.press('Enter');

  await expect(
    jessica.getByRole('button', { name: 'Aprovar o pedido de Jéssica Moura' }),
  ).toBeFocused();
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

test('decisão sua de outra visita também tem "Desfazer"', async ({ page }) => {
  await openWithRequests(page, '/aprovacoes?filtro=todos');
  // ped-15: a usuária simulada aprovou o pedido da Tatiane antes de abrir a página.
  const tatiane = card(page, 'Tatiane Brito');
  await expect(tatiane).toContainText(/Aprovado por você às/);

  await tatiane.getByRole('button', { name: 'Desfazer a decisão sobre Tatiane Brito' }).click();

  await expect(
    tatiane.getByRole('button', { name: 'Aprovar o pedido de Tatiane Brito' }),
  ).toBeFocused();
});

test('filtro por grupo fica na URL', async ({ page }) => {
  await openWithRequests(page);

  await page.getByLabel('Grupo').selectOption({ label: 'Financeiro' });

  await expect(page).toHaveURL(/grupo=grp-financeiro/);
  await expect(card(page, 'Larissa Fontes')).toBeVisible();
  await expect(card(page, 'Lucas Bittencourt')).toHaveCount(0);
});

test.describe('aprovar em lote', () => {
  const checkbox = (page: Page, name: string) =>
    page.getByRole('checkbox', { name: `Selecionar o pedido de ${name}` });

  test('confirma quantos e quais, aprova e desfaz pelo aviso', async ({ page }) => {
    await openWithRequests(page);
    await checkbox(page, 'Jéssica Moura').check();
    await checkbox(page, 'Mateus Farias').check();

    const bar = page.getByRole('region', { name: 'Pedidos selecionados' });
    await expect(bar).toContainText('2 pedidos selecionados');
    await bar.getByRole('button', { name: 'Aprovar selecionados' }).click();

    const dialog = page.getByRole('alertdialog', { name: 'Aprovar 2 pedidos?' });
    await expect(dialog.getByRole('listitem')).toHaveText([
      'Jéssica Moura: até 23h (+1h)',
      'Mateus Farias: até 23h30 (+1h30) · Quebra o descanso de 11 h entre jornadas',
    ]);
    await expect(dialog).toContainText('Confira os alertas antes de aprovar.');
    await expectNoA11yViolations(page);
    await dialog.getByRole('button', { name: 'Aprovar 2 pedidos' }).click();

    await expect(card(page, 'Jéssica Moura')).toContainText(/Aprovado às/);
    await expect(card(page, 'Mateus Farias')).toContainText(/Aprovado às/);
    await expect(bar).toBeHidden();
    await expect(toast(page)).toContainText('2 pedidos aprovados.');
    await expect(
      page.getByRole('button', { name: 'Desfazer a decisão sobre Jéssica Moura' }),
    ).toBeFocused();

    await toast(page).getByRole('button', { name: 'Desfazer' }).click();

    await expect(toast(page)).toContainText(
      'Decisões desfeitas. Os 2 pedidos voltaram a aguardar.',
    );
    await expect(card(page, 'Jéssica Moura')).not.toContainText('Aprovado às');
    await expect(card(page, 'Mateus Farias')).not.toContainText('Aprovado às');
  });

  test('cancelar a confirmação não aprova nada', async ({ page }) => {
    await openWithRequests(page);
    await checkbox(page, 'Jéssica Moura').check();
    await checkbox(page, 'Lucas Bittencourt').check();
    await page.getByRole('button', { name: 'Aprovar selecionados' }).click();

    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(card(page, 'Jéssica Moura')).not.toContainText('Aprovado');
    await expect(page.getByRole('region', { name: 'Pedidos selecionados' })).toContainText(
      '2 pedidos selecionados',
    );
  });

  test('"Selecionar todos" e "Limpar"', async ({ page }) => {
    await openWithRequests(page);
    const all = page.getByRole('checkbox', { name: /^Selecionar todos \(\d+\)$/ });

    await all.check();
    await expect(checkbox(page, 'Lucas Bittencourt')).toBeChecked();
    const bar = page.getByRole('region', { name: 'Pedidos selecionados' });
    await expect(bar).toContainText(/\d+ pedidos selecionados/);
    await expectNoA11yViolations(page);

    await bar.getByRole('button', { name: 'Limpar' }).click();

    await expect(bar).toBeHidden();
    await expect(all).not.toBeChecked();
    await expect(all).toBeFocused();
  });
});

test('no celular, o aviso fica acima da barra inferior', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'A barra inferior só aparece abaixo de 1024 px');
  await openWithRequests(page);
  await card(page, 'Jéssica Moura')
    .getByRole('button', { name: 'Aprovar o pedido de Jéssica Moura' })
    .click();
  await expect(toast(page)).toBeVisible();

  const toastBox = await toast(page).locator('section').boundingBox();
  const navBox = await page.getByRole('navigation', { name: 'Principal' }).boundingBox();
  expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(navBox!.y);
});

test.describe('ao vivo', () => {
  test('?demo=ao-vivo: pedido novo a cada 30 s, marcado e anunciado com discrição', async ({
    page,
  }) => {
    // Relógio falso: o tempo corre normalmente, e o teste pode pular 30 s de uma vez.
    await page.clock.install();
    await openWithRequests(page, '/aprovacoes?demo=ao-vivo');
    await expect(page.getByText(/Atualizado (agora|há \d+ s)/)).toBeVisible();
    await expect(card(page, 'Felipe Guimarães')).toHaveCount(0);

    await page.clock.fastForward('00:31');

    const felipe = card(page, 'Felipe Guimarães');
    await expect(felipe).toBeVisible();
    await expect(felipe).toContainText('Novo');
    await expect(page.getByRole('status').filter({ hasText: 'Novo pedido' })).toHaveText(
      'Novo pedido de Felipe Guimarães, até 18h.',
    );
    await expect(page.getByText('Atualizado agora')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Aprovações 9 pendentes$/ })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('sem ?demo=ao-vivo, nenhum pedido novo chega', async ({ page }) => {
    await page.clock.install();
    await openWithRequests(page);

    await page.clock.fastForward('01:01');

    await expect(page.getByText(/Atualizado (agora|há \d+ s)/)).toBeVisible();
    await expect(card(page, 'Felipe Guimarães')).toHaveCount(0);
  });
});

test.describe('detalhe do pedido', () => {
  test('linha do tempo, histórico e as mesmas ações; ao fechar, o foco volta ao cartão', async ({
    page,
    isMobile,
  }) => {
    await openWithRequests(page);
    const detailsLink = page.getByRole('link', {
      name: 'Ver detalhes do pedido de Lucas Bittencourt',
    });
    await detailsLink.click();

    await expect(page).toHaveURL(/\/aprovacoes\/ped-02$/);
    await expect(page).toHaveTitle('Pedido de extensão · Scua Logon');
    const detail = page.getByRole('region', { name: 'Detalhe do pedido' });
    await expect(
      detail.getByRole('heading', { level: 2, name: 'Lucas Bittencourt' }),
    ).toBeFocused();
    // Celular: o detalhe ocupa a página. Desktop: painel ao lado da lista.
    if (isMobile) await expect(detailsLink).toBeHidden();
    else await expect(detailsLink).toBeVisible();

    await expect(
      detail.getByRole('group', { name: /^Jornada de Lucas Bittencourt, / }),
    ).toBeVisible();
    await expect(detail).toContainText(
      'Se aprovar, a estação bloqueia às 19h, no limite de 2 h extras.',
    );
    await expect(detail).toContainText('Se recusar, bloqueia às 17h, no fim da jornada.');
    const history = detail.getByRole('region', { name: 'Histórico' });
    await expect(history).toContainText(
      'Lucas Bittencourt pediu extensão até 19h30 (Entrega de proposta comercial).',
    );
    await expectNoA11yViolations(page);

    await detail.getByRole('button', { name: 'Aprovar o pedido de Lucas Bittencourt' }).click();

    await expect(detail).toContainText(/Aprovado às/);
    await expect(
      detail.getByRole('button', { name: 'Desfazer a decisão sobre Lucas Bittencourt' }),
    ).toBeFocused();
    await expect(history).toContainText(
      'Renata Albuquerque aprovou o pedido de Lucas Bittencourt. Falta a validação do RH.',
    );
    await expect(detail).toContainText('Se o RH validar, a estação bloqueia às 19h');

    await detail
      .getByRole('link', { name: isMobile ? 'Voltar para a lista' : 'Fechar o detalhe' })
      .click();
    await expect(page).toHaveURL(/\/aprovacoes$/);
    await expect(detailsLink).toBeFocused();
  });

  test('pedido que não existe', async ({ page }) => {
    await open(page, '/aprovacoes/ped-99');

    await expect(page.getByRole('heading', { name: 'Não encontramos este pedido' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
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
