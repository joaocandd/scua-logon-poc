import { Routes } from '@angular/router';
import { confirmLeave } from './core/unsaved-changes';

// Cada página é carregada sob demanda. O `title` vira "<title> · Scua Logon" (ver PageTitleStrategy).
// As páginas do app ficam dentro da casca (menu e cabeçalho). Páginas sem menu, como o login e a
// aprovação pelo link do e-mail, entram como irmãs da casca, antes dela. A casca também vem sob
// demanda: quem abre o login não baixa menu, busca nem diálogos.
export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Entrar',
    loadComponent: () => import('./core/auth/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'entrar/esqueci-minha-senha',
    title: 'Esqueci minha senha',
    loadComponent: () =>
      import('./core/auth/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    // Página pública que o gestor abre pelo link do e-mail.
    path: 'aprovacao/:token',
    title: 'Pedido de hora extra',
    loadComponent: () =>
      import('./features/approvals/pages/approval-link-page').then((m) => m.ApprovalLinkPage),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/app-shell').then((m) => m.AppShell),
    children: [
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
        children: [
          {
            path: ':id',
            title: 'Pedido de extensão',
            loadComponent: () =>
              import('./features/approvals/pages/request-detail-page').then(
                (m) => m.RequestDetailPage,
              ),
          },
        ],
      },
      {
        path: 'regras',
        title: 'Regras de jornada',
        loadComponent: () =>
          import('./features/schedules/pages/schedules-page').then((m) => m.SchedulesPage),
      },
      {
        // Antes de regras/:id, para "nova" não virar o id de uma regra.
        path: 'regras/nova',
        title: 'Nova regra',
        canDeactivate: [confirmLeave],
        loadComponent: () =>
          import('./features/schedules/pages/schedule-editor-page').then(
            (m) => m.ScheduleEditorPage,
          ),
      },
      {
        path: 'regras/:id',
        title: 'Regra de jornada',
        canDeactivate: [confirmLeave],
        loadComponent: () =>
          import('./features/schedules/pages/schedule-editor-page').then(
            (m) => m.ScheduleEditorPage,
          ),
      },
      {
        path: 'pessoas',
        title: 'Pessoas',
        loadComponent: () =>
          import('./features/people/pages/people-page').then((m) => m.PeoplePage),
      },
      {
        path: 'relatorios',
        title: 'Relatórios',
        loadComponent: () =>
          import('./features/reports/pages/reports-page').then((m) => m.ReportsPage),
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
    ],
  },
];
