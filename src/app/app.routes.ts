import type { Routes } from '@angular/router';

/**
 * App route map (flat, single-tenant), structured as layout routes:
 *
 *   - `/` renders the standalone landing experience with no app chrome
 *     and no data bootstrap.
 *   - Everything else renders inside `AppShellComponent` (sidebar +
 *     toast + responsive chrome), which kicks off `AppStore.loadAll()`
 *     when first instantiated.
 *
 * All screens are lazily loaded so the initial bundle stays minimal.
 */
export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		title: 'TopicNet',
		loadComponent: () =>
			import('./screens/landing/landing-screen.component').then((m) => m.LandingScreenComponent),
	},
	{
		path: '',
		loadComponent: () =>
			import('./shell/app-shell.component').then((m) => m.AppShellComponent),
		children: [
			{
				path: 'network',
				title: 'Network · TopicNet',
				loadComponent: () => import('./screens/network/index.component').then((m) => m.IndexComponent),
			},
			{
				path: 'categories',
				title: 'Categories · TopicNet',
				loadComponent: () =>
					import('./screens/categories/categories-screen.component').then((m) => m.CategoriesScreenComponent),
			},
			{
				path: 'topics',
				title: 'Topics · TopicNet',
				loadComponent: () =>
					import('./screens/topics/topics-screen.component').then((m) => m.TopicsScreenComponent),
			},
			{
				path: 'sources',
				title: 'Sources · TopicNet',
				loadComponent: () =>
					import('./screens/sources/sources-screen.component').then((m) => m.SourcesScreenComponent),
			},
			{
				path: 'search',
				title: 'Search · TopicNet',
				loadComponent: () =>
					import('./screens/search/search-screen.component').then((m) => m.SearchScreenComponent),
			},
			{
				path: 'reports',
				title: 'Reports · TopicNet',
				loadComponent: () =>
					import('./screens/reports/reports-screen.component').then((m) => m.ReportsScreenComponent),
			},
			{
				path: 'settings',
				title: 'Settings · TopicNet',
				loadComponent: () =>
					import('./screens/settings/settings-screen.component').then((m) => m.SettingsScreenComponent),
			},
			{ path: 'manage/clusters', redirectTo: 'categories' },
			{ path: 'manage/nodes', redirectTo: 'topics' },
			{ path: 'manage/sources', redirectTo: 'sources' },
		],
	},
	{ path: '**', redirectTo: '' },
];
