import { TestBed } from '@angular/core/testing';
import { Auth, InvalidCredentialsError, SIGN_IN_DELAY_MS } from './auth';

describe('Auth', () => {
  let auth: Auth;

  beforeEach(() => {
    vi.useFakeTimers();
    auth = TestBed.inject(Auth);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('começa sem sessão', () => {
    expect(auth.user()).toBeNull();
  });

  it('entra com qualquer usuário e senha, depois da latência simulada', async () => {
    const signIn = auth.signIn('  marina.alves ', 'qualquer-senha');
    expect(auth.user()).toBeNull();

    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);

    await expect(signIn).resolves.toEqual({ username: 'marina.alves', name: 'marina.alves' });
    expect(auth.user()?.username).toBe('marina.alves');
  });

  it('recusa a senha "erro" como credencial inválida', async () => {
    const signIn = auth.signIn('marina.alves', 'erro');
    const rejection = expect(signIn).rejects.toBeInstanceOf(InvalidCredentialsError);

    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);

    await rejection;
    expect(auth.user()).toBeNull();
  });

  it('entra com a conta corporativa simulada', async () => {
    const signIn = auth.signInWithCorporateAccount();
    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);

    await expect(signIn).resolves.toEqual({ username: 'ana.ribeiro', name: 'Ana Ribeiro' });
  });

  it('sai e limpa a sessão', async () => {
    const signIn = auth.signIn('marina.alves', 'qualquer-senha');
    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);
    await signIn;

    auth.signOut();

    expect(auth.user()).toBeNull();
  });
});
