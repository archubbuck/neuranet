import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Standard button. Variants map to the design tokens; content is projected:
 *
 *   <app-button variant="primary" (pressed)="save()">Save</app-button>
 */
@Component({
	selector: 'app-button',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			class="btn"
			[class]="'btn ' + variant()"
			type="button"
			[disabled]="disabled()"
			(click)="pressed.emit()"
		>
			<ng-content />
		</button>
	`,
	styles: [
		`
			:host {
				display: inline-flex;
			}
			.btn {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 7px;
				font-family: inherit;
				font-size: 13px;
				font-weight: 600;
				padding: 8px 14px;
				border-radius: 0;
				cursor: pointer;
				border: 1px solid transparent;
			}
			.btn:disabled {
				opacity: 0.4;
				cursor: default;
			}
			.primary {
				background: var(--c-amber, #fbbf24);
				color: var(--c-fg-on-accent, #06090f);
			}
			.primary:hover:not(:disabled) {
				background: var(--c-amber-hover, #fcd34d);
			}
			.secondary {
				background: var(--c-bg-elevated, #0f1828);
				border-color: var(--c-border-def, rgba(255, 255, 255, 0.09));
				color: var(--c-fg1, #f1f5f9);
			}
			.secondary:hover:not(:disabled) {
				background: var(--c-bg-overlay, #152035);
			}
			.ghost {
				background: transparent;
				color: var(--c-fg2, #94a3b8);
			}
			.ghost:hover:not(:disabled) {
				background: var(--c-bg-hover, rgba(255, 255, 255, 0.04));
				color: var(--c-fg1, #f1f5f9);
			}
			.danger {
				background: transparent;
				border-color: var(--c-error, #fb7185);
				color: var(--c-error, #fb7185);
			}
			.danger:hover:not(:disabled) {
				background: rgba(251, 113, 133, 0.1);
			}
		`,
	],
})
export class ButtonComponent {
	readonly variant = input<ButtonVariant>('primary');
	readonly disabled = input<boolean>(false);
	readonly pressed = output<void>();
}
