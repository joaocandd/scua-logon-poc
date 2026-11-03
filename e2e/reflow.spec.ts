import { expect, test, type Locator, type Page } from '@playwright/test';

// Reflow (WCAG 1.4.10) e texto ampliado (1.4.4): em 320 px de largura e com zoom de 200% num
// notebook (1280 × 800 vira 640 × 400 px de CSS), a página não rola para o lado e nada sai da
// tela. O que tem rolagem própria (como uma tabela) pode rolar dentro dela. As barras presas no
// topo e no rodapé também não podem tomar a tela: somadas, no máximo 40% da altura.

test.skip(
  ({ isMobile, colorScheme }) => isMobile || colorScheme === 'dark',
  'As larguras são fixadas aqui: um projeto basta',
);

// Terça, 14h30: a hora da execução do CI que pegou os filtros de /aprovacoes saindo da tela em
// 320 px. A causa era o layout, não a hora; a hora fixa só deixa os dados iguais em toda execução.
const TUESDAY_AFTERNOON = new Date('2026-11-03T14:30:00-03:00');

const sizes = [
  { name: '320 px', viewport: { width: 320, height: 640 }, deviceScaleFactor: 1 },
  { name: 'zoom de 200%', viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 },
];

const heading = (name: string) => (page: Page) =>
  page.getByRole('heading', { name, exact: true }).first();

const screens: { url: string; ready: (page: Page) => Locator }[] = [
  { url: '/entrar', ready: heading('Entrar') },
  { url: '/entrar/esqueci-minha-senha', ready: heading('Esqueci minha senha') },
  { url: '/aprovacao/valido-ped-02', ready: heading('Pedido de Lucas Bittencourt') },
  { url: '/aprovacao/expirado-ped-22', ready: heading('Link expirado') },
  { url: '/hoje', ready: heading('Hoje') },
  { url: '/aprovacoes', ready: heading('Lucas Bittencourt') },
  { url: '/aprovacoes?simular=vazio', ready: heading('Nenhum pedido aguardando') },
  { url: '/aprovacoes?simular=erro', ready: heading('Não conseguimos carregar os pedidos') },
  { url: '/aprovacoes/ped-02', ready: (page) => page.locator('#detalhe-titulo') },
  { url: '/regras', ready: heading('Regras de jornada') },
  { url: '/regras/regra-comercial', ready: heading('Comercial') },
  { url: '/regras/regra-noturna', ready: heading('Noturna') },
  { url: '/regras/nova', ready: heading('Nova regra') },
];

for (const { name, viewport, deviceScaleFactor } of sizes) {
  test.describe(name, () => {
    test.use({ viewport, deviceScaleFactor });

    for (const { url, ready } of screens) {
      test(`${url}: sem rolagem para o lado e nada cortado`, async ({ page }) => {
        // Relógio falso a partir de uma hora fixa, como no today.spec.ts: o tempo corre
        // normalmente, mas os dados simulados (pedidos, estações) não dependem da hora do teste.
        await page.clock.install({ time: TUESDAY_AFTERNOON });
        await page.goto(url);
        await expect(ready(page)).toBeVisible();
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

        expect(await page.evaluate(findOverflow)).toEqual([]);
        const covered = await page.evaluate(stuckBarsHeight);
        expect(covered, 'altura das barras presas, em fração da tela').toBeLessThanOrEqual(0.4);
      });
    }
  });
}

// As funções abaixo rodam dentro da página: não podem usar nada de fora delas.

/** Rolagem para o lado e elementos que saem da tela pela direita ou pela esquerda. */
function findOverflow(): string[] {
  const width = document.documentElement.clientWidth;
  const problems: string[] = [];
  if (document.documentElement.scrollWidth > width) {
    problems.push(`a página rola para o lado: ${document.documentElement.scrollWidth} px`);
  }

  const describe = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}` +
    ` "${(el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
  // Texto só para leitor de tela (cdk-visually-hidden e afins) e trechos com rolagem própria.
  const exempt = (el: Element) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.clipPath !== 'none' || style.clip !== 'auto') return true;
      if (['auto', 'scroll'].includes(style.overflowX)) return true;
    }
    const style = getComputedStyle(el);
    return style.clipPath !== 'none' || style.clip !== 'auto';
  };

  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if ((rect.right > width + 1 || rect.left < -1) && !exempt(el)) {
      problems.push(
        `sai da tela: ${describe(el)} (${Math.round(rect.left)} a ${Math.round(rect.right)} px)`,
      );
    }
  }
  return problems;
}

/** Fração da altura da tela ocupada pelas barras fixas ou presas que estão à vista. */
function stuckBarsHeight(): number {
  let total = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const { position } = getComputedStyle(el);
    if (position !== 'fixed' && position !== 'sticky') continue;
    const rect = el.getBoundingClientRect();
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, innerHeight);
    if (bottom > top && rect.width > 0) total += bottom - top;
  }
  return total / innerHeight;
}
