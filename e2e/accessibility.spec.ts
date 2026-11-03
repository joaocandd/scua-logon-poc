import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './support/a11y';

// Todas as rotas, com os estados simulados (?simular=) das telas principais, sem violações do
// axe. Roda nos quatro projetos: 1280 e 390 px, nos temas claro e escuro. Os estados que só
// aparecem depois de uma ação (diálogos, erro ao enviar, pedido decidido) ficam nos testes de cada
// feature.

interface Screen {
  url: string;
  /** Título que mostra a tela pronta: o <h1> ou o título do estado (vazio, erro, sem permissão). */
  ready: string;
  /** Estado de carregamento (?simular=lento): o axe roda antes de os dados chegarem. */
  loading?: boolean;
}

const screens: Screen[] = [
  // Fora da casca do app
  { url: '/entrar', ready: 'Entrar' },
  { url: '/entrar/esqueci-minha-senha', ready: 'Esqueci minha senha' },
  { url: '/aprovacao/valido-ped-02', ready: 'Pedido de Lucas Bittencourt' },
  { url: '/aprovacao/valido-ped-04', ready: 'Pedido de Mateus Farias' },
  { url: '/aprovacao/expirado-ped-22', ready: 'Link expirado' },
  { url: '/aprovacao/usado-ped-13', ready: 'Pedido já decidido' },
  { url: '/aprovacao/qualquer-outro', ready: 'Link inválido' },
  { url: '/aprovacao/valido-ped-02?simular=erro', ready: 'Não conseguimos abrir o pedido' },
  { url: '/aprovacao/valido-ped-02?simular=lento', ready: 'Pedido de hora extra', loading: true },

  // Hoje e as áreas fora do escopo da PoC (a casca muda com a API fora do ar ou lenta)
  { url: '/hoje', ready: 'Hoje' },
  { url: '/hoje?simular=erro', ready: 'Hoje' },
  { url: '/hoje?simular=vazio', ready: 'Hoje' },
  { url: '/hoje?simular=lento', ready: 'Hoje', loading: true },
  { url: '/pessoas', ready: 'Pessoas' },
  { url: '/relatorios', ready: 'Relatórios' },
  { url: '/configuracoes', ready: 'Configurações' },
  { url: '/endereco-que-nao-existe', ready: 'Página não encontrada' },

  // Fluxo A: caixa de aprovações
  { url: '/aprovacoes', ready: 'Aprovações' },
  { url: '/aprovacoes?filtro=decididos-hoje', ready: 'Aprovações' },
  { url: '/aprovacoes?simular=erro', ready: 'Não conseguimos carregar os pedidos' },
  { url: '/aprovacoes?simular=vazio', ready: 'Nenhum pedido aguardando' },
  { url: '/aprovacoes?simular=lento', ready: 'Aprovações', loading: true },
  { url: '/aprovacoes?simular=sem-permissao', ready: 'Você não tem acesso às aprovações' },
  { url: '/aprovacoes/ped-02', ready: 'Lucas Bittencourt' },
  { url: '/aprovacoes/ped-02?simular=erro', ready: 'Não conseguimos carregar os pedidos' },
  { url: '/aprovacoes/ped-02?simular=lento', ready: 'Aprovações', loading: true },
  { url: '/aprovacoes/nao-existe', ready: 'Não encontramos este pedido' },

  // Fluxo B: regras de jornada
  { url: '/regras', ready: 'Regras de jornada' },
  { url: '/regras?simular=erro', ready: 'Não conseguimos carregar as regras' },
  { url: '/regras?simular=vazio', ready: 'Nenhuma regra de jornada' },
  { url: '/regras?simular=lento', ready: 'Regras de jornada', loading: true },
  { url: '/regras?simular=sem-permissao', ready: 'Você não tem acesso às regras de jornada' },
  { url: '/regras/regra-comercial', ready: 'Comercial' },
  { url: '/regras/regra-noturna', ready: 'Noturna' },
  { url: '/regras/regra-comercial?simular=erro', ready: 'Não conseguimos carregar a regra' },
  { url: '/regras/regra-comercial?simular=vazio', ready: 'Regra não encontrada' },
  { url: '/regras/regra-comercial?simular=lento', ready: 'Regra de jornada', loading: true },
  {
    url: '/regras/regra-comercial?simular=sem-permissao',
    ready: 'Você não tem acesso às regras de jornada',
  },
  { url: '/regras/nova', ready: 'Nova regra' },
  { url: '/regras/nao-existe', ready: 'Regra não encontrada' },
];

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
