/** Configurações da empresa (resposta de /api/configuracoes). */
export interface Settings {
  /**
   * Custo médio de uma hora extra, em reais: salário, adicional e encargos. O painel "Hoje" usa
   * para estimar o custo das horas extras aprovadas.
   */
  overtimeHourlyCost: number;
}
