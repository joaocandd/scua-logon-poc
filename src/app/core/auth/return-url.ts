/** Para onde vai quem entra sem destino. */
export const HOME_URL = '/hoje';

/** Começa com uma única "/" e não tem "\" nem espaço. */
const INTERNAL_PATH = /^\/(?![/\\])[^\s\\]*$/;

/**
 * Destino depois do login (/entrar?voltar=/aprovacoes). Só aceita caminhos internos do app, e
 * nunca o próprio /entrar. Qualquer outra coisa, como "//site.example" ou "https://site.example",
 * leva para /hoje: o parâmetro não pode virar um redirecionamento para fora do app.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !INTERNAL_PATH.test(value) || hasControlCharacter(value)) return HOME_URL;
  const path = value.split(/[?#]/)[0];
  return path === '/entrar' || path.startsWith('/entrar/') ? HOME_URL : value;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}
