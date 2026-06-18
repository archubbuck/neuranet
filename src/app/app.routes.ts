import type { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

/**
 * App route map — two-layer architecture:
 *
 * PUBLIC group (no shell, no auth):
 *   `/`          Landing page
 *   `/login`     Sign in
 *   `/register`  Create account
 *   `/roadmap`   Product roadmap
 *   `/privacy`   Privacy policy
 *   `/terms`     Terms of service
 *
 * PROTECTED group (AppShell wrapper + authGuard):
 *   All app features — network, categories, topics, sources, search,
 *   reports, settings — render inside `AppShellComponent` (sidebar +
 *   toast + responsive chrome). The entire group is gated by
 *   `canActivate: [authGuard]`.
 *
 * All screens are lazily loaded so the initial bundle stays minimal.
 */
export const routes: Routes = [
  // ── Public market pages (no shell, no auth) ────────────────────
  {
    path: '',
    pathMatch: 'full',
    title: 'Neuranet',
    loadComponent: () =>
      import('./screens/landing/landing-screen.component').then((m) => m.LandingScreenComponent),
  },
  {
    path: 'login',
    title: 'Login · Neuranet',
    loadComponent: () =>
      import('./screens/login/login-screen.component').then((m) => m.LoginScreenComponent),
  },
  {
    path: 'register',
    title: 'Create Account · Neuranet',
    loadComponent: () =>
      import('./screens/register/register-screen.component').then((m) => m.RegisterScreenComponent),
  },
  {
    path: 'roadmap',
    title: 'Roadmap · Neuranet',
    loadComponent: () =>
      import('./screens/roadmap/roadmap-screen.component').then((m) => m.RoadmapScreenComponent),
  },
  {
    path: 'privacy',
    title: 'Privacy · Neuranet',
    loadComponent: () =>
      import('./screens/privacy/privacy-screen.component').then((m) => m.PrivacyScreenComponent),
  },
  {
    path: 'terms',
    title: 'Terms · Neuranet',
    loadComponent: () =>
      import('./screens/terms/terms-screen.component').then((m) => m.TermsScreenComponent),
  },

  // ── Protected app pages (shell + auth guard) ───────────────────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'network',
        title: 'Network · Neuranet',
        loadComponent: () =>
          import('./screens/network/index.component').then((m) => m.IndexComponent),
      },
      {
        path: 'categories',
        title: 'Categories · Neuranet',
        loadComponent: () =>
          import('./screens/categories/categories-screen.component').then(
            (m) => m.CategoriesScreenComponent,
          ),
      },
      {
        path: 'topics',
        title: 'Topics · Neuranet',
        loadComponent: () =>
          import('./screens/topics/topics-screen.component').then((m) => m.TopicsScreenComponent),
      },
      {
        path: 'sources',
        title: 'Sources · Neuranet',
        loadComponent: () =>
          import('./screens/sources/sources-screen.component').then(
            (m) => m.SourcesScreenComponent,
          ),
      },
      {
        path: 'search',
        title: 'Search · Neuranet',
        loadComponent: () =>
          import('./screens/search/search-screen.component').then((m) => m.SearchScreenComponent),
      },
      {
        path: 'reports',
        title: 'Reports · Neuranet',
        loadComponent: () =>
          import('./screens/reports/reports-screen.component').then(
            (m) => m.ReportsScreenComponent,
          ),
      },
      {
        path: 'settings',
        title: 'Settings · Neuranet',
        loadComponent: () =>
          import('./screens/settings/settings-screen.component').then(
            (m) => m.SettingsScreenComponent,
          ),
      },
      { path: 'manage/clusters', redirectTo: 'categories' },
      { path: 'manage/nodes', redirectTo: 'topics' },
      { path: 'manage/sources', redirectTo: 'sources' },
    ],
  },
  { path: '**', redirectTo: '' },
];
