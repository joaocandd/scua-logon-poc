import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth, InvalidCredentialsError, type SessionUser } from './auth';
import { SignInPage } from './sign-in-page';

const MARINA: SessionUser = { username: 'marina.alves', name: 'marina.alves' };

describe('SignInPage', () => {
  async function render() {
    // O teste decide quando o "servidor" responde.
    let response!: { resolve: (user: SessionUser) => void; reject: (error: unknown) => void };
    const auth = {
      signIn: vi.fn(
        () => new Promise<SessionUser>((resolve, reject) => (response = { resolve, reject })),
      ),
      signInWithCorporateAccount: vi.fn(async () => MARINA),
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

    respond().resolve(MARINA);
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
});
