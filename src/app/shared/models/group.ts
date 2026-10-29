/** Grupo (área) de colaboradores, como Financeiro ou Atendimento. */
export interface Group {
  id: string;
  name: string;
  /** Gestores que aprovam os pedidos de extensão do grupo (Employee.id). O primeiro é o gestor da área. */
  approverIds: string[];
}
