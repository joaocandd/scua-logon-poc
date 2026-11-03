import { expect, type Locator, type Page } from '@playwright/test';

/** Uma parada do Tab: o que recebeu o foco e o que estava errado nele. */
interface TabStop {
  /** Posição do elemento no HTML, entre os que deveriam receber o foco; -1 se não era esperado. */
  index: number;
  name: string;
  ring: boolean;
  visible: boolean;
}

/**
 * Percorre a página só com o Tab, do começo ao fim, e confere três coisas (WCAG 2.1.1, 2.4.3,
 * 2.4.7 e 2.4.11):
 * - nada fica inalcançável: todo elemento interativo visível recebe o foco;
 * - a ordem do foco é a ordem do HTML (nenhum tabindex positivo bagunça a leitura);
 * - cada parada tem o anel de foco e fica à vista, sem ficar embaixo do cabeçalho ou das barras.
 *
 * Devolve os nomes das paradas, na ordem, para o teste conferir trechos dela se quiser.
 */
export async function expectTabReachesEverything(page: Page): Promise<string[]> {
  const expected = await page.evaluate(markTabbable);
  // Começa do topo. Tirar o foco não basta: o navegador continua o Tab de onde ele estava (o
  // título do detalhe, por exemplo). Um marcador no começo do <body> recebe o foco e sai depois.
  await page.evaluate(() => {
    const start = document.createElement('span');
    start.tabIndex = -1;
    start.setAttribute('data-tab-start', '');
    document.body.prepend(start);
    start.focus();
  });

  const stops: TabStop[] = [];
  // Campos de data e hora gastam um Tab por parte (hora, minuto e o ícone do relógio): o limite tem
  // folga para isso. O anel do ícone é o do navegador, na nossa cor (styles.scss).
  for (let i = 0; i < expected.length * 3 + 10; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(inspectFocus);
    if (!stop) break; // o foco saiu da página: acabou
    if (stops.length > 0 && stop.index >= 0 && stop.index === stops[0].index) break; // deu a volta
    // A próxima parte do mesmo campo de data ou hora não é uma parada nova; o anel é conferido na
    // primeira.
    if (stops.length > 0 && stop.index >= 0 && stop.index === stops.at(-1)!.index) continue;
    stops.push(stop);
  }
  await page.evaluate(() => document.querySelector('[data-tab-start]')?.remove());

  const reached = new Set(stops.map((stop) => stop.index));
  const problems = [
    ...expected.filter((_, i) => !reached.has(i)).map((name) => `inalcançável: ${name}`),
    ...stops.filter((stop) => stop.index < 0).map((stop) => `foco inesperado: ${stop.name}`),
    ...stops
      .filter((stop, i) => i > 0 && stop.index >= 0 && stop.index < stops[i - 1].index)
      .map((stop) => `fora da ordem do HTML: ${stop.name}`),
    ...stops.filter((stop) => !stop.ring).map((stop) => `sem anel de foco: ${stop.name}`),
    ...stops.filter((stop) => !stop.visible).map((stop) => `foco escondido: ${stop.name}`),
  ];
  expect(problems, `Paradas do Tab: ${stops.map((s) => s.name).join(' → ')}`).toEqual([]);
  return stops.map((stop) => stop.name);
}

/**
 * Confere que o diálogo prende o foco: o Tab e o Shift+Tab dão a volta dentro dele, sem escapar
 * para a página atrás.
 */
export async function expectFocusTrapped(page: Page, dialog: Locator): Promise<void> {
  const count = await dialog.evaluate(
    (root) =>
      [...root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea')].filter(
        (el) => !el.matches(':disabled') && el.tabIndex >= 0 && el.checkVisibility(),
      ).length,
  );
  expect(count, 'o diálogo precisa de ao menos um elemento focável').toBeGreaterThan(0);
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press(key);
      const inside = await dialog.evaluate((root) => root.contains(document.activeElement));
      expect(inside, `${key} nº ${i + 1} levou o foco para fora do diálogo`).toBe(true);
    }
  }
}

// As funções abaixo rodam dentro da página: não podem usar nada de fora delas.

/**
 * Marca com `data-tab-index`, na ordem do HTML, cada elemento que o Tab deveria alcançar, e
 * devolve os nomes deles. Num grupo de rádios, o Tab para só no marcado (ou no primeiro).
 */
function markTabbable(): string[] {
  const nameOf = (el: HTMLElement): string => {
    const label =
      el.getAttribute('aria-label') ??
      (el as HTMLInputElement).labels?.[0]?.textContent ??
      el.innerText ??
      '';
    return `${el.tagName.toLowerCase()} "${label.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
  };

  document
    .querySelectorAll('[data-tab-index]')
    .forEach((el) => el.removeAttribute('data-tab-index'));
  const candidates = [
    ...document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]',
    ),
  ].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(':disabled, [type="hidden"]') &&
      !el.closest('[inert]') &&
      el.checkVisibility({ visibilityProperty: true }),
  );

  const radioGroups = new Map<string, HTMLInputElement[]>();
  for (const el of candidates) {
    if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
      radioGroups.set(el.name, [...(radioGroups.get(el.name) ?? []), el]);
    }
  }
  const tabbable = candidates.filter((el) => {
    if (!(el instanceof HTMLInputElement && el.type === 'radio' && el.name)) return true;
    const group = radioGroups.get(el.name)!;
    return el === (group.find((radio) => radio.checked) ?? group[0]);
  });

  tabbable.forEach((el, i) => el.setAttribute('data-tab-index', String(i)));
  return tabbable.map(nameOf);
}

/** O elemento com foco agora: posição esperada, nome, anel de foco e se está à vista. */
function inspectFocus(): TabStop | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || el === document.documentElement) return null;

  const label =
    el.getAttribute('aria-label') ??
    (el as HTMLInputElement).labels?.[0]?.textContent ??
    el.innerText ??
    '';
  const name = `${el.tagName.toLowerCase()} "${label.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;

  // Rádio ou caixa escondidos (opacity 0) desenham o anel e ocupam o lugar do rótulo.
  const hiddenControl = el instanceof HTMLInputElement && getComputedStyle(el).opacity === '0';
  const box = (hiddenControl && el.closest('label')) || el;

  const hasOutline = (node: Element) => {
    const style = getComputedStyle(node);
    return (
      style.outlineStyle !== 'none' &&
      parseFloat(style.outlineWidth) >= 2 &&
      style.outlineColor !== 'rgba(0, 0, 0, 0)'
    );
  };
  const ring = hasOutline(el) || (box !== el && hasOutline(box));

  // À vista: ao menos um ponto do elemento dentro da tela e sem nada por cima (WCAG 2.4.11).
  const rect = box.getBoundingClientRect();
  const inset = Math.min(4, rect.width / 2, rect.height / 2);
  const points = [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + inset, rect.top + inset],
    [rect.right - inset, rect.top + inset],
    [rect.left + inset, rect.bottom - inset],
    [rect.right - inset, rect.bottom - inset],
  ];
  const visible = points.some(([x, y]) => {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (box.contains(hit) || hit.contains(box));
  });

  const index = Number(el.getAttribute('data-tab-index') ?? -1);
  return { index, name, ring, visible };
}
