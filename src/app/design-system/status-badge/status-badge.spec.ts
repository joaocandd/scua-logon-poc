import { TestBed } from '@angular/core/testing';
import { EXTENSION_REQUEST_STATUSES, WORKSTATION_STATES } from '../../shared/models/status';
import { ICONS } from '../icon/icons';
import { Status, StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  async function render(status: Status) {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['aguardando_gestor', 'Aguardando gestor', 'pending'],
    ['aguardando_rh', 'Aguardando RH', 'pending'],
    ['aprovado', 'Aprovado', 'approved'],
    ['recusado', 'Recusado', 'rejected'],
    ['expirado', 'Expirado', 'neutral'],
    ['cancelado', 'Cancelado', 'neutral'],
    ['em_jornada', 'Em jornada', 'unlocked'],
    ['intervalo', 'Em intervalo', 'neutral'],
    ['he_aprovada', 'Hora extra aprovada', 'approved'],
    ['bloqueada', 'Bloqueada', 'blocked'],
    ['fora_expediente', 'Fora do expediente', 'neutral'],
  ] as const)('%s mostra "%s" com o tom %s', async (status, label, tone) => {
    const host = await render(status);
    expect(host.textContent?.trim()).toBe(label);
    expect(host.dataset['tone']).toBe(tone);
  });

  it('tem ícone em todos os status (nunca só a cor)', async () => {
    for (const status of [...EXTENSION_REQUEST_STATUSES, ...WORKSTATION_STATES]) {
      const host = await render(status);
      const path = host.querySelector('app-icon path')?.getAttribute('d');
      expect(Object.values(ICONS)).toContain(path);
    }
  });

  it('não usa o mesmo ícone para status diferentes', async () => {
    const statuses = [...EXTENSION_REQUEST_STATUSES, ...WORKSTATION_STATES];
    const paths = new Set<string | null | undefined>();
    for (const status of statuses) {
      const host = await render(status);
      paths.add(host.querySelector('app-icon path')?.getAttribute('d'));
    }
    expect(paths.size).toBe(statuses.length);
  });
});
