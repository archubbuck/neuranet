import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../ui/overlays/modal.component';
import { PopoverComponent } from '../../ui/overlays/popover.component';
import { CheckboxComponent } from '../../ui/primitives/checkbox.component';
import type { Cluster, Node } from '../../data/types';

/**
 * "Split category" modal: pick nodes to move into a brand-new category.
 * Emits the new category name/color and the selected node ids; the parent
 * performs the store call. At least one node must remain in the source.
 */
@Component({
	selector: 'app-split-category-modal',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [FormsModule, ModalComponent, PopoverComponent, CheckboxComponent],
	template: `
		<app-modal
			[open]="cat() !== null"
			[title]="'Split “' + (cat()?.label ?? '') + '”'"
			[width]="520"
			subtitle="Pick nodes to move into a new category. The rest stay where they are."
			(closed)="closed.emit()"
		>
			<div class="split-grid">
				<div class="field" style="flex: 1">
					<div class="field-label">New category name</div>
					<input class="field-input" type="text" [ngModel]="name()" (ngModelChange)="name.set($event)"
						placeholder="e.g. Transformers" />
				</div>
				<div class="field">
					<div class="field-label">Color</div>
					<div class="swatch-wrap">
						<button class="swatch-btn" type="button" aria-label="Pick category color" [style.background]="color()" [style.boxShadow]="'0 0 8px ' + color() + '66'" (click)="colorOpen.set(!colorOpen())"></button>
						<app-popover [open]="colorOpen()" style="top: 44px; left: 0; padding: 12px; width: max-content;" (closed)="colorOpen.set(false)">
							<div class="pop-label">Category color</div>
							<div class="color-grid">
								@for (col of palette(); track col) {
									<button class="color-swatch" type="button" [attr.aria-label]="'Pick color ' + col" [style.background]="col" [class.picked]="col === color()" (click)="color.set(col); colorOpen.set(false)"></button>
								}
							</div>
						</app-popover>
					</div>
				</div>
			</div>
			<div class="field-label">Nodes in “{{ cat()?.label ?? '' }}” ({{ members().length }})</div>
			<div class="split-node-list">
				@for (n of members(); track n.id) {
					@let on = picked().has(n.id);
					<button class="split-node" type="button" [class.picked]="on" (click)="togglePick(n.id)">
						<app-checkbox [checked]="on" (toggled)="togglePick(n.id)" />
						<span class="split-node-dot" [style.background]="on ? color() : (cat()?.color ?? '')" [style.boxShadow]="'0 0 6px ' + (on ? color() : (cat()?.color ?? '')) + '80'"></span>
						<span class="split-node-label">{{ n.label }}</span>
						<span class="split-node-meta">{{ n.desc ?? '' }}</span>
					</button>
				}
				@if (members().length === 0) {
					<div class="split-empty">No nodes in this category.</div>
				}
			</div>
			@if (picked().size >= members().length && members().length > 0) {
				<p class="split-warn">Keep at least one node in the original category.</p>
			}
			<div footer>
				<button class="btn-ghost" type="button" (click)="closed.emit()">Cancel</button>
				<button class="btn-primary" type="button" [disabled]="!canSplit()" (click)="submit()">Split {{ picked().size || '' }} node{{ picked().size === 1 ? '' : 's' }} out</button>
			</div>
		</app-modal>
	`,
	styles: [
		`
			.split-grid { display: flex; gap: 14px; margin-bottom: 14px; }
			.field { margin-bottom: 12px; }
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
			.swatch-wrap { position: relative; }
			.swatch-btn { width: 36px; height: 36px; border: none; border-radius: 0; cursor: pointer; }
			.pop-label {
				font-size: 11px; font-family: 'JetBrains Mono', monospace;
				color: var(--c-fg3, #475569); margin-bottom: 8px;
			}
			.color-grid { display: flex; flex-wrap: wrap; gap: 8px; max-width: 168px; }
			.color-swatch { width: 30px; height: 30px; border-radius: 0; cursor: pointer; border: 2px solid transparent; }
			.color-swatch.picked { border-color: var(--c-fg1, #f1f5f9); }
			.split-node-list {
				display: flex; flex-direction: column; gap: 2px; max-height: 240px;
				overflow-y: auto; border: 1px solid var(--c-border-subtle, rgba(255, 255, 255, 0.05));
				margin-top: 4px;
			}
			.split-node {
				display: flex; align-items: center; gap: 10px; background: transparent;
				border: none; padding: 8px 10px; cursor: pointer; text-align: left;
				font-family: inherit;
			}
			.split-node:hover { background: var(--c-bg-hover, rgba(255, 255, 255, 0.04)); }
			.split-node.picked { background: var(--c-bg-selected, rgba(251, 191, 36, 0.08)); }
			.split-node-dot { width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; }
			.split-node-label { font-size: 13px; color: var(--c-fg1, #f1f5f9); }
			.split-node-meta {
				font-size: 11px; color: var(--c-fg3, #475569); white-space: nowrap;
				overflow: hidden; text-overflow: ellipsis;
			}
			.split-empty { padding: 16px; font-size: 12px; color: var(--c-fg3, #475569); }
			.split-warn { font-size: 12px; color: var(--c-error, #fb7185); margin: 8px 0 0; }
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
export class SplitCategoryModalComponent {
	/** Cluster being split, or null when the modal is closed. */
	readonly cat = input.required<Cluster | null>();
	/** Nodes currently belonging to that cluster. */
	readonly members = input.required<readonly Node[]>();
	readonly palette = input.required<readonly string[]>();
	readonly split = output<{ name: string; color: string; nodeIds: string[] }>();
	readonly closed = output<void>();

	protected readonly name = signal('');
	protected readonly color = signal('');
	protected readonly colorOpen = signal(false);
	protected readonly picked = signal<Set<string>>(new Set());

	constructor() {
		// Reset form state whenever a (new) cluster is opened for splitting.
		effect(() => {
			const cat = this.cat();
			if (cat) {
				this.name.set('');
				this.picked.set(new Set());
				const alt = this.palette().find((c) => c !== cat.color) ?? this.palette()[0];
				this.color.set(alt);
			}
		});
	}

	protected readonly canSplit = computed(() => {
		const sz = this.picked().size;
		const total = this.members().length;
		return this.name().trim().length > 0 && sz > 0 && sz < total;
	});

	protected togglePick(id: string): void {
		this.picked.update((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	protected submit(): void {
		if (!this.canSplit()) return;
		this.split.emit({
			name: this.name().trim(),
			color: this.color(),
			nodeIds: [...this.picked()],
		});
	}
}
