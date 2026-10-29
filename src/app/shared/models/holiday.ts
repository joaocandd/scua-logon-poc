/** Feriado: a estação fica bloqueada o dia todo, a não ser que uma exceção diga outra coisa. */
export interface Holiday {
  /** Dia, "AAAA-MM-DD". */
  date: string;
  /** Nome, como "Finados". */
  name: string;
}
