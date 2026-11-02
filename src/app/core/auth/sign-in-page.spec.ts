import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Employee } from '../../shared/models';
import { Auth, InvalidCredentialsError } from './auth';
import { SignInPage } from './sign-in-page';

// Na demonstração, todo login entra como a aprovadora simulada.
const RENATA: Employee = {
  id: 'col-25',
  name: 'Renata Albuquerque',
  email: 'renata.albuquerque@empresa.example',
  jobTitle: 'Diretora de operações',
  groupId: 'grp-operacoes',
};

describe('SignInPage', () => {
  async function render() {
    // O teste decide quando o "servidor" responde.
    let response!: { resolve: (user: Employee) => void; reject: (error: unknown) => void };
    const auth = {
      signIn: vi.fn(
        () => new Promise<Employee>((resolve, reject) => (response = { resolve, reject })),
      ),
      signInWithCorporateAccount: vi.fn(async (): Promise<Employee> => RENATA),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: auth }],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(SignInPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const [username, password] = Array.from(root.querySelectorAll('input'));
    const buttons = Array.from(root.querySelectorAll('button'));
    const byText = (text: string) => buttons.find((b) => b.textContent?.trim() === text)!;

    /** Espera as promessas pendentes e a tela atualizar. */
    async function settle() {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    }

    return {
      auth,
      navigate,
      root,
      username,
      password,
      reveal: root.querySelector<HTMLButtonElement>('button[aria-label="Mostrar senha"]')!,
      submit: byText('Entrar'),
      corporate: byText('Entrar com conta corporativa'),
      alert: root.querySelector('[role="alert"]')!,
      respond: () => response,
      settle,
    };
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('liga os campos aos rótulos, com autocomplete de usuário e senha', async () => {
    const { root, username, password } = await render();
    const labelOf = (input: HTMLInputElement) =>
      root.querySelector(`label[for="${input.id}"]`)?.textContent?.trim();

    expect(labelOf(username)).toBe('Usuário');
    expect(username.autocomplete).toBe('username');
    expect(labelOf(password)).toBe('Senha');
    expect(password.autocomplete).toBe('current-password');
    expect(password.type).toBe('password');
  });

  it('só mostra os erros depois de tentar entrar e foca o primeiro campo vazio', async () => {
    const { auth, root, username, submit, settle } = await render();
    expect(root.textContent).not.toContain('Informe o usuário.');

    submit.click();
    await settle();

    expect(root.textContent).toContain('Informe o usuário.');
    expect(root.textContent).toContain('Informe a senha.');
    expect(username.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(username);
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('com o usuário preenchido e a senha vazia, foca a senha', async () => {
    const { root, username, password, submit, settle } = await render();
    type(username, 'marina.alves');

    submit.click();
    await settle();

    expect(root.textContent).not.toContain('Informe o usuário.');
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(password);
  });

  it('mostra o carregando no botão enquanto confere e depois vai para /hoje', async () => {
    const { auth, navigate, username, password, submit, respond, settle } = await render();
    type(username, 'marina.alves');
    type(password, 'qualquer-senha');

    submit.click();
    await settle();

    expect(auth.signIn).toHaveBeenCalledWith('marina.alves', 'qualquer-senha');
    expect(submit.getAttribute('aria-busy')).toBe('true');

    respond().resolve(RENATA);
    await settle();

    expect(navigate).toHaveBeenCalledWith('/hoje');
    expect(submit.hasAttribute('aria-busy')).toBe(false);
  });

  it('com credencial inválida, mostra o alerta acima do formulário e seleciona a senha', async () => {
    const { navigate, alert, username, password, submit, respond, settle } = await render();
    type(username, 'marina.alves');
    type(password, 'erro');

    submit.click();
    await settle();
    respond().reject(new InvalidCredentialsError());
    await settle();

    expect(alert.textContent?.trim()).toBe('Usuário ou senha incorretos. Confira e tente de novo.');
    expect(document.activeElement).toBe(password);
    expect([password.selectionStart, password.selectionEnd]).toEqual([0, 'erro'.length]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('servidor fora do ar: mostra a mensagem da API no alerta e não sai da tela', async () => {
    const { navigate, alert, username, password, submit, respond, settle } = await render();
    type(username, 'marina.alves');
    type(password, 'qualquer-senha');

    submit.click();
    await settle();
    const message = 'Não conseguimos falar com o servidor. Tente de novo em instantes.';
    respond().reject(new HttpErrorResponse({ status: 503, error: { message } }));
    await settle();

    expect(alert.textContent?.trim()).toBe(message);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('o botão de mostrar a senha alterna o tipo do campo e o aria-pressed', async () => {
    const { password, reveal, settle } = await render();
    expect(reveal.getAttribute('aria-pressed')).toBe('false');

    reveal.click();
    await settle();
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
    expect(password.type).toBe('text');

    reveal.click();
    await settle();
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
    expect(password.type).toBe('password');
  });

  it('entra com a conta corporativa simulada', async () => {
    const { auth, navigate, corporate, settle } = await render();

    corporate.click();
    await settle();

    expect(auth.signInWithCorporateAccount).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/hoje');
  });

  it('conta corporativa com o servidor fora do ar: mostra a mensagem e libera o botão', async () => {
    const { auth, navigate, alert, corporate, settle } = await render();
    auth.signInWithCorporateAccount.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));

    corporate.click();
    await settle();

    expect(alert.textContent?.trim()).toBe(
      'Não conseguimos falar com o servidor. Tente de novo em instantes.',
    );
    expect(corporate.hasAttribute('aria-busy')).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('SignInPage com ?voltar=', () => {
  /** Abre /entrar com a query dada e entra pela conta corporativa. Devolve para onde foi. */
  async function signInFrom(url: string): Promise<unknown> {
    const auth = {
      signIn: vi.fn(async (): Promise<Employee> => RENATA),
      signInWithCorporateAccount: vi.fn(async (): Promise<Employee> => RENATA),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'entrar', component: SignInPage }]),
        { provide: Auth, useValue: auth },
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const corporate = Array.from(
      (harness.routeNativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Entrar com conta corporativa')!;

    corporate.click();
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
    return navigate.mock.calls[0]?.[0];
  }

  it('volta para o caminho interno pedido', async () => {
    expect(await signInFrom('/entrar?voltar=%2Faprovacoes')).toBe('/aprovacoes');
  });

  it('caminho para fora do app vira /hoje', async () => {
    expect(await signInFrom('/entrar?voltar=%2F%2Fsite.example')).toBe('/hoje');
  });
});
