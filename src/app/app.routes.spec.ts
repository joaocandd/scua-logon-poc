import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from './app.config';

describe('Rotas do app', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    harness = await RouterTestingHarness.create();
  });

  it('redireciona / para /hoje', async () => {
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/hoje');
  });

  it.each([
    ['/entrar', 'Entrar'],
    ['/entrar/esqueci-minha-senha', 'Esqueci minha senha'],
    ['/hoje', 'Hoje'],
    ['/aprovacoes', 'Aprovações'],
    ['/regras', 'Regras de jornada'],
    ['/pessoas', 'Pessoas'],
    ['/relatorios', 'Relatórios'],
    ['/configuracoes', 'Configurações'],
    ['/endereco-que-nao-existe', 'Página não encontrada'],
  ])('%s mostra "%s" no h1 e no título da aba', async (url, pageTitle) => {
    await harness.navigateByUrl(url);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(pageTitle);
    expect(TestBed.inject(Title).getTitle()).toBe(`${pageTitle} · Scua Logon`);
  });
});
