import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Employee } from '../../shared/models';
import { Auth, InvalidCredentialsError } from './auth';
import { CurrentUser } from './current-user';

const RENATA: Employee = {
  id: 'col-25',
  name: 'Renata Albuquerque',
  email: 'renata.albuquerque@empresa.example',
  jobTitle: 'Diretora de operações',
  groupId: 'grp-operacoes',
};

describe('Auth', () => {
  let auth: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('entra pela API com o usuário sem espaços e quem entra vira o usuário atual', async () => {
    const signIn = auth.signIn('  marina.alves ', 'qualquer-senha');
    const call = http.expectOne({ method: 'POST', url: '/api/sessao' });
    expect(call.request.body).toEqual({ username: 'marina.alves', password: 'qualquer-senha' });
    call.flush(RENATA);

    await expect(signIn).resolves.toEqual(RENATA);
    // O menu do usuário lê o CurrentUser: mostra a mesma pessoa, sem perguntar de novo à API.
    expect(TestBed.inject(CurrentUser).profile()?.name).toBe('Renata Albuquerque');
    TestBed.tick();
    http.expectNone('/api/eu');
  });

  it('credencial recusada pela API (401) vira InvalidCredentialsError', async () => {
    const signIn = auth.signIn('marina.alves', 'erro');
    http
      .expectOne('/api/sessao')
      .flush({ message: 'Usuário ou senha incorretos.' }, { status: 401, statusText: '' });

    await expect(signIn).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('outros erros seguem para a tela, que mostra a mensagem da API', async () => {
    const signIn = auth.signIn('marina.alves', 'qualquer-senha');
    const message = 'Não conseguimos falar com o servidor. Tente de novo em instantes.';
    http.expectOne('/api/sessao').flush({ message }, { status: 503, statusText: '' });

    await expect(signIn).rejects.toMatchObject({ status: 503, error: { message } });
  });

  it('entra com a conta corporativa simulada como a mesma pessoa', async () => {
    const signIn = auth.signInWithCorporateAccount();
    http.expectOne({ method: 'POST', url: '/api/sessao/corporativa' }).flush(RENATA);

    await expect(signIn).resolves.toEqual(RENATA);
    expect(TestBed.inject(CurrentUser).profile()?.id).toBe('col-25');
  });
});
