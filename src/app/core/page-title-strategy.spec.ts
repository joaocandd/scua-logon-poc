import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageTitleStrategy } from './page-title-strategy';

@Component({ template: '' })
class BlankPage {}

describe('PageTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'com-titulo', title: 'Aprovações', component: BlankPage },
          { path: 'sem-titulo', component: BlankPage },
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
  });

  it('junta o título da rota ao nome do produto', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/com-titulo');
    expect(TestBed.inject(Title).getTitle()).toBe('Aprovações · Scua Logon');
  });

  it('usa só o nome do produto quando a rota não tem título', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sem-titulo');
    expect(TestBed.inject(Title).getTitle()).toBe('Scua Logon');
  });
});
