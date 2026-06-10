import type { Routes } from '@angular/router';
import { CategoriesScreenComponent } from './screens/categories-screen.component';
import { IndexComponent } from './screens/index.component';
import { LandingScreenComponent } from './screens/landing-screen.component';
import { ReportsScreenComponent } from './screens/reports-screen.component';
import { SearchScreenComponent } from './screens/search-screen.component';
import { SettingsScreenComponent } from './screens/settings-screen.component';
import { SourcesScreenComponent } from './screens/sources-screen.component';
import { TopicsScreenComponent } from './screens/topics-screen.component';

/**
 * App route map (flat, single-tenant). All routes render inside the
 * `<router-outlet>` provided by `AppShellComponent`.
 */
export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: LandingScreenComponent },
	{ path: 'network', component: IndexComponent },
	{ path: 'categories', component: CategoriesScreenComponent },
	{ path: 'topics', component: TopicsScreenComponent },
	{ path: 'sources', component: SourcesScreenComponent },
	{ path: 'search', component: SearchScreenComponent },
	{ path: 'reports', component: ReportsScreenComponent },
	{ path: 'settings', component: SettingsScreenComponent },
	{ path: 'manage/clusters', redirectTo: 'categories' },
	{ path: 'manage/nodes', redirectTo: 'topics' },
	{ path: 'manage/sources', redirectTo: 'sources' },
	{ path: '**', redirectTo: '' },
];
