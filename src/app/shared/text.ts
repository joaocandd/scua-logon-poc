// Textos da interface: comparar sem acento e começar com maiúscula.

/** "  João " → "joao". Para comparar sem acento e sem maiúscula. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** "das 8h às 17h" → "Das 8h às 17h". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
