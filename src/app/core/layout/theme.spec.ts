import { TestBed } from '@angular/core/testing';
import { Theme, THEME_STORAGE_KEY } from './theme';

describe('Theme', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    root.removeAttribute('data-theme');
  });

  function create(): Theme {
    const theme = TestBed.inject(Theme);
    TestBed.tick();
    return theme;
  }

  it('começa no tema do sistema, sem data-theme no <html>', () => {
    const theme = create();
    expect(theme.preference()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('aplica e guarda a escolha', () => {
    const theme = create();

    theme.set('dark');
    TestBed.tick();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    theme.set('system');
    TestBed.tick();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('volta com a escolha guardada', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const theme = create();
    expect(theme.preference()).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('ignora valor desconhecido no localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'roxo');
    expect(create().preference()).toBe('system');
  });

  it('funciona sem localStorage (armazenamento bloqueado)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Bloqueado', 'SecurityError');
    });

    const theme = create();
    expect(theme.preference()).toBe('system');

    theme.set('dark');
    TestBed.tick();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});
