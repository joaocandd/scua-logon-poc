import { Employee } from '../../shared/models';

// Nomes inventados. Os e-mails usam o domínio reservado .example, que nunca existe de verdade.

/** Usuária simulada até existir o login: Renata Albuquerque, diretora que aprova todos os grupos. */
export const CURRENT_USER_ID = 'col-25';
/** Quem faz a validação do RH nas fixtures: Juliana Prado. */
export const HR_VALIDATOR_ID = 'col-37';

function employee(id: string, name: string, jobTitle: string, groupId: string): Employee {
  const words = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(' ');
  return { id, name, email: `${words[0]}.${words.at(-1)}@empresa.example`, jobTitle, groupId };
}

export const EMPLOYEES: readonly Employee[] = [
  employee('col-01', 'Paulo Siqueira', 'Gerente financeiro', 'grp-financeiro'),
  employee('col-02', 'Larissa Fontes', 'Analista financeira', 'grp-financeiro'),
  employee('col-03', 'Gustavo Ramalho', 'Analista de contas a pagar', 'grp-financeiro'),
  employee('col-04', 'Patrícia Lemos', 'Assistente financeira', 'grp-financeiro'),
  employee('col-05', 'Diego Arantes', 'Analista de tesouraria', 'grp-financeiro'),
  employee('col-06', 'Aline Cardoso', 'Contadora', 'grp-financeiro'),

  employee('col-07', 'Marina Couto', 'Gerente comercial', 'grp-comercial'),
  employee('col-08', 'João Pedro Antunes', 'Executivo de contas', 'grp-comercial'),
  employee('col-09', 'Ana Ribeiro', 'Executiva de contas', 'grp-comercial'),
  employee('col-10', 'Felipe Guimarães', 'Representante comercial', 'grp-comercial'),
  employee('col-11', 'Camila Vasconcelos', 'Analista comercial', 'grp-comercial'),
  employee('col-12', 'Rodrigo Teles', 'Executivo de contas', 'grp-comercial'),
  employee('col-13', 'Beatriz Monteiro', 'Assistente comercial', 'grp-comercial'),
  employee('col-14', 'Lucas Bittencourt', 'Representante comercial', 'grp-comercial'),
  employee('col-15', 'Vanessa Queiroz', 'Analista de pós-venda', 'grp-comercial'),

  employee('col-16', 'Bianca Nogueira', 'Coordenadora de atendimento', 'grp-atendimento'),
  employee('col-17', 'Mateus Farias', 'Atendente', 'grp-atendimento'),
  employee('col-18', 'Jéssica Moura', 'Atendente', 'grp-atendimento'),
  employee('col-19', 'Igor Sampaio', 'Atendente', 'grp-atendimento'),
  employee('col-20', 'Tatiane Brito', 'Atendente', 'grp-atendimento'),
  employee('col-21', 'Renan Castilho', 'Analista de suporte ao cliente', 'grp-atendimento'),
  employee('col-22', 'Priscila Andrade', 'Atendente', 'grp-atendimento'),
  employee('col-23', 'Wellington Prates', 'Atendente', 'grp-atendimento'),
  employee('col-24', 'Daniela Rocha', 'Analista de qualidade', 'grp-atendimento'),

  employee('col-25', 'Renata Albuquerque', 'Diretora de operações', 'grp-operacoes'),
  employee('col-26', 'Carlos Teixeira', 'Supervisor de operações', 'grp-operacoes'),
  employee('col-27', 'Edson Pires', 'Operador de monitoramento', 'grp-operacoes'),
  employee('col-28', 'Fabiana Leal', 'Operadora de monitoramento', 'grp-operacoes'),
  employee('col-29', 'Márcio Dantas', 'Técnico de operações', 'grp-operacoes'),
  employee('col-30', 'Sueli Batista', 'Operadora de monitoramento', 'grp-operacoes'),
  employee('col-31', 'Rogério Viana', 'Técnico de operações', 'grp-operacoes'),

  employee('col-32', 'Thiago Moreira', 'Gerente de TI', 'grp-ti'),
  employee('col-33', 'Natália Coelho', 'Desenvolvedora', 'grp-ti'),
  employee('col-34', 'Vinícius Amaral', 'Analista de infraestrutura', 'grp-ti'),
  employee('col-35', 'Letícia Barros', 'Analista de suporte', 'grp-ti'),
  employee('col-36', 'André Seixas', 'Analista de segurança da informação', 'grp-ti'),

  employee('col-37', 'Juliana Prado', 'Gerente de RH', 'grp-rh'),
  employee('col-38', 'Fernanda Lacerda', 'Analista de RH', 'grp-rh'),
  employee('col-39', 'Ricardo Peixoto', 'Analista de departamento pessoal', 'grp-rh'),
  employee('col-40', 'Simone Tavares', 'Assistente de RH', 'grp-rh'),
];
