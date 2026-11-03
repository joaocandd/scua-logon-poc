import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Painel "Hoje" (/hoje) em 1280 px, 390 px e no tema escuro. Os dados de demonstração são
// relativos a "agora", e a hora decide o estado de cada estação. O relógio fica numa terça-feira
// às 18h20 em São Paulo: o Comercial já saiu (bloqueada), a Flexível está na jornada, a Tarde,
// no intervalo (18h às 19h), e a Noturna, em observação, deixa a estação liberada fora da jornada.
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
const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

test('no topo, os pedidos aguardando e os alertas', async ({ page }) => {
  await openPanel(page);

  const pending = region(page, 'Pedidos aguardando');
  await expect(pending).toContainText('8 pedidos aguardando aprovação');
  await expect(pending).toContainText('O próximo é de Vinícius Amaral. Expira em 2h40.');
  await expect(pending).toContainText('4 aguardando a validação do RH.');
  await expect(pending.getByRole('link', { name: 'Abrir aprovações' })).toHaveAttribute(
    'href',
    '/aprovacoes',
  );

  const alerts = region(page, 'Alertas');
  await expect(alerts.getByRole('listitem')).toHaveCount(2);
  await expect(alerts.getByRole('listitem').first()).toContainText(
    /6 estações liberadas sem aprovação\s*A regra Noturna está em observação até [^,]+, \d{2}\/\d{2}: ela bloquearia estas estações agora, mas não bloqueia\./,
  );
  await expect(alerts).toContainText(
    'A estação de Renata Albuquerque não é bloqueada em nenhum horário.',
  );
  await expectNoA11yViolations(page);
});

test('os contadores mostram o estado das estações agora', async ({ page }) => {
  await openPanel(page);

  await expect(counter(page, 'Em jornada')).toHaveAccessibleName('9 Em jornada');
  await expect(counter(page, 'Em intervalo')).toHaveAccessibleName('9 Em intervalo');
  await expect(counter(page, 'Hora extra aprovada')).toHaveAccessibleName('0 Hora extra aprovada');
  // Comercial e Financeiro. A Noturna, em observação, não bloqueia: vai para o alerta.
  await expect(counter(page, 'Bloqueada')).toHaveAccessibleName('15 Bloqueada');
  await expect(counter(page, 'Fora do expediente')).toHaveAccessibleName('0 Fora do expediente');
  await expect(page.getByText(/Atualizado (agora|há \d+ s)/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test('o alerta abre a lista das estações liberadas sem aprovação', async ({ page }) => {
  await openPanel(page);
  await region(page, 'Alertas').getByRole('link', { name: 'Ver estações' }).click();

  await expect(page).toHaveURL('/hoje?estado=sem_aprovacao');
  await expect(
    page.getByRole('heading', { level: 3, name: 'Liberada sem aprovação · 6' }),
  ).toBeVisible();
  const edson = list(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Edson Pires' }) });
  await expect(edson).toContainText('Em observação');
  await expect(edson).toContainText(
    'Liberada sem aprovação. Pela regra em observação, estaria bloqueada: fora da jornada Noturna (das 22h às 6h).',
  );
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Fechar lista' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Estações agora' })).toBeFocused();
});

test('pedido que vence na próxima hora vira alerta', async ({ page }) => {
  await openPanel(page);
  // Os dados de demonstração nascem na primeira chamada à API: só avança depois que chegaram.
  await expect(region(page, 'Pedidos aguardando')).toContainText('8 pedidos aguardando');
  // 20h05: o pedido do Vinícius vence às 21h.
  await page.clock.fastForward('01:45:00');

  const alerts = region(page, 'Alertas');
  await expect(alerts).toContainText('1 pedido vence na próxima hora');
  await expect(alerts).toContainText('Vinícius Amaral às 21h.');
  await expect(alerts.getByRole('link', { name: 'Abrir aprovações' })).toBeVisible();
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
  const pending = region(page, 'Pedidos aguardando');
  await expect(pending).toContainText('2 pedidos aguardando aprovação');
  await expect(pending.getByRole('link', { name: 'Abrir aprovações' })).toHaveAttribute(
    'href',
    '/aprovacoes?grupo=grp-comercial',
  );
  await expect(region(page, 'Alertas')).toContainText('Nenhum alerta agora.');
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
  await expect(region(page, 'Pedidos aguardando')).toContainText(
    'Nenhum pedido aguardando aprovação.',
  );
  await expect(region(page, 'Alertas')).toContainText('Nenhum alerta agora.');
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
