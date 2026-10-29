import { Routes } from '@angular/router';

// Cada página é carregada sob demanda. O `title` vira "<title> · Scua Logon" (ver PageTitleStrategy).
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hoje' },
  {
    path: 'hoje',
    title: 'Hoje',
    loadComponent: () => import('./features/today/pages/today-page').then((m) => m.TodayPage),
  },
  {
    path: 'aprovacoes',
    title: 'Aprovações',
    loadComponent: () =>
      import('./features/approvals/pages/approvals-page').then((m) => m.ApprovalsPage),
  },
  {
    path: 'regras',
    title: 'Regras de jornada',
    loadComponent: () =>
      import('./features/schedules/pages/schedules-page').then((m) => m.SchedulesPage),
  },
  {
    path: 'pessoas',
    title: 'Pessoas',
    loadComponent: () => import('./features/people/pages/people-page').then((m) => m.PeoplePage),
  },
  {
    path: 'relatorios',
    title: 'Relatórios',
    loadComponent: () => import('./features/reports/pages/reports-page').then((m) => m.ReportsPage),
  },
  {
    path: 'configuracoes',
    title: 'Configurações',
    loadComponent: () =>
      import('./features/settings/pages/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: '**',
    title: 'Página não encontrada',
    loadComponent: () => import('./core/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
