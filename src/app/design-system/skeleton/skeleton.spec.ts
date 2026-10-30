import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

@Component({
  imports: [Skeleton],
  template: `
    <app-skeleton />
    <app-skeleton variant="heading" width="40%" />
    <app-skeleton variant="block" width="var(--space-8)" />
  `,
})
class Loading {}

describe('Skeleton', () => {
  async function render() {
    const fixture = TestBed.createComponent(Loading);
    await fixture.whenStable();
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('app-skeleton'),
    );
  }

  it('fica fora do leitor de tela', async () => {
    for (const skeleton of await render()) {
      expect(skeleton.getAttribute('aria-hidden')).toBe('true');
      expect(skeleton.textContent).toBe('');
    }
  });

  it('linha de texto por padrão, com largura total', async () => {
    const [text] = await render();
    expect(text.dataset['variant']).toBe('text');
    expect(text.style.width).toBe('100%');
  });

  it('aceita variante e largura', async () => {
    const [, heading, block] = await render();
    expect(heading.dataset['variant']).toBe('heading');
    expect(heading.style.width).toBe('40%');
    expect(block.dataset['variant']).toBe('block');
    expect(block.style.width).toBe('var(--space-8)');
  });
});
