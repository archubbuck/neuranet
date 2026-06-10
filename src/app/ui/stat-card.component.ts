import {
	ChangeDetectionStrategy,
	Component,
	input,
} from '@angular/core';

/**
 * Big-number stat card used in analytics dashboards.
 * Shows a large monospaced value with a smaller label below.
 */
@Component({
	selector: 'app-stat-card',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="card">
			<div class="value" [style.color]="color()">{{ value() }}</div>
			<div class="label">{{ label() }}</div>
		</div>
	`,
	styles: [
		`
			:host { display: block; min-width: 0; }
			.card {
				background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.05);
				border-radius: 0;
				padding: 14px 16px;
				min-width: 0;
			}
			.value {
				font-family: 'JetBrains Mono', monospace;
				font-size: 23px;
				font-weight: 700;
				letter-spacing: -0.02em;
				line-height: 1;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				color: #f1f5f9;
			}
			.label {
				font-size: 12px;
				color: #475569;
				margin-top: 7px;
			}
		`,
	],
})
export class StatCardComponent {
	readonly value = input('0');
	readonly label = input('');
	readonly color = input('#f1f5f9');
}
