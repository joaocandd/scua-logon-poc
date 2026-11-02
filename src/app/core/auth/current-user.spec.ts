import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Employee } from '../../shared/models';
import { CurrentUser } from './current-user';

function person(id: string, name: string): Employee {
  return { id, name, email: `${id}@empresa.example`, jobTitle: 'Diretora', groupId: 'grp-rh' };
}

describe('CurrentUser', () => {
  let currentUser: CurrentUser;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    currentUser = TestBed.inject(CurrentUser);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sem login, usa a sessão que a API informa', async () => {
    TestBed.tick();
    http.expectOne('/api/eu').flush(person('col-25', 'Renata Albuquerque'));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(currentUser.profile()?.name).toBe('Renata Albuquerque');
    expect(currentUser.initials()).toBe('RA');
  });

  it('quem entra pelo login vira o usuário atual, sem chamar a API', () => {
    currentUser.setUser(person('col-25', 'Renata Albuquerque'));
    TestBed.tick();

    http.expectNone('/api/eu');
    expect(currentUser.profile()?.name).toBe('Renata Albuquerque');
  });

  it('iniciais de um nome só', () => {
    currentUser.setUser(person('col-99', 'Renata'));
    expect(currentUser.initials()).toBe('R');
  });
});
