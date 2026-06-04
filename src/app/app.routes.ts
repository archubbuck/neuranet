import { Routes } from '@angular/router';
import { NetworkPageComponent } from './pages/network-page.component';
import { UploadPageComponent } from './pages/upload-page.component';
import { WorkspaceListPageComponent } from './pages/workspace-list-page.component';
import { WorkspacePageComponent } from './pages/workspace-page.component';

export const routes: Routes = [
	{ path: '', component: WorkspaceListPageComponent },
	{ path: 'workspace/:id', component: WorkspacePageComponent },
	{ path: 'workspace/:id/upload', component: UploadPageComponent },
	// Legacy routes (backward compat)
	{ path: 'network', component: NetworkPageComponent },
	{ path: 'upload', component: UploadPageComponent },
	{ path: '**', redirectTo: '' },
];
