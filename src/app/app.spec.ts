import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('coloca o conteúdo das rotas dentro do <main>', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main');
    expect(main?.querySelector('router-outlet')).not.toBeNull();
  });
});
