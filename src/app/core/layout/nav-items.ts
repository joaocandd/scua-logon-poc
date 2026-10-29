import { IconName } from '../../design-system';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Aparece na barra inferior do celular. As outras áreas ficam no "Mais". */
  onMobileBar: boolean;
  /** Mostra quantos pedidos de extensão aguardam aprovação. */
  showsPendingCount?: boolean;
}

/** Áreas do app, na ordem do menu. O menu lateral, a barra do celular, o "Mais" e a busca usam esta lista. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Hoje', path: '/hoje', icon: 'today', onMobileBar: true },
  {
    label: 'Aprovações',
    path: '/aprovacoes',
    icon: 'fact_check',
    onMobileBar: true,
    showsPendingCount: true,
  },
  { label: 'Pessoas', path: '/pessoas', icon: 'group', onMobileBar: false },
  { label: 'Regras de jornada', path: '/regras', icon: 'schedule', onMobileBar: false },
  { label: 'Relatórios', path: '/relatorios', icon: 'bar_chart', onMobileBar: false },
  { label: 'Configurações', path: '/configuracoes', icon: 'settings', onMobileBar: false },
];
