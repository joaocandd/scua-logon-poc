import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Field, FieldControl } from './field';

@Component({
  imports: [Field, FieldControl],
  template: `
    <app-field label="Início da jornada" hint="Formato 24 h" [error]="error()" required>
      <input appFieldControl type="time" />
    </app-field>
    <app-field label="Grupo">
      <select appFieldControl>
        <option>Financeiro</option>
      </select>
    </app-field>
  `,
})
class Host {
  readonly error = signal<string | null>(null);
}

describe('Field', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const [time, select] = Array.from(root.querySelectorAll<HTMLElement>('[appFieldControl]'));
    return { fixture, root, time, select, labels: root.querySelectorAll('label') };
  }

  it('liga o rótulo visível ao controle', async () => {
    const { time, select, labels } = await render();
    expect(time.id).toMatch(/^app-field-\d+$/);
    expect(labels[0].htmlFor).toBe(time.id);
    expect(labels[1].htmlFor).toBe(select.id);
    expect(time.id).not.toBe(select.id);
  });

  it('descreve o controle com o texto de ajuda', async () => {
    const { root, time, select } = await render();
    const hint = root.querySelector(`#${time.getAttribute('aria-describedby')}`);
    expect(hint?.textContent).toBe('Formato 24 h');
    expect(select.hasAttribute('aria-describedby')).toBe(false);
  });

  it('marca o obrigatório no rótulo e no controle', async () => {
    const { time, select, labels } = await render();
    expect(labels[0].textContent).toContain('(obrigatório)');
    expect(time.getAttribute('aria-required')).toBe('true');
    expect(select.hasAttribute('aria-required')).toBe(false);
  });

  it('mostra o erro em texto, ligado por aria-describedby, dentro de uma região anunciada', async () => {
    const { fixture, root, time } = await render();
    expect(time.hasAttribute('aria-invalid')).toBe(false);

    fixture.componentInstance.error.set('Informe o horário de início.');
    await fixture.whenStable();

    expect(time.getAttribute('aria-invalid')).toBe('true');
    const ids = time.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    const error = root.querySelector(`#${ids[1]}`);
    expect(error?.textContent?.trim()).toBe('Informe o horário de início.');
    expect(error?.parentElement?.getAttribute('aria-live')).toBe('polite');
  });

  it('tira o erro quando ele é corrigido', async () => {
    const { fixture, time } = await render();
    fixture.componentInstance.error.set('Informe o horário de início.');
    await fixture.whenStable();
    fixture.componentInstance.error.set('');
    await fixture.whenStable();

    expect(time.hasAttribute('aria-invalid')).toBe(false);
    expect(time.getAttribute('aria-describedby')?.split(' ')).toHaveLength(1);
  });
});
