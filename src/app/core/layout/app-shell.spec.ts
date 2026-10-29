import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ExtensionRequest } from '../../shared/models';
import { AppShell } from './app-shell';

@Component({ template: '<h1>Página</h1>' })
class StubPage {}

function request(id: string, status: ExtensionRequest['status']): Partial<ExtensionRequest> {
  return { id, status, expiresAt: '2026-11-12T21:00:00.000Z' };
}

describe('AppShell', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  /** Responde a toda chamada ainda aberta: o usuário simulado e listas vazias. */
  function flushOpenRequests(): void {
    for (const open of http.match(() => true)) {
      open.flush(
        open.request.url === '/api/eu' ? { id: 'col-25', name: 'Renata Albuquerque' } : [],
      );
    }
  }

  beforeAll(() => {
    // O jsdom não implementa scrollIntoView; a paleta usa para manter a opção ativa visível.
    Element.prototype.scrollIntoView ??= () => undefined;
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: '',
            component: AppShell,
            children: [
              { path: 'hoje', component: StubPage },
              { path: 'pessoas', component: StubPage },
            ],
          },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create('/hoje');
    http = TestBed.inject(HttpTestingController);
  });

  const shell = () => harness.routeNativeElement as HTMLElement;
  const main = () => shell().querySelector('main') as HTMLElement;

  it('tem o link para pular ao conteúdo, os landmarks e o conteúdo da rota no <main>', () => {
    const skip = shell().querySelector('a.skip-link');
    expect(skip?.textContent?.trim()).toBe('Pular para o conteúdo');
    expect(skip?.getAttribute('href')).toBe('#conteudo');
    expect(shell().querySelectorAll('header')).toHaveLength(1);
    expect(shell().querySelectorAll('main')).toHaveLength(1);
    expect(main().id).toBe('conteudo');
    expect(main().querySelector('h1')?.textContent).toBe('Página');
    // O cabeçalho não tem h1: o único h1 é o da página.
    expect(shell().querySelectorAll('h1')).toHaveLength(1);
  });

  it('o link "Pular para o conteúdo" leva o foco ao <main>', () => {
    (shell().querySelector('a.skip-link') as HTMLAnchorElement).click();
    expect(document.activeElement).toBe(main());
  });

  it('mostra no menu quantos pedidos aguardam o gestor', async () => {
    http
      .expectOne('/api/pedidos')
      .flush([
        request('ped-01', 'aguardando_gestor'),
        request('ped-02', 'aguardando_gestor'),
        request('ped-03', 'aguardando_rh'),
        request('ped-04', 'aprovado'),
      ]);
    flushOpenRequests();
    await harness.fixture.whenStable();

    // O número faz parte do nome do link; "pendentes" vem em texto oculto.
    for (const nav of ['app-side-nav', 'app-bottom-nav']) {
      const count = shell().querySelector(`${nav} a[href="/aprovacoes"] app-pending-count`);
      expect(count?.textContent?.replace(/\s+/g, ' ').trim()).toBe('2 pendentes');
      expect(count?.querySelector('.cdk-visually-hidden')?.textContent?.trim()).toBe('pendentes');
    }
  });

  it('sem pedidos aguardando, ou se a chamada falhar, o número não aparece', async () => {
    http.expectOne('/api/pedidos').flush('', { status: 503, statusText: 'Indisponível' });
    flushOpenRequests();
    await harness.fixture.whenStable();
    expect(shell().querySelector('app-pending-count')).toBeNull();
  });

  it('o foco vai para o <main> ao trocar de página, mas não no primeiro carregamento', async () => {
    flushOpenRequests();
    await harness.fixture.whenStable();
    expect(document.activeElement).not.toBe(main());

    await harness.navigateByUrl('/pessoas');
    await harness.fixture.whenStable();
    expect(document.activeElement).toBe(main());

    // Mudar só a query (um filtro) não tira o foco de onde ele está.
    const skip = shell().querySelector('a.skip-link') as HTMLElement;
    skip.focus();
    await harness.navigateByUrl('/pessoas?grupo=grp-ti');
    await harness.fixture.whenStable();
    expect(document.activeElement).toBe(skip);
  });

  it('Ctrl+K abre e fecha a busca', async () => {
    const dialog = TestBed.inject(Dialog);
    const press = (init: KeyboardEventInit) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, ...init }));

    flushOpenRequests();
    press({ ctrlKey: true });
    // O código da busca chega sob demanda (import dinâmico) na primeira vez.
    await vi.waitFor(() => expect(dialog.openDialogs).toHaveLength(1));
    TestBed.tick(); // a paleta pede colaboradores, grupos e regras
    flushOpenRequests();
    await harness.fixture.whenStable();
    expect(shell().querySelector('button.search')?.getAttribute('aria-expanded')).toBe('true');

    press({ metaKey: true });
    await harness.fixture.whenStable();
    expect(dialog.openDialogs).toHaveLength(0);

    press({});
    expect(dialog.openDialogs).toHaveLength(0);
  });
});
