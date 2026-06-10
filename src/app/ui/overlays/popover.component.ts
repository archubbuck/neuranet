import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';

/**
 * Generic click-away popover. Renders a full-screen backdrop and a
 * floating panel positioned relative to the parent container.
 *
 * The parent must have `position: relative` for correct placement.
 */
@Component({
	selector: 'app-popover',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (open()) {
			<div class="backdrop" (click)="close.emit()"></div>
			<div class="panel" [style]="style()">
				<ng-content />
			</div>
		}
	`,
	styles: [
		`
			:host { display: contents; }
			.backdrop {
				position: fixed;
				inset: 0;
				z-index: 4000;
			}
			.panel {
				position: absolute;
				z-index: 4001;
				background: #152035;
				border: 1px solid rgba(255, 255, 255, 0.09);
				border-radius: 0;
				box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
				animation: tnPop 160ms ease-out;
			}
			@keyframes tnPop {
				from { opacity: 0; transform: scale(0.94); }
				to { opacity: 1; transform: scale(1); }
			}
		`,
	],
})
export class PopoverComponent {
	readonly open = input(false);
	readonly style = input<string>('');
	readonly close = output<void>();
}
