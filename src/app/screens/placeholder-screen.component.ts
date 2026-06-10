import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Generic empty-state placeholder used during Phase 1 to give every route a
 * landing surface before the real screen components are implemented. Removed
 * incrementally as Phases 2–4 ship.
 */
@Component({
	selector: 'app-placeholder-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<section>
			<h1>{{ title() }}</h1>
			<p>{{ subtitle() }}</p>
			<p class="hint">Phase 1 shell — the real screen lands in a later phase.</p>
		</section>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				align-items: center;
				justify-content: center;
				padding: 40px 24px;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #94a3b8;
			}
			section {
				max-width: 460px;
				text-align: center;
			}
			h1 {
				font-size: 22px;
				color: #f1f5f9;
				margin-bottom: 10px;
				font-weight: 600;
			}
			p {
				font-size: 13px;
				line-height: 1.6;
				margin-bottom: 6px;
			}
			.hint {
				font-size: 12px;
				color: #475569;
				margin-top: 18px;
				letter-spacing: 0.02em;
			}
		`,
	],
})
export class PlaceholderScreenComponent {
	readonly title = input<string>('Screen');
	readonly subtitle = input<string>('Coming soon.');
}
