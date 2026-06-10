import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppStore } from '../data/app.store';
import { ViewportService } from '../core/viewport.service';
import { SidebarComponent } from './sidebar.component';
import { MobileNavComponent } from './mobile-nav.component';
import { ToastComponent } from '../ui/toast.component';

/**
 * Top-level shell. On wide viewports, renders the sidebar to the left of the
 * router outlet; on mobile, renders the outlet above a bottom tab bar.
 * Mirrors the prototype's `App` layout switch.
 */
@Component({
	selector: 'app-shell',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterOutlet, SidebarComponent, MobileNavComponent, ToastComponent],
	template: `
		@if (isMobile()) {
			<div class="layout mobile">
				<main class="content"><router-outlet /></main>
				<app-mobile-nav />
			</div>
		} @else {
			<div class="layout desktop">
				<app-sidebar />
				<main class="content"><router-outlet /></main>
			</div>
		}
		<app-toast />
	`,
	styles: [
		`
			:host {
				display: block;
				height: 100%;
				width: 100%;
				background: #090e1c;
				color: #f1f5f9;
			}
			.layout {
				display: flex;
				height: 100%;
				width: 100%;
			}
			.layout.desktop {
				flex-direction: row;
			}
			.layout.mobile {
				flex-direction: column;
			}
			.content {
				flex: 1 1 auto;
				min-width: 0;
				min-height: 0;
				display: flex;
				flex-direction: column;
				overflow: hidden;
			}
		`,
	],
})
export class AppShellComponent {
	private readonly viewport = inject(ViewportService);
	protected readonly isMobile = computed(() => this.viewport.state().isMobile);

	constructor() {
		// Bootstrap the global dataset once the shell mounts. Errors are
		// surfaced via the toast service from inside the store's actions; we
		// intentionally swallow the promise here so the shell can render
		// even if the backend is briefly unavailable.
		void inject(AppStore).loadAll().catch(() => {});
	}
}
