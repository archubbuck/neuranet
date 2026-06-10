import {
	ChangeDetectionStrategy,
	Component,
	input,
} from '@angular/core';

export interface SentBarRow {
	readonly label: string;
	readonly value: number; // -1 to 1
	readonly color: string;
}

/**
 * Diverging sentiment bar chart matching the prototype `SentBars`.
 * Positive values extend right from center (emerald), negative extend left (rose).
 */
@Component({
	selector: 'app-sent-bars',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (rows().length === 0) {
			<div class="empty">No data</div>
		} @else {
			<div class="list">
				@for (r of rows(); track r.label) {
					@let pos = r.value >= 0;
					@let barPct = barWidth(r.value);
					<div class="row">
						<span class="dot" [style.background]="r.color" [style.boxShadow]="'0 0 5px ' + r.color + '80'"></span>
						<span class="label" [title]="r.label">{{ r.label }}</span>
						<div class="track">
							<div class="center-line"></div>
							<div
								class="bar"
								[style.left]="pos ? '50%' : ''"
								[style.right]="pos ? '' : '50%'"
								[style.width.%]="barPct / 2"
								[style.background]="pos ? '#34D39945' : '#FB718545'"
								[style.borderRight]="pos ? '1.5px solid #34D399' : 'none'"
								[style.borderLeft]="!pos ? '1.5px solid #FB7185' : 'none'"
								[style.borderRadius]="pos ? '0 3px 3px 0' : '3px 0 0 3px'"
							></div>
						</div>
						<span class="val" [style.color]="pos ? '#34D399' : '#FB7185'">{{ (pos ? '+' : '−') + (r.value < 0 ? -r.value : r.value).toFixed(2) }}</span>
					</div>
				}
			</div>
		}
	`,
	styles: [
		`
			.list { display: flex; flex-direction: column; gap: 10px; }
			.row { display: flex; align-items: center; gap: 10px; }
			.dot {
				width: 8px; height: 8px;
				border-radius: 50%; flex-shrink: 0;
			}
			.label {
				width: 116px; flex-shrink: 0;
				font-size: 12.5px; color: #94a3b8;
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}
			.track {
				flex: 1; height: 8px;
				background: rgba(255, 255, 255, 0.05);
				border-radius: 0; position: relative;
			}
			.center-line {
				position: absolute; left: 50%; top: 0;
				width: 1px; height: 100%;
				background: rgba(255, 255, 255, 0.14);
			}
			.bar {
				position: absolute; top: 0; height: 100%;
			}
			.val {
				width: 46px; text-align: right; flex-shrink: 0;
				font-family: 'JetBrains Mono', monospace; font-size: 12px;
			}
			.empty { font-size: 12.5px; color: #475569; }
		`,
	],
})
export class SentBarsComponent {
	readonly rows = input<readonly SentBarRow[]>([]);

	protected barWidth(value: number): number {
		return Math.min(1, Math.abs(value)) * 90;
	}
}
