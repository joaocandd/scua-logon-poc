/** Colaborador. A estação dele segue a regra de jornada que vale para o grupo. */
export interface Employee {
  id: string;
  name: string;
  email: string;
  /** Cargo, como "Analista financeira". */
  jobTitle: string;
  groupId: string;
}
