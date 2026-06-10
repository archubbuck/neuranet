import {
	ChangeDetectionStrategy,
	Component,
	input,
} from '@angular/core';

export interface HBarRow {
	readonly label: string;
	readonly value: number;
	readonly color: string;
}

/**
 * Ranked horizontal bar chart matching the prototype `HBarList`.
 * Each row shows a colored dot, label, proportional bar, and value.
 */
@Component({
	selector: 'app-hbar-list',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (rows().length === 0) {
			<div class="empty">{{ emptyText() }}</div>
		} @else {
			<div class="list">
				@for (r of rows(); track r.label) {
					<div class="row">
						<span class="dot" [style.background]="r.color" [style.boxShadow]="'0 0 5px ' + r.color + '80'"></span>
						<span class="label" [title]="r.label">{{ r.label }}</span>
						<div class="track">
							<div class="fill" [style.width.%]="barPct(r.value)" [style.background]="r.color" [style.boxShadow]="'0 0 8px ' + r.color + '40'"></div>
						</div>
						<span class="val">{{ formatVal(r.value) }}</span>
					</div>
				}
			</div>
		}
	`,
	styles: [
		`
			.list { display: flex; flex-direction: column; gap: 11px; }
			.row {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				flex-shrink: 0;
			}
			.label {
				flex-shrink: 0;
				font-size: 12.5px;
				color: #94a3b8;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				width: var(--hbar-label-w, 116px);
			}
			.track {
				flex: 1;
				height: 8px;
				background: rgba(255, 255, 255, 0.05);
				border-radius: 0;
				overflow: hidden;
				min-width: 24px;
			}
			.fill {
				height: 100%;
				opacity: 0.85;
				border-radius: 0;
				transition: width 400ms ease-out;
				display: block;
			}
			.val {
				width: 52px;
				text-align: right;
				flex-shrink: 0;
				font-family: 'JetBrains Mono', monospace;
				font-size: 12px;
				color: #f1f5f9;
			}
			.empty {
				font-size: 12.5px;
				color: #475569;
				padding: 6px 0;
			}
		`,
	],
})
export class HBarListComponent {
	readonly rows = input<readonly HBarRow[]>([]);
	readonly fmtFn = input<((v: number) => string) | undefined>(undefined);
	readonly labelWidth = input(116);
	readonly emptyText = input('No data');

	protected barPct(value: number): number {
		const mx = Math.max(1, ...this.rows().map((r) => r.value));
		return Math.max(2, (value / mx) * 100);
	}

	protected formatVal(value: number): string {
		const fn = this.fmtFn();
		return fn ? fn(value) : String(value);
	}
}
