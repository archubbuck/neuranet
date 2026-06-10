import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Standard screen header: heading + subtitle on the left, projected
 * actions (search inputs, buttons) on the right.
 *
 *   <app-page-header heading="Manage categories" subtitle="…">
 *     <app-search-input … />
 *     <app-button … />
 *   </app-page-header>
 */
@Component({
	selector: 'app-page-header',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="header-row">
			<div class="header-text">
				<h1>{{ heading() }}</h1>
				@if (subtitle()) {
					<p>{{ subtitle() }}</p>
				}
			</div>
			<div class="header-actions">
				<ng-content />
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
			}
			.header-row {
				display: flex;
				align-items: flex-start;
				justify-content: space-between;
				gap: 16px;
			}
			.header-text h1 {
				font-size: 22px;
				font-weight: 700;
				color: var(--c-fg1, #f1f5f9);
				margin: 0 0 6px;
				letter-spacing: -0.02em;
			}
			.header-text p {
				font-size: 13px;
				color: var(--c-fg3, #475569);
				margin: 0;
				max-width: 560px;
			}
			.header-actions {
				display: flex;
				align-items: center;
				gap: 10px;
				flex-shrink: 0;
			}
		`,
	],
})
export class PageHeaderComponent {
	readonly heading = input.required<string>();
	readonly subtitle = input<string>('');
}
