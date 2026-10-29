import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ICONS } from '../icon/icons';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state heading="Nenhum colaborador encontrado" icon="search_off" [headingLevel]="3">
      <button type="button">Limpar filtros</button>
    </app-empty-state>
  `,
})
class WithAction {}

describe('EmptyState', () => {
  it('mostra ícone, título e texto', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('heading', 'Nenhum pedido aguardando');
    fixture.componentRef.setInput(
      'description',
      'Pedidos de extensão aparecem aqui assim que alguém solicitar.',
    );
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('h2')?.textContent).toBe('Nenhum pedido aguardando');
    expect(host.querySelector('p')?.textContent).toBe(
      'Pedidos de extensão aparecem aqui assim que alguém solicitar.',
    );
    expect(host.querySelector('path')?.getAttribute('d')).toBe(ICONS.inbox);
  });

  it('não mostra parágrafo vazio sem texto', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('heading', 'Nada por aqui');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')).toBeNull();
  });

  it('projeta a ação e respeita o nível do título', async () => {
    const fixture = TestBed.createComponent(WithAction);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('h3')?.textContent).toBe('Nenhum colaborador encontrado');
    expect(host.querySelector('h2')).toBeNull();
    expect(host.querySelector('.actions button')?.textContent).toBe('Limpar filtros');
    expect(host.querySelector('path')?.getAttribute('d')).toBe(ICONS.search_off);
  });
});
