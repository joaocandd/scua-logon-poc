/** Colaborador. A estação dele segue a regra de jornada que vale para o grupo. */
export interface Employee {
  id: string;
  name: string;
  email: string;
  /** Cargo, como "Analista financeira". */
  jobTitle: string;
  groupId: string;
  /**
   * Matrícula no cadastro da empresa, como "20037". Fictícia na PoC. Opcional: um cadastro
   * importado pode chegar sem ela.
   */
  registration?: string;
  /** Data de admissão, "AAAA-MM-DD". */
  hiredOn?: string;
  /** Gestor direto (Employee.id). Vazio para quem não responde a ninguém no Scua Logon. */
  managerId?: string;
}
