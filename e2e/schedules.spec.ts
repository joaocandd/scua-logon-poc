import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Regras de jornada (fluxo B, /regras) em 1280 px, 390 px e no tema escuro. Cada teste abre a
// página do zero: a API simulada começa com os dados de demonstração.

/** Linha da regra na tabela, pelo nome (o cabeçalho da linha). */
const row = (page: Page, name: string) =>
  page.getByRole('row').filter({ has: page.getByRole('rowheader', { name, exact: true }) });

/** Caixa do dia da semana no editor ("Seg", "Ter"...). */
const day = (page: Page, name: string) => page.getByRole('checkbox', { name, exact: true });

/** O aviso no rodapé. */
const toast = (page: Page) => page.locator('app-toast-panel');

/** "Salvar regra" e confirma o impacto no diálogo, com o botão que ele mostrar. */
async function saveRule(page: Page, confirmLabel = 'Salvar regra'): Promise<void> {
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: confirmLabel }).click();
}

async function openList(page: Page, url = '/regras'): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: 'Regras de jornada' })).toBeVisible();
}

test('lista as regras com horário, grupos, colaboradores e status', async ({ page }) => {
  await openList(page);

  const comercial = row(page, 'Comercial');
  await expect(comercial).toContainText('Das 8h às 17h');
  await expect(comercial).toContainText('Seg a sex');
  await expect(comercial).toContainText('Comercial, Financeiro');
  await expect(comercial.getByRole('cell').nth(2)).toHaveText(/15/);
  await expect(comercial).toContainText('Ativa');

  // Noturna: atravessa a meia-noite e deixa a diretora de fora.
  const noturna = row(page, 'Noturna');
  await expect(noturna).toContainText('Das 22h às 6h');
  await expect(noturna.getByRole('cell').nth(2)).toHaveText(/6/);

  await expectNoA11yViolations(page);
});

test('sem regras, explica o que acontece', async ({ page }) => {
  await openList(page, '/regras?simular=vazio');
  await expect(page.getByRole('heading', { name: 'Nenhuma regra de jornada' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('sem permissão, diz a quem pedir acesso', async ({ page }) => {
  await openList(page, '/regras?simular=sem-permissao');
  await expect(
    page.getByRole('heading', { name: 'Você não tem acesso às regras de jornada' }),
  ).toBeVisible();
  await expect(page.getByText('peça acesso ao administrador do Scua Logon.')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('o nome da regra leva ao editor', async ({ page }) => {
  await openList(page);
  await row(page, 'Noturna').getByRole('link', { name: 'Noturna' }).click();

  await expect(page).toHaveURL('/regras/regra-noturna');
  await expect(page).toHaveTitle('Regra de jornada · Scua Logon');
  await expect(page.getByRole('heading', { level: 1, name: 'Noturna' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nome da regra' })).toHaveValue('Noturna');
  await expect(day(page, 'Sex')).toBeChecked();
  await expect(day(page, 'Sáb')).not.toBeChecked();
  await expectNoA11yViolations(page);
});

test('cria uma regra: os erros só aparecem depois de "Salvar regra"', async ({ page }) => {
  await openList(page);
  await page.getByRole('link', { name: 'Nova regra' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nova regra' })).toBeVisible();

  // Sem nome e sem dias, mas nada de erro enquanto a pessoa preenche.
  const name = page.getByRole('textbox', { name: 'Nome da regra' });
  for (const weekday of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']) await day(page, weekday).uncheck();
  await expect(page.getByText('Dê um nome para a regra.')).toBeHidden();

  // Primeira tentativa: os dois erros aparecem e o foco vai para o nome.
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await expect(page.getByText('Dê um nome para a regra.')).toBeVisible();
  await expect(page.getByText('Escolha ao menos um dia da semana.')).toBeVisible();
  await expect(name).toBeFocused();
  await expectNoA11yViolations(page);

  // Nome de outra regra, sem acento e em minúsculas.
  await name.fill('flexivel');
  await expect(
    page.getByText('Já existe uma regra chamada Flexível. Escolha outro nome.'),
  ).toBeVisible();

  await name.fill('Plantão de fim de semana');
  await day(page, 'Sáb').check();
  await day(page, 'Dom').check();
  await saveRule(page, 'Criar regra');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Plantão de fim de semana' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/regras\/regra-[\w-]+$/);
  await expect(page.locator('app-toast-panel')).toContainText(
    'Regra Plantão de fim de semana criada.',
  );

  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  const created = row(page, 'Plantão de fim de semana');
  await expect(created).toContainText('Sáb e dom');
  await expect(created).toContainText('Nenhum grupo');
});

test('edita o nome de uma regra', async ({ page }) => {
  await page.goto('/regras/regra-tarde');
  const name = page.getByRole('textbox', { name: 'Nome da regra' });
  await expect(name).toHaveValue('Tarde');

  await name.fill('  Tarde e noite ');
  await saveRule(page);

  await expect(page.locator('app-toast-panel')).toContainText('Regra Tarde e noite salva.');
  await expect(page.getByRole('heading', { level: 1, name: 'Tarde e noite' })).toBeVisible();
  // O campo fica como foi salvo, sem os espaços nas pontas.
  await expect(name).toHaveValue('Tarde e noite');
});

test('horários: a linha do tempo e os problemas de regra aparecem enquanto a pessoa digita', async ({
  page,
}) => {
  await page.goto('/regras/nova');
  const hours = page.getByRole('region', { name: 'Horários' });
  const timeline = page.getByRole('group', { name: 'Linha do tempo da jornada' });
  await expect(timeline).toContainText('Liberada das 8h às 12h (Jornada)');
  await expect(timeline).toContainText('Bloqueada das 12h às 13h (Almoço)');
  await expect(hours).toContainText('9h de jornada, 1h de intervalo, 8h de trabalho.');

  // Fim antes do início, sem marcar a meia-noite: o problema aparece sem precisar salvar.
  await page.getByLabel('Fim da jornada').fill('06:00');
  await expect(hours).toContainText(
    'O fim (6h) vem antes do início (8h). Corrija o fim ou marque “Atravessa a meia-noite”.',
  );
  await expect(timeline).toBeHidden();

  // Jornada noturna: o almoço das 12h fica fora dela.
  await page.getByLabel('Início da jornada').fill('22:00');
  await page.getByRole('checkbox', { name: 'Atravessa a meia-noite' }).check();
  await expect(hours).toContainText('Almoço (12h–13h) precisa ficar dentro da jornada (22h–6h).');
  await expect(hours).toContainText(
    'Com 8h de trabalho, a jornada precisa de um intervalo de pelo menos 1 h (CLT art. 71). Adicione um intervalo.',
  );
  await expectNoA11yViolations(page);

  const first = page.getByRole('group', { name: 'Intervalo 1' });
  await first.getByLabel('Nome').fill('Pausa');
  await first.getByLabel('Início').fill('02:00');
  await first.getByLabel('Fim').fill('03:00');
  await expect(hours).not.toContainText('precisa');
  await expect(timeline).toContainText('Bloqueada das 2h às 3h (Pausa)');
  await expect(hours).toContainText('8h de jornada, 1h de intervalo, 7h de trabalho.');

  // Um intervalo novo recebe o foco; sobreposto, o problema aparece na hora.
  await page.getByRole('button', { name: 'Adicionar intervalo' }).click();
  const second = page.getByRole('group', { name: 'Intervalo 2' });
  await expect(second.getByLabel('Nome')).toBeFocused();
  await second.getByLabel('Nome').fill('Café');
  await second.getByLabel('Início').fill('02:30');
  await second.getByLabel('Fim').fill('02:45');
  await expect(hours).toContainText(
    'Café (2h30–2h45) e Pausa (2h–3h) se sobrepõem. Ajuste um dos dois.',
  );

  // Com o problema, "Salvar regra" não salva e leva o foco ao intervalo.
  await page.getByRole('textbox', { name: 'Nome da regra' }).fill('Madrugada');
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await expect(second.getByLabel('Início')).toBeFocused();

  // Remover leva o foco para "Adicionar intervalo".
  await second.getByRole('button', { name: 'Remover Café' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar intervalo' })).toBeFocused();

  await saveRule(page, 'Criar regra');
  await expect(page.locator('app-toast-panel')).toContainText('Regra Madrugada criada.');

  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  await expect(row(page, 'Madrugada')).toContainText('Das 22h às 6h');
  await row(page, 'Madrugada').getByRole('link', { name: 'Madrugada' }).click();
  await expect(page.getByRole('checkbox', { name: 'Atravessa a meia-noite' })).toBeChecked();
});

test('intervalo sem horário só vira erro depois de "Salvar regra"', async ({ page }) => {
  await page.goto('/regras/regra-comercial');
  await page.getByRole('button', { name: 'Adicionar intervalo' }).click();
  const second = page.getByRole('group', { name: 'Intervalo 2' });
  await expect(second).not.toContainText('Informe o início do intervalo.');

  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await expect(second).toContainText('Informe o início do intervalo.');
  await expect(second).toContainText('Informe o fim do intervalo.');
  await expect(second.getByLabel('Início')).toBeFocused();
  await expectNoA11yViolations(page);
});

test('avisos: a prévia mostra o aviso que o colaborador vê', async ({ page }) => {
  await page.goto('/regras/nova');
  const warnings = page.getByRole('region', { name: 'Avisos antes do bloqueio' });
  const option = (name: string) => warnings.getByRole('checkbox', { name, exact: true });
  await expect(option('15 min')).toBeChecked();
  await expect(option('5 min')).toBeChecked();
  await expect(warnings).toContainText('Sua estação bloqueia às 17h');
  await expect(warnings).toContainText('Faltam 15 min para o fim da sua jornada.');
  await expect(warnings).toContainText('Antes do intervalo Almoço (12h): às 11h45 e às 11h55.');

  await page.getByRole('textbox', { name: 'Nome da regra' }).fill('Plantão');
  await option('30 min').check();
  await expect(warnings).toContainText('Faltam 30 min para o fim da jornada Plantão.');
  await expect(warnings).toContainText(
    'Antes do fim da jornada (17h): às 16h30, às 16h45 e às 16h55.',
  );
  await expectNoA11yViolations(page);

  for (const name of ['30 min', '15 min', '5 min']) await option(name).uncheck();
  await expect(warnings).toContainText('Sem aviso: a estação bloqueia sem avisar o colaborador.');
});

test('aprovação: troca para gestor e RH e a escolha fica salva', async ({ page }) => {
  await page.goto('/regras/regra-flexivel');
  const approval = page.getByRole('group', { name: 'Quem aprova o pedido de extensão' });
  await expect(approval.getByRole('radio', { name: 'Só o gestor' })).toBeChecked();

  // Setas trocam a opção, como em todo grupo de rádios.
  await approval.getByRole('radio', { name: 'Só o gestor' }).focus();
  await page.keyboard.press('ArrowDown');
  const withHr = approval.getByRole('radio', { name: 'Gestor e validação do RH' });
  await expect(withHr).toBeChecked();
  await expect(withHr).toHaveAccessibleDescription(
    'Depois do gestor, o pedido vai para o RH. A estação só libera quando o RH validar.',
  );
  await expectNoA11yViolations(page);

  await saveRule(page);
  await expect(page.locator('app-toast-panel')).toContainText('Regra Flexível salva.');
  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  await row(page, 'Flexível').getByRole('link', { name: 'Flexível' }).click();
  await expect(page.getByRole('radio', { name: 'Gestor e validação do RH' })).toBeChecked();
});

test('a quem se aplica: prévia, conflito com outra regra e quem fica de fora', async ({ page }) => {
  await page.goto('/regras/regra-noturna');
  const section = page.getByRole('region', { name: 'A quem se aplica' });
  const group = (name: string) => section.getByRole('checkbox', { name, exact: true });
  await expect(group('Operações')).toBeChecked();
  await expect(group('TI')).toHaveAccessibleDescription('5 colaboradores · hoje na regra Flexível');
  await expect(section).toContainText('Esta regra vai valer para 6 colaboradores de 1 grupo.');
  await expect(section).toContainText('Fora desta regra: Renata Albuquerque.');

  // TI já está na Flexível: o conflito aparece na hora, dizendo quem e qual regra.
  await group('TI').check();
  await expect(section).toContainText('Esta regra vai valer para 11 colaboradores de 2 grupos.');
  await expect(section).toContainText(
    'André Seixas, Letícia Barros, Natália Coelho e mais 2 colaboradores já estão na regra Flexível.',
  );
  await expectNoA11yViolations(page);

  // Salvar não salva e leva o foco ao primeiro grupo marcado.
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await expect(group('Operações')).toBeFocused();

  await group('TI').uncheck();
  await expect(section).not.toContainText('já estão na regra');

  // A lista de pessoas abre e fecha; marcar a diretora põe ela na regra.
  await section.getByText('Ver os 7 colaboradores dos grupos').click();
  await section.getByRole('checkbox', { name: /^Renata Albuquerque/ }).check();
  await expect(section).toContainText('Esta regra vai valer para 7 colaboradores de 1 grupo.');
  await expect(section).not.toContainText('Fora desta regra');

  await saveRule(page);
  await expect(page.locator('app-toast-panel')).toContainText('Regra Noturna salva.');
  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  await expect(row(page, 'Noturna').getByRole('cell').nth(2)).toHaveText(/7/);
});

test('o resumo em português acompanha cada mudança', async ({ page }) => {
  await page.goto('/regras/regra-comercial');
  const summary = page.getByRole('complementary', { name: 'Resumo' });
  await expect(summary).toContainText(
    'Seg a sex, das 8h às 17h. Estação bloqueada no intervalo Almoço (12h–13h). Avisos 15 e 5 min antes. Hora extra precisa do gestor e do RH. Vale para 15 colaboradores de 2 grupos.',
  );

  await page.getByLabel('Fim da jornada').fill('18:00');
  await page.getByRole('radio', { name: 'Só o gestor' }).check();
  await expect(summary).toContainText('Seg a sex, das 8h às 18h.');
  await expect(summary).toContainText('Hora extra precisa só do gestor.');

  // Abaixo de 80em, o começo do resumo e "Salvar regra" ficam presos ao rodapé.
  if ((page.viewportSize()?.width ?? 0) < 1280) {
    const bar = page.locator('.save-bar');
    await expect(bar).toContainText('Seg a sex, das 8h às 18h.');
    await bar.getByText('Ver resumo').click();
    await expect(bar).toContainText('Hora extra precisa só do gestor.');
  }
  await expectNoA11yViolations(page);
});

test('nos próximos 30 dias: exceções de quem está na regra', async ({ page }) => {
  // As exceções das fixtures caem sempre nos próximos dias; os feriados dependem da data do teste.
  await page.goto('/regras/regra-comercial');
  const summary = page.getByRole('complementary', { name: 'Resumo' });
  const exceptions = summary.getByRole('list', { name: 'Exceções' });
  await expect(exceptions).toContainText(
    /Patrícia Lemos, \w{3}, \d{2}\/\d{2}: horário especial das 7h às 16h \(Auditoria externa\)/,
  );

  // Sem o Financeiro, a Patrícia sai da regra, e a exceção dela também.
  await page
    .getByRole('region', { name: 'A quem se aplica' })
    .getByRole('checkbox', { name: 'Financeiro', exact: true })
    .uncheck();
  await expect(summary).not.toContainText('Patrícia Lemos');
});

test('simulador "e se?": a resposta muda com a regra, antes de salvar', async ({ page }) => {
  await page.goto('/regras/regra-comercial');
  const sim = page.getByRole('region', { name: 'Simulador “e se?”' });
  // Uma quarta-feira sem feriado, exceção nem pedido de extensão nas fixtures.
  await sim.getByLabel('Colaborador').selectOption({ label: 'João Pedro Antunes' });
  await sim.getByLabel('Data').fill('2027-03-10');
  await sim.getByLabel('Hora').fill('18:10');
  await expect(sim).toContainText(
    'Às 18h10 de qua, 10/03, a estação de João estaria bloqueada: fora da jornada Comercial (das 8h às 17h).',
  );
  await expectNoA11yViolations(page);

  // Enter na hora não salva a regra.
  await sim.getByLabel('Hora').press('Enter');
  await expect(page.locator('app-toast-panel')).toBeHidden();

  // Fim da jornada às 19h: às 18h10, a estação estaria liberada.
  await page.getByLabel('Fim da jornada').fill('19:00');
  await expect(sim).toContainText(
    'Às 18h10 de qua, 10/03, a estação de João estaria liberada: jornada Comercial (das 8h às 19h).',
  );
  await sim.getByLabel('Hora').fill('12:30');
  await expect(sim).toContainText(
    'estaria bloqueada: intervalo da jornada Comercial (das 12h às 13h).',
  );
});

test('salvar mostra o impacto antes; sem mudança, não há o que salvar', async ({ page }) => {
  await page.goto('/regras/regra-comercial');
  await page.getByLabel('Fim da jornada').fill('18:00');
  const save = page.getByRole('button', { name: 'Salvar regra' });
  await save.click();

  const dialog = page.getByRole('alertdialog', { name: 'Salvar a regra Comercial?' });
  await expect(dialog).toContainText('A mudança vale para 15 colaboradores assim que você salvar.');
  await expect(dialog).toContainText('Horário: das 8h às 17h → das 8h às 18h');
  await expect(dialog).toContainText(/Agora mesmo, /);
  await expectNoA11yViolations(page);

  // "Continuar editando" não salva, e o foco volta para "Salvar regra".
  await dialog.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(dialog).toBeHidden();
  await expect(save).toBeFocused();
  await expect(toast(page)).toBeHidden();

  await saveRule(page);
  await expect(toast(page)).toContainText('Regra Comercial salva.');
  await save.click();
  await expect(toast(page)).toContainText('Nada mudou: a regra já está salva assim.');
});

test('sair com alteração não salva pede confirmação', async ({ page }) => {
  await page.goto('/regras/regra-tarde');
  const back = page.getByRole('link', { name: 'Regras de jornada' }).first();
  await page.getByLabel('Fim da jornada').fill('21:00');
  await back.click();

  const dialog = page.getByRole('alertdialog', { name: 'Sair sem salvar?' });
  await expect(dialog).toContainText('As mudanças na regra Tarde vão se perder.');
  await expectNoA11yViolations(page);
  await dialog.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(page).toHaveURL('/regras/regra-tarde');
  await expect(page.getByLabel('Fim da jornada')).toHaveValue('21:00');

  await back.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(page).toHaveURL('/regras');

  // Sem alteração, sai direto.
  await row(page, 'Tarde').getByRole('link', { name: 'Tarde' }).click();
  await expect(page.getByLabel('Fim da jornada')).toHaveValue('22:00');
  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  await expect(page).toHaveURL('/regras');
});

test('fluxo completo: cria a regra, resolve o conflito, simula e salva em observação', async ({
  page,
}) => {
  await openList(page);
  await page.getByRole('link', { name: 'Nova regra' }).click();
  await page.getByRole('textbox', { name: 'Nome da regra' }).fill('Diretoria');
  await page.getByLabel('Início da jornada').fill('09:00');
  await page.getByLabel('Fim da jornada').fill('18:00');

  // Operações já está na regra Noturna: o conflito aparece na hora, dizendo quem e qual.
  const section = page.getByRole('region', { name: 'A quem se aplica' });
  await section.getByRole('checkbox', { name: 'Operações', exact: true }).check();
  await expect(section).toContainText(
    'Carlos Teixeira, Edson Pires, Fabiana Leal e mais 3 colaboradores já estão na regra Noturna.',
  );
  await expectNoA11yViolations(page);

  // Só a diretora, que está fora da Noturna, fica nesta regra.
  await section.getByText('Ver os 7 colaboradores dos grupos').click();
  const others = ['Carlos', 'Edson', 'Fabiana', 'Márcio', 'Rogério', 'Sueli'];
  for (const name of others) {
    await section.getByRole('checkbox', { name: new RegExp(`^${name} `) }).uncheck();
  }
  await expect(section).toContainText('Esta regra vai valer para 1 colaborador de 1 grupo.');
  await expect(section).not.toContainText('já estão na regra');

  // Simulador: a diretora numa quarta-feira às 18h30.
  const sim = page.getByRole('region', { name: 'Simulador “e se?”' });
  await expect(sim.getByLabel('Colaborador')).toHaveValue('col-25');
  await sim.getByLabel('Data').fill('2027-03-10');
  await sim.getByLabel('Hora').fill('18:30');
  await expect(sim).toContainText(
    'Às 18h30 de qua, 10/03, a estação de Renata estaria bloqueada: fora da jornada Diretoria (das 9h às 18h).',
  );

  // Salvar em observação: o diálogo diz o impacto.
  await page.getByRole('checkbox', { name: 'Observar por 7 dias antes de bloquear' }).check();
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Criar a regra Diretoria?' });
  await expect(dialog).toContainText(
    'Por 7 dias, a regra não bloqueia ninguém: o Scua Logon só registra quem seria bloqueado. Depois disso, ela passa a bloquear 1 colaborador.',
  );
  await expectNoA11yViolations(page);
  await dialog.getByRole('button', { name: 'Salvar e observar' }).click();

  await expect(toast(page)).toContainText('Regra Diretoria criada.');
  await expect(page.getByRole('heading', { level: 1, name: 'Diretoria' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Resumo' })).toContainText(
    /Em observação até \w{3}, \d{2}\/\d{2}: não bloqueia ninguém\./,
  );
  await expect(page.getByRole('heading', { name: 'Quem seria bloqueado' })).toBeVisible();

  await page.getByRole('link', { name: 'Regras de jornada' }).first().click();
  await expect(row(page, 'Diretoria')).toContainText('Em observação');
  await expect(row(page, 'Diretoria')).toContainText(/até \w{3}, \d{2}\/\d{2}/);
});

test('regra que não existe explica e leva de volta à lista', async ({ page }) => {
  await page.goto('/regras/regra-que-nao-existe');
  await expect(page.getByRole('heading', { name: 'Não encontramos esta regra' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver regras de jornada' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('com a API fora do ar, oferece tentar de novo', async ({ page }) => {
  await openList(page, '/regras?simular=erro');
  await expect(
    page.getByRole('heading', { name: 'Não conseguimos carregar as regras' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  await expectNoA11yViolations(page);
});
