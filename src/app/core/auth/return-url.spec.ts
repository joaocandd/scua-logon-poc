import { HOME_URL, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/aprovacoes', '/aprovacoes?filtro=todos', '/aprovacoes/ped-02', '/regras#editor'])(
    'aceita o caminho interno "%s"',
    (url) => {
      expect(safeReturnUrl(url)).toBe(url);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'aprovacoes',
    '//site.example',
    '/\\site.example',
    'https://site.example',
    'javascript:alert(1)',
    '/ aprovacoes',
    '/aprova\ncoes',
    '/aprovacoes\u0000',
    '/aprovacoes\\..',
  ])('recusa "%s" e leva para /hoje', (url) => {
    expect(safeReturnUrl(url)).toBe(HOME_URL);
  });

  it('não volta para o próprio login', () => {
    expect(safeReturnUrl('/entrar')).toBe(HOME_URL);
    expect(safeReturnUrl('/entrar?voltar=/aprovacoes')).toBe(HOME_URL);
    expect(safeReturnUrl('/entrar/esqueci-minha-senha')).toBe(HOME_URL);
    expect(safeReturnUrl('/entrada-de-dados')).toBe('/entrada-de-dados');
  });
});
