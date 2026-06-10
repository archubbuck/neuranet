import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../data/app.store';

type ManageKind = 'clusters' | 'nodes';

interface ManageRow {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly count: number | null;
	readonly accent: string;
	/** Only set for nodes — the slug of the owning cluster. */
	readonly reassignCluster?: string;
}

/**
 * Manage view for clusters / nodes / sources under
 * `/manage/{kind}`.
 *
 * For clusters and nodes (Phase 5), inline rename + delete hit the new
 * server CRUD endpoints via `AppStore`. Sources delegate deletes through
 * `AppStore.deleteSource` so the listing on the Sources screen stays in
 * sync without a refresh.
 */
@Component({
	selector: 'app-manage-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule],
	template: `
		<div class="root">
			<header>
				<h1>Manage {{ kind() }}</h1>
				<p>{{ subtitle() }}</p>
			</header>

			<input
				type="search"
				class="filter"
				[(ngModel)]="filter"
				placeholder="Filter by name…"
			/>

			@if (visibleRows().length === 0) {
				<p class="empty">No {{ kind() }} match this filter.</p>
			} @else {
				<ul class="list">
					@for (r of visibleRows(); track r.id) {
						<li class="row">
							<span class="dot" [style.background]="r.accent"></span>

							@if (editingId() === r.id) {
								<input
									class="editor"
									type="text"
									[ngModel]="editingLabel()"
									(ngModelChange)="editingLabel.set($event)"
									(keydown.enter)="commitRename(r)"
									(keydown.escape)="cancelRename()"
									autofocus
								/>
								<button class="action save" type="button" (click)="commitRename(r)">Save</button>
								<button class="action ghost" type="button" (click)="cancelRename()">Cancel</button>
							} @else {
								<div class="meta">
									<span class="title">{{ r.title }}</span>
									<span class="subtitle">{{ r.subtitle }}</span>
								</div>

								<!-- Category reassign badge (nodes only) -->
								@if (r.reassignCluster !== undefined) {
									<div class="cat-col">
										<button
											class="cat-badge"
											type="button"
											[style.borderColor]="r.accent"
											(click)="toggleReassign(r)"
										>{{ catLabel(r.reassignCluster) }}</button>
										@if (reassignOpenId() === r.id) {
											<div class="cat-dropdown">
												@for (c of store.clusters(); track c.id) {
													<button
														class="cat-option"
														type="button"
														[class.active]="c.id === r.reassignCluster"
														(click)="reassignNode(r, c.id)"
													>
														<span class="dot-sm" [style.background]="c.color"></span>
														<span>{{ c.label }}</span>
													</button>
												}
											</div>
										}
									</div>
								}

								@if (r.count !== null) {
									<span class="count">{{ r.count }}</span>
								}
								@if (canEdit()) {
									<button class="action ghost" type="button" (click)="startRename(r)">Rename</button>
									<button class="action danger" type="button" (click)="onDelete(r)">Delete</button>
								}
							}
						</li>
					}
				</ul>
			}
		</div>
	`,
	styles: [
		`
			:host { display: flex; flex: 1; min-height: 0; }
			.root {
				flex: 1; padding: 36px 32px; overflow-y: auto;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #94a3b8; max-width: 880px; width: 100%; margin: 0 auto;
			}
			header { margin-bottom: 22px; }
			h1 {
				font-size: 22px; font-weight: 700; color: #f1f5f9;
				margin: 0 0 6px; letter-spacing: -0.02em; text-transform: capitalize;
			}
			header p { font-size: 13px; color: #475569; margin: 0; }
			.filter {
				width: 100%; background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.09);
				color: #f1f5f9; border-radius: 0;
				padding: 11px 14px; font-size: 13px; font-family: inherit;
				outline: none; margin-bottom: 14px;
			}
			.filter:focus { border-color: #fbbf24; }
			.empty {
				font-size: 13px; color: #475569; padding: 32px 0; text-align: center;
			}
			.list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
			.row {
				display: grid;
				grid-template-columns: auto 1fr auto auto auto;
				gap: 12px; align-items: center;
				padding: 11px 14px; background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0;
			}
			.dot {
				width: 8px; height: 8px; border-radius: 50%;
				flex-shrink: 0; box-shadow: 0 0 6px currentColor;
			}
			.meta {
				display: flex; flex-direction: column; min-width: 0; gap: 2px;
			}
			.title {
				font-size: 13px; color: #f1f5f9;
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}
			.subtitle {
				font-size: 11px; font-family: 'JetBrains Mono', monospace;
				color: #475569;
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}
			.count {
				font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8;
			}
			.editor {
				background: #050b14;
				border: 1px solid rgba(251, 191, 36, 0.4);
				color: #f1f5f9; border-radius: 0;
				padding: 6px 10px; font-size: 13px; font-family: inherit;
				outline: none;
			}
			.action {
				background: transparent;
				border: 1px solid rgba(255, 255, 255, 0.08);
				color: #94a3b8; border-radius: 0;
				padding: 6px 10px; font-size: 11.5px; font-family: inherit;
				cursor: pointer;
			}
			.action.ghost:hover { color: #f1f5f9; border-color: rgba(255, 255, 255, 0.18); }
			.action.save {
				color: #050b14;
				background: #fbbf24; border-color: #fbbf24; font-weight: 600;
			}
			.action.save:hover { background: #f59e0b; border-color: #f59e0b; }
			.action.danger { color: #f87171; border-color: rgba(248, 113, 113, 0.25); }
			.action.danger:hover {
				color: #fecaca; border-color: #f87171; background: rgba(248, 113, 113, 0.08);
			}

			/* Category reassign badge + dropdown */
			.cat-col { position: relative; }
			.cat-badge {
				background: transparent;
				border: 1px solid; border-radius: 0;
				padding: 5px 9px; font-size: 11px; font-family: inherit;
				color: #94a3b8; cursor: pointer;
			}
			.cat-badge:hover { color: #f1f5f9; }
			.cat-dropdown {
				position: absolute; top: 100%; right: 0; z-index: 10;
				margin-top: 4px; min-width: 180px;
				background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.09);
				border-radius: 0; padding: 4px;
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
			}
			.cat-option {
				display: flex; align-items: center; gap: 8px;
				width: 100%; padding: 8px 10px;
				background: transparent; border: none; border-radius: 0;
				color: #94a3b8; font-size: 12px; font-family: inherit;
				cursor: pointer; text-align: left;
			}
			.cat-option:hover { background: rgba(255, 255, 255, 0.04); color: #f1f5f9; }
			.cat-option.active { color: #fbbf24; }
			.dot-sm { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
		`,
	],
})
export class ManageScreenComponent {
	protected readonly store = inject(AppStore);

	/** Provided by the route via `data: { kind }`. */
	readonly kind = input.required<ManageKind>();
	protected readonly filter = signal<string>('');
	protected readonly editingId = signal<string | null>(null);
	protected readonly editingLabel = signal<string>('');
	protected readonly reassignOpenId = signal<string | null>(null);

	protected readonly subtitle = computed(() => {
		switch (this.kind()) {
			case 'clusters': return 'All clusters and their member counts.';
			case 'nodes': return 'Every derived node.';
		}
	});

	protected readonly canEdit = computed(() => true);

	protected readonly clusterColorMap = computed(() => {
		const m = new Map<string, string>();
		for (const c of this.store.clusters()) m.set(c.id, c.color);
		return m;
	});

	private readonly rows = computed<readonly ManageRow[]>(() => {
		const k = this.kind();
		if (k === 'clusters') {
			const counts = new Map<string, number>();
			for (const n of this.store.nodes()) {
				counts.set(n.cluster, (counts.get(n.cluster) ?? 0) + 1);
			}
			return this.store.clusters().map<ManageRow>((c) => ({
				id: c.id,
				title: c.label,
				subtitle: c.id,
				count: counts.get(c.id) ?? 0,
				accent: c.color,
			}));
		}
		// nodes
		return this.store.nodes().map<ManageRow>((n) => ({
			id: n.id,
			title: n.label,
			subtitle: `degree ${n.degree} · importance ${n.importance}`,
			count: null,
			accent: this.clusterColorMap().get(n.cluster) ?? '#475569',
			reassignCluster: n.cluster,
		}));
	});

	protected readonly visibleRows = computed<readonly ManageRow[]>(() => {
		const f = this.filter().trim().toLowerCase();
		if (!f) return this.rows();
		return this.rows().filter(
			(r) => r.title.toLowerCase().includes(f) || r.subtitle.toLowerCase().includes(f),
		);
	});

	startRename(row: ManageRow): void {
		this.editingId.set(row.id);
		this.editingLabel.set(row.title);
	}

	cancelRename(): void {
		this.editingId.set(null);
		this.editingLabel.set('');
	}

	async commitRename(row: ManageRow): Promise<void> {
		const label = this.editingLabel().trim();
		if (!label || label === row.title) {
			this.cancelRename();
			return;
		}
		const k = this.kind();
		if (k === 'clusters') await this.store.renameCluster(row.id, label);
		else if (k === 'nodes') await this.store.renameNode(row.id, label);
		this.cancelRename();
	}

	async onDelete(row: ManageRow): Promise<void> {
		const k = this.kind();
		const what = k === 'clusters' ? 'cluster' : 'node';
		const extra = k === 'clusters' && row.count
			? ` This will also delete ${row.count} child node(s).`
			: '';
		if (!confirm(`Delete ${what} "${row.title}"?${extra}`)) return;
		if (k === 'clusters') await this.store.deleteCluster(row.id);
		else if (k === 'nodes') await this.store.deleteNode(row.id);
	}

	protected catLabel(clusterSlug: string): string {
		return this.store.clusters().find((c) => c.id === clusterSlug)?.label ?? clusterSlug;
	}

	protected toggleReassign(r: ManageRow): void {
		this.reassignOpenId.set(this.reassignOpenId() === r.id ? null : r.id);
	}

	protected async reassignNode(r: ManageRow, toSlug: string): Promise<void> {
		this.reassignOpenId.set(null);
		if (r.reassignCluster === toSlug) return;
		await this.store.reassignNode(r.id, r.title, toSlug);
	}

}
