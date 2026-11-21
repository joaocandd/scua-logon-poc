// Todas as rotas do app, com os estados simulados (?simular=) das telas principais. A varredura do
// axe (accessibility.spec.ts) e a do console (console.spec.ts) percorrem esta mesma lista.

export interface Screen {
  url: string;
  /** Título que mostra a tela pronta: o <h1> ou o título do estado (vazio, erro, sem permissão). */
  ready: string;
  /** Estado de carregamento (?simular=lento): o axe roda antes de os dados chegarem. */
  loading?: boolean;
}

export const screens: Screen[] = [
  // Fora da casca do app
  { url: '/entrar', ready: 'Entrar' },
  { url: '/entrar/esqueci-minha-senha', ready: 'Esqueci minha senha' },
  { url: '/aprovacao/valido-ped-02', ready: 'Pedido de Lucas Bittencourt' },
  { url: '/aprovacao/valido-ped-04', ready: 'Pedido de Mateus Farias' },
  { url: '/aprovacao/expirado-ped-22', ready: 'Link expirado' },
  { url: '/aprovacao/usado-ped-13', ready: 'Pedido já decidido' },
  { url: '/aprovacao/qualquer-outro', ready: 'Link inválido' },
  { url: '/aprovacao/valido-ped-02?simular=erro', ready: 'Não conseguimos abrir o pedido' },
  { url: '/aprovacao/valido-ped-02?simular=lento', ready: 'Pedido de hora extra', loading: true },

  // Hoje e as áreas fora do escopo da PoC (a casca muda com a API fora do ar ou lenta)
  { url: '/hoje', ready: 'Hoje' },
  { url: '/hoje?simular=erro', ready: 'Hoje' },
  { url: '/hoje?simular=vazio', ready: 'Hoje' },
  { url: '/hoje?simular=lento', ready: 'Hoje', loading: true },
  // Relógio de demonstração: a faixa no topo, numa terça às 17h40.
  { url: '/hoje?relogio=2026-11-24T17:40', ready: 'Hoje' },
  { url: '/entrar?relogio=2026-11-24T17:40', ready: 'Entrar' },
  { url: '/configuracoes', ready: 'Configurações' },
  { url: '/ajuda', ready: 'Ajuda' },
  { url: '/endereco-que-nao-existe', ready: 'Página não encontrada' },

  // Fluxo A: caixa de aprovações
  { url: '/aprovacoes', ready: 'Aprovações' },
  { url: '/aprovacoes?filtro=decididos-hoje', ready: 'Aprovações' },
  { url: '/aprovacoes?demo=ao-vivo', ready: 'Aprovações' },
  { url: '/aprovacoes?simular=erro', ready: 'Não conseguimos carregar os pedidos' },
  { url: '/aprovacoes?simular=vazio', ready: 'Nenhum pedido aguardando' },
  { url: '/aprovacoes?simular=lento', ready: 'Aprovações', loading: true },
  { url: '/aprovacoes?simular=sem-permissao', ready: 'Você não tem acesso às aprovações' },
  { url: '/aprovacoes/ped-02', ready: 'Lucas Bittencourt' },
  { url: '/aprovacoes/ped-02?simular=erro', ready: 'Não conseguimos carregar os pedidos' },
  { url: '/aprovacoes/ped-02?simular=lento', ready: 'Aprovações', loading: true },
  { url: '/aprovacoes/nao-existe', ready: 'Não encontramos este pedido' },

  // Fluxo B: regras de jornada
  { url: '/regras', ready: 'Regras de jornada' },
  { url: '/regras?simular=erro', ready: 'Não conseguimos carregar as regras' },
  { url: '/regras?simular=vazio', ready: 'Nenhuma regra de jornada' },
  { url: '/regras?simular=lento', ready: 'Regras de jornada', loading: true },
  { url: '/regras?simular=sem-permissao', ready: 'Você não tem acesso às regras de jornada' },
  { url: '/regras/regra-comercial', ready: 'Comercial' },
  { url: '/regras/regra-noturna', ready: 'Noturna' },
  { url: '/regras/regra-fechamento', ready: 'Fechamento do mês' },
  { url: '/regras/regra-comercial?simular=erro', ready: 'Não conseguimos carregar a regra' },
  { url: '/regras/regra-comercial?simular=vazio', ready: 'Regra não encontrada' },
  { url: '/regras/regra-comercial?simular=lento', ready: 'Regra de jornada', loading: true },
  {
    url: '/regras/regra-comercial?simular=sem-permissao',
    ready: 'Você não tem acesso às regras de jornada',
  },
  { url: '/regras/nova', ready: 'Nova regra' },
  { url: '/regras/nao-existe', ready: 'Regra não encontrada' },

  // Estações
  { url: '/estacoes', ready: 'Estações' },
  { url: '/estacoes?estado=sem_aprovacao', ready: 'Estações' },
  { url: '/estacoes?busca=xyz', ready: 'Nenhuma estação encontrada' },
  { url: '/estacoes?simular=erro', ready: 'Não conseguimos carregar as estações' },
  { url: '/estacoes?simular=vazio', ready: 'Nenhuma estação controlada' },
  { url: '/estacoes?simular=lento', ready: 'Estações', loading: true },
  { url: '/estacoes?simular=sem-permissao', ready: 'Você não tem acesso às estações' },

  // Pessoas
  { url: '/pessoas', ready: 'Pessoas' },
  { url: '/pessoas?grupo=grp-ti&estado=em_jornada', ready: 'Pessoas' },
  { url: '/pessoas?busca=xyz', ready: 'Nenhum colaborador encontrado' },
  { url: '/pessoas/col-08', ready: 'João Pedro Antunes' },
  { url: '/pessoas/col-25', ready: 'Renata Albuquerque' },
  { url: '/pessoas/nao-existe', ready: 'Não encontramos este colaborador' },
  { url: '/pessoas/col-08?simular=erro', ready: 'Não conseguimos carregar os colaboradores' },
  { url: '/pessoas?simular=erro', ready: 'Não conseguimos carregar os colaboradores' },
  { url: '/pessoas?simular=vazio', ready: 'Nenhum colaborador cadastrado' },
  { url: '/pessoas?simular=lento', ready: 'Pessoas', loading: true },
  { url: '/pessoas?simular=sem-permissao', ready: 'Você não tem acesso aos colaboradores' },
  { url: '/pessoas/grupos', ready: 'Atendimento' },
  { url: '/pessoas/grupos?simular=erro', ready: 'Não conseguimos carregar os grupos' },
  { url: '/pessoas/grupos?simular=vazio', ready: 'Nenhum grupo cadastrado' },
  { url: '/pessoas/grupos?simular=lento', ready: 'Pessoas', loading: true },
  { url: '/pessoas/grupos?simular=sem-permissao', ready: 'Você não tem acesso aos grupos' },

  // Relatórios
  { url: '/relatorios', ready: 'Horas extras' },
  { url: '/relatorios?periodo=7&grupo=grp-atendimento', ready: 'Horas extras' },
  { url: '/relatorios?simular=erro', ready: 'Não conseguimos carregar os relatórios' },
  { url: '/relatorios?simular=vazio', ready: 'Nenhum dado no período' },
  { url: '/relatorios?simular=lento', ready: 'Relatórios', loading: true },
  { url: '/relatorios?simular=sem-permissao', ready: 'Você não tem acesso aos relatórios' },

  // Auditoria
  { url: '/relatorios/auditoria', ready: 'Auditoria' },
  { url: '/relatorios/auditoria?tipo=acessos&periodo=7', ready: 'Auditoria' },
  { url: '/relatorios/auditoria?periodo=hoje&tipo=desfazer', ready: 'Nenhum evento encontrado' },
  { url: '/relatorios/auditoria?simular=erro', ready: 'Não conseguimos carregar o registro' },
  { url: '/relatorios/auditoria?simular=vazio', ready: 'Nenhum evento registrado' },
  { url: '/relatorios/auditoria?simular=lento', ready: 'Auditoria', loading: true },
  {
    url: '/relatorios/auditoria?simular=sem-permissao',
    ready: 'Você não tem acesso à auditoria',
  },
];
