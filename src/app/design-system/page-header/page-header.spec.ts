import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header heading="Regras de jornada" description="Horários em que cada grupo trabalha.">
      <button type="button">Nova regra</button>
    </app-page-header>
  `,
})
class Host {}

describe('PageHeader', () => {
  it('mostra o título como h1, a descrição e as ações', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('h1')).toHaveLength(1);
    expect(host.querySelector('h1')?.textContent).toBe('Regras de jornada');
    expect(host.querySelector('p')?.textContent).toBe('Horários em que cada grupo trabalha.');
    expect(host.querySelector('.actions button')?.textContent).toBe('Nova regra');
  });

  it('funciona só com o título', async () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('heading', 'Aprovações');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('h1')?.textContent).toBe('Aprovações');
    expect(host.querySelector('p')).toBeNull();
  });
});
