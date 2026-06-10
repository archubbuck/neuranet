import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { C } from '../tokens';

/**
 * Renders the current `ToastService.current()` value at the bottom of the
 * viewport. Slides up via CSS animation; auto-dismisses through the service.
 */
@Component({
	selector: 'app-toast',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (toast(); as t) {
			<div class="toast" [style.borderColor]="borderColor()" role="status" aria-live="polite">
				<span class="dot" [style.background]="dotColor()"></span>
				<span class="msg">{{ t.message }}</span>
			</div>
		}
	`,
	styles: [
		`
			:host {
				position: fixed;
				left: 50%;
				bottom: 28px;
				transform: translateX(-50%);
				z-index: 1000;
				pointer-events: none;
			}
			.toast {
				display: inline-flex;
				align-items: center;
				gap: 9px;
				padding: 10px 16px;
				border-radius: 0;
				background: rgba(15, 24, 40, 0.92);
				backdrop-filter: blur(8px);
				border: 1px solid rgba(255, 255, 255, 0.09);
				color: #f1f5f9;
				font-size: 13px;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
				animation: toast-rise 180ms ease-out;
			}
			.dot {
				width: 7px;
				height: 7px;
				border-radius: 50%;
				flex-shrink: 0;
			}
			@keyframes toast-rise {
				from {
					opacity: 0;
					transform: translateY(8px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
		`,
	],
})
export class ToastComponent {
	private readonly service = inject(ToastService);
	protected readonly toast = this.service.current;

	protected readonly dotColor = computed(() => {
		const t = this.toast();
		if (!t) return C.fg2;
		if (t.kind === 'success') return C.success;
		if (t.kind === 'error') return C.error;
		return C.info;
	});

	protected readonly borderColor = computed(() => {
		const t = this.toast();
		if (!t) return C.borderDef;
		if (t.kind === 'success') return 'rgba(52,211,153,0.35)';
		if (t.kind === 'error') return 'rgba(251,113,133,0.35)';
		return 'rgba(56,189,248,0.35)';
	});
}
