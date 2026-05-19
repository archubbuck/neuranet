import { Routes } from '@angular/router';
import { NetworkPageComponent } from './pages/network-page.component';
import { UploadPageComponent } from './pages/upload-page.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'network' },
	{ path: 'network', component: NetworkPageComponent },
	{ path: 'upload', component: UploadPageComponent },
	{ path: '**', redirectTo: 'network' },
];
