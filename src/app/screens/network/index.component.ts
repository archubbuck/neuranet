import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppStore } from '../../data/app.store';
import { NetworkScreenComponent } from './network-screen.component';
import { OnboardingScreenComponent } from '../onboarding/onboarding-screen.component';

/**
 * Default route component (`/`). Renders the network if data exists,
 * otherwise the onboarding empty state. The app shell handles bootstrapping
 * data via `AppStore.loadAll()` at startup.
 */
@Component({
	selector: 'app-index',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, OnboardingScreenComponent, NetworkScreenComponent],
	template: `
		@if (store.hasData()) {
			<app-network-screen />
		} @else {
			<app-onboarding-screen />
		}
	`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				min-height: 0;
			}
		`,
	],
})
export class IndexComponent {
	protected readonly store = inject(AppStore);
}
