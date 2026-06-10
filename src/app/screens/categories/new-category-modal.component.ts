import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../ui/overlays/modal.component';

/**
 * "New category" modal. Self-contained form state; emits the chosen
 * label + color and lets the parent perform the store call.
 */
@Component({
	selector: 'app-new-category-modal',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [FormsModule, ModalComponent],
	template: `
		<app-modal
			[open]="open()"
			title="New category"
			subtitle="Categories drive node color. You can assign nodes after creating it."
			(closed)="closed.emit()"
		>
			<div class="field">
				<div class="field-label">Name</div>
				<input class="field-input" type="text" [ngModel]="label()" (ngModelChange)="label.set($event)"
					placeholder="e.g. Hardware &amp; chips" (keydown.enter)="submit()" />
			</div>
			<div class="field">
				<div class="field-label">Color</div>
				<div class="color-grid">
					@for (col of palette(); track col) {
						<button class="color-swatch" type="button" [attr.aria-label]="'Pick color ' + col" [style.background]="col" [class.picked]="color() === col" (click)="color.set(col)"></button>
					}
				</div>
			</div>
			<div class="preview-row">
				<span class="preview-dot" [style.background]="'radial-gradient(circle at 35% 35%, ' + color() + 'cc, ' + color() + '88)'" [style.boxShadow]="'0 0 16px ' + color() + '55'"></span>
				<div>
					<div class="preview-name">{{ label().trim() || 'New category' }}</div>
					<div class="preview-hint">preview — nodes will glow this color</div>
				</div>
			</div>
			<div footer>
				<button class="btn-ghost" type="button" (click)="closed.emit()">Cancel</button>
				<button class="btn-primary" type="button" (click)="submit()">Create category</button>
			</div>
		</app-modal>
	`,
	styles: [
		`
			.field { margin-bottom: 16px; }
			.field-label {
				font-size: 11px; font-family: 'JetBrains Mono', monospace;
				color: var(--c-fg3, #475569); letter-spacing: 0.06em;
				text-transform: uppercase; margin-bottom: 7px;
			}
			.field-input {
				width: 100%; box-sizing: border-box;
				background: var(--c-bg-elevated, #0f1828);
				border: 1px solid var(--c-border-def, rgba(255, 255, 255, 0.09));
				border-radius: 0; color: var(--c-fg1, #f1f5f9);
				font-family: inherit; font-size: 13px; padding: 9px 11px; outline: none;
			}
			.field-input:focus { border-color: var(--c-border-accent, rgba(251, 191, 36, 0.35)); }
			.color-grid { display: flex; flex-wrap: wrap; gap: 8px; }
			.color-swatch {
				width: 30px; height: 30px; border-radius: 0; cursor: pointer;
				border: 2px solid transparent;
			}
			.color-swatch.picked { border-color: var(--c-fg1, #f1f5f9); }
			.preview-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
			.preview-dot { width: 26px; height: 26px; border-radius: 999px; flex-shrink: 0; }
			.preview-name { font-size: 13px; color: var(--c-fg1, #f1f5f9); font-weight: 600; }
			.preview-hint { font-size: 11px; color: var(--c-fg3, #475569); }
			.btn-ghost {
				background: transparent; border: none; color: var(--c-fg2, #94a3b8);
				font-family: inherit; font-size: 13px; font-weight: 600;
				padding: 8px 14px; cursor: pointer; border-radius: 0;
			}
			.btn-ghost:hover { color: var(--c-fg1, #f1f5f9); }
			.btn-primary {
				background: var(--c-amber, #fbbf24); color: var(--c-fg-on-accent, #06090f);
				border: none; border-radius: 0; font-family: inherit; font-size: 13px;
				font-weight: 600; padding: 8px 16px; cursor: pointer;
			}
			.btn-primary:hover { background: var(--c-amber-hover, #fcd34d); }
			.btn-primary:disabled { opacity: 0.4; cursor: default; }
		`,
	],
})
export class NewCategoryModalComponent {
	readonly open = input.required<boolean>();
	readonly palette = input.required<readonly string[]>();
	readonly create = output<{ label: string; color: string }>();
	readonly closed = output<void>();

	protected readonly label = signal('');
	protected readonly color = signal('');

	constructor() {
		// Reset the form every time the modal opens.
		effect(() => {
			if (this.open()) {
				this.label.set('');
				this.color.set(this.palette()[0]);
			}
		});
	}

	protected submit(): void {
		const label = this.label().trim();
		if (!label) return;
		this.create.emit({ label, color: this.color() });
	}
}
