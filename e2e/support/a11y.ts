import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Meta do projeto: ABNT NBR 17225:2025, equivalente a WCAG 2.2 AA.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Roda o axe na página atual e falha se houver qualquer violação. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
}
