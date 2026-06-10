import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * Styled checkbox with amber accent — used in management table rows
 * and bulk selection. Supports checked, unchecked, and indeterminate states.
 */
@Component({
	selector: 'app-checkbox',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [IconComponent],
	template: `
		<button
			class="box"
			type="button"
			[class.on]="checked() || indeterminate()"
			(click)="toggle.emit()"
		>
			@if (checked()) {
				<app-icon name="check" [size]="11" color="#FBBF24" [strokeWidth]="3" />
			} @else if (indeterminate()) {
				<span class="indeterminate"></span>
			}
		</button>
	`,
	styles: [
		`
			:host { display: inline-flex; flex-shrink: 0; }
			.box {
				width: 17px;
				height: 17px;
				border-radius: 0;
				flex-shrink: 0;
				cursor: pointer;
				padding: 0;
				border: 1.5px solid rgba(255, 255, 255, 0.18);
				background: transparent;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: all 120ms ease-out;
			}
			.box.on {
				border-color: rgba(251, 191, 36, 0.35);
				background: rgba(251, 191, 36, 0.12);
			}
			.indeterminate {
				width: 8px;
				height: 2px;
				background: #fbbf24;
				border-radius: 0;
			}
		`,
	],
})
export class CheckboxComponent {
	readonly checked = input(false);
	readonly indeterminate = input(false);
	readonly toggle = output<void>();
}
