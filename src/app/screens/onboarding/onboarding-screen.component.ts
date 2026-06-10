import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ViewChild,
	inject,
	signal,
} from '@angular/core';
import { AppStore } from '../../data/app.store';
import { IconComponent } from '../../ui/primitives/icon.component';
import { AddSourceModalComponent } from '../sources/add-source-modal.component';

/**
 * Empty-state screen shown when there are no derived nodes
 * yet. Ports the React `OnboardingScreen` (52bd8bb2-*.js) but with a smaller
 * surface area in Phase 2 — the ghost-graph animation lands in Phase 3.
 *
 * Two actions:
 *   • "Add first source" — opens the AddSourceModal (Reddit only for now).
 *   • "Explore demo data" — creates a curated Reddit source and ingests
 *     it inline. Uses an Ask-Reddit thread on data science so the layout has
 *     enough variety to be interesting.
 */
@Component({
	selector: 'app-onboarding-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, IconComponent, AddSourceModalComponent],
	template: `
		<div class="root">
			<div class="card">
				<div class="icon-wrap">
					<app-icon name="network" [size]="22" color="var(--c-amber)" />
				</div>
				<div>
					<h1>Your network is empty</h1>
					<p>
						Add a source to start populating your knowledge graph. TopicNet ingests
						Reddit threads today and grows from there.
					</p>
				</div>

				@if (errorMessage()) {
					<p class="error">{{ errorMessage() }}</p>
				}

				@if (store.ingesting()) {
					<div class="loading">
						<div class="spinner"></div>
						<span>Building demo data…</span>
					</div>
				} @else {
					<button class="primary" type="button" (click)="modal.open()">
						<app-icon name="plus" [size]="14" />
						<span>Add first source</span>
					</button>
					<button class="ghost" type="button" (click)="loadDemo()">
						or <span class="link">explore a demo dataset</span>
					</button>
				}
			</div>
		</div>

		<app-add-source-modal #modal />
	`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				min-height: 0;
			}
			.root {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 24px;
				background: var(--c-bg-base);
				font-family: var(--font-display);
			}
			.card {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 16px;
				padding: 36px;
				border-radius: 0;
				max-width: 380px;
				width: 100%;
				text-align: center;
				background: rgba(9, 14, 28, 0.86);
				border: 1px solid var(--c-border-def);
				backdrop-filter: blur(12px);
				box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
			}
			.icon-wrap {
				width: 46px;
				height: 46px;
				border-radius: 50%;
				background: var(--c-amber-dim);
				border: 1.5px solid var(--c-amber-border);
				display: flex;
				align-items: center;
				justify-content: center;
			}
			h1 {
				font-size: 18px;
				font-weight: 700;
				color: var(--c-fg-1);
				margin-bottom: 8px;
				letter-spacing: -0.02em;
			}
			p {
				font-size: 13px;
				color: var(--c-fg-3);
				line-height: 1.55;
			}
			.error {
				font-size: 12px;
				color: var(--c-rose);
				background: rgba(244, 63, 94, 0.08);
				border: 1px solid rgba(244, 63, 94, 0.25);
				padding: 8px 12px;
				border-radius: 0;
				width: 100%;
			}
			.loading {
				display: flex;
				align-items: center;
				gap: 10px;
				color: var(--c-fg-3);
				font-size: 13px;
			}
			.spinner {
				width: 14px;
				height: 14px;
				border-radius: 50%;
				border: 2px solid rgba(251, 191, 36, 0.25);
				border-top-color: var(--c-amber);
				animation: spin 800ms linear infinite;
			}
			@keyframes spin {
				to {
					transform: rotate(360deg);
				}
			}
			button {
				font-family: var(--font-display);
				cursor: pointer;
				border: none;
				border-radius: 0;
				font-size: 13px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
			}
			button.primary {
				background: var(--c-amber);
				color: #1a1208;
				font-weight: 600;
				padding: 12px 22px;
			}
			button.primary:hover {
				background: #fcd34d;
			}
			button.ghost {
				background: none;
				color: var(--c-fg-4);
				font-size: 12px;
				padding: 4px;
			}
			.link {
				color: var(--c-info);
			}
		`,
	],
})
export class OnboardingScreenComponent {
	readonly store = inject(AppStore);

	@ViewChild('modal') modal!: AddSourceModalComponent;

	readonly errorMessage = signal<string | null>(null);

	/**
	 * Seeds TopicNet with a curated public Reddit thread so the
	 * graph has interesting structure. Uses a stable r/datascience question on
	 * the field's future — no API key required.
	 */
	async loadDemo(): Promise<void> {
		const DEMO_URL =
			'https://www.reddit.com/r/datascience/comments/1d4kvw3/what_will_data_science_look_like_in_the_next_5/';
		this.errorMessage.set(null);
		const source = await this.store.addSource({
			sourceType: 'reddit',
			config: { threadUrl: DEMO_URL },
		});
		if (!source) {
			this.errorMessage.set('Could not create demo source.');
			return;
		}
		await this.store.fetchSource(source.id);
	}
}
