import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
} from '@angular/core';
import { AppStore } from '../../data/app.store';
import { IconComponent } from '../../ui/primitives/icon.component';

interface ClusterRow {
	readonly id: string;
	readonly label: string;
	readonly color: string;
	readonly count: number;
}

/**
 * Left-docked clusters panel. On mobile (`mobile` input true) it slides in
 * from the left over the canvas; otherwise it sits in the page layout.
 *
 * Toggling a row updates `AppStore.filterClusters`. The header "All groups"
 * row clears the filter.
 */
@Component({
	selector: 'app-clusters-panel',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [IconComponent],
	template: `
		@if (mobile()) {
			<div
				class="scrim"
				[class.open]="open()"
				(click)="dismiss.emit()"
				aria-hidden="true"
			></div>
		}

		<aside class="panel" [class.mobile]="mobile()" [class.open]="open()">
			<header>
				<span class="title">Filter network</span>
				@if (mobile()) {
					<button type="button" class="close" (click)="dismiss.emit()" aria-label="Close filter">
						<app-icon name="x" [size]="15" />
					</button>
				}
			</header>

			<div class="rows">
				<button
					type="button"
					class="row all"
					[class.active]="!hasFilter()"
					(click)="clearFilter()"
				>
					<app-icon name="layers" [size]="13" [color]="hasFilter() ? '#475569' : '#FBBF24'" />
					<span class="lbl">All groups</span>
					<span class="count">{{ totalNodes() }}</span>
				</button>

				@for (c of rows(); track c.id) {
					<button
						type="button"
						class="row"
						[class.on]="isOn(c.id)"
						[style.--accent]="c.color"
						(click)="toggle(c.id)"
					>
						<span class="dot" [style.background]="c.color"></span>
						<div class="meta">
							<span class="lbl">{{ c.label }}</span>
							<span class="count">{{ c.count }}</span>
						</div>
						<div class="bar">
							<div class="fill" [style.width.%]="barPct(c)" [style.background]="c.color"></div>
						</div>
					</button>
				}

				@if (hasFilter()) {
					<button type="button" class="clear" (click)="clearFilter()">
						Clear filter ({{ filterSize() }})
					</button>
				}
			</div>
		</aside>
	`,
	styles: [
		`
			:host {
				display: contents;
			}
			.scrim {
				position: absolute;
				inset: 0;
				z-index: 39;
				background: rgba(6, 9, 15, 0.5);
				backdrop-filter: blur(2px);
				opacity: 0;
				pointer-events: none;
				transition: opacity 280ms ease-out;
			}
			.scrim.open {
				opacity: 1;
				pointer-events: auto;
			}
			.panel {
				display: flex;
				flex-direction: column;
				background: #0b1120;
				border-right: 1px solid rgba(255, 255, 255, 0.09);
				width: 240px;
				flex-shrink: 0;
				overflow: hidden;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #94a3b8;
			}
			.panel.mobile {
				position: absolute;
				top: 0;
				left: 0;
				height: 100%;
				width: min(300px, 84%);
				z-index: 40;
				box-shadow: 12px 0 40px rgba(0, 0, 0, 0.5);
				transform: translateX(-110%);
				transition: transform 280ms ease-out;
			}
			.panel.mobile.open {
				transform: translateX(0);
			}
			header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 10px 10px 10px 14px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.05);
				flex-shrink: 0;
			}
			.title {
				font-size: 13px;
				font-weight: 600;
				color: #f1f5f9;
			}
			.close {
				background: transparent;
				border: none;
				color: #94a3b8;
				width: 28px;
				height: 28px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				border-radius: 0;
			}
			.close:hover {
				background: rgba(255, 255, 255, 0.04);
				color: #f1f5f9;
			}
			.rows {
				flex: 1;
				overflow-y: auto;
				padding: 10px 8px;
			}
			.row {
				display: grid;
				grid-template-columns: auto 1fr;
				gap: 9px;
				align-items: center;
				width: 100%;
				background: transparent;
				border: none;
				border-left: 2px solid transparent;
				border-radius: 0;
				padding: 8px 9px;
				cursor: pointer;
				color: inherit;
				text-align: left;
				margin-bottom: 2px;
				transition: background 150ms ease-out;
			}
			.row.all {
				margin-bottom: 6px;
			}
			.row:hover {
				background: rgba(255, 255, 255, 0.04);
			}
			.row.active,
			.row.on {
				background: rgba(251, 191, 36, 0.06);
				border-left-color: var(--accent, #fbbf24);
				color: #f1f5f9;
			}
			.row.on {
				background: color-mix(in srgb, var(--accent, #fbbf24) 8%, transparent);
			}
			.row .meta {
				display: flex;
				align-items: center;
				gap: 8px;
				min-width: 0;
			}
			.row .lbl {
				flex: 1;
				font-size: 12.5px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.row .count {
				font-size: 11px;
				font-family: 'JetBrains Mono', monospace;
				color: #475569;
			}
			.row .dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				flex-shrink: 0;
				box-shadow: 0 0 6px currentColor;
			}
			.row .bar {
				grid-column: 2 / 3;
				height: 3px;
				background: rgba(255, 255, 255, 0.05);
				border-radius: 0;
				overflow: hidden;
				margin-top: 4px;
			}
			.row .bar .fill {
				height: 100%;
				border-radius: 0;
				opacity: 0.5;
				transition: opacity 150ms ease-out;
			}
			.row.on .bar .fill {
				opacity: 1;
			}
			.clear {
				background: transparent;
				border: none;
				color: #fbbf24;
				cursor: pointer;
				font-family: inherit;
				font-size: 11px;
				padding: 8px 12px;
				margin-top: 4px;
			}
		`,
	],
})
export class ClustersPanelComponent {
	readonly mobile = input<boolean>(false);
	readonly open = input<boolean>(false);
	readonly dismiss = output<void>();

	private readonly store = inject(AppStore);

	protected readonly totalNodes = computed(() => this.store.nodes().length);
	protected readonly hasFilter = computed(() => this.store.filterClusters().size > 0);
	protected readonly filterSize = computed(() => this.store.filterClusters().size);

	protected readonly rows = computed<readonly ClusterRow[]>(() => {
		const counts = new Map<string, number>();
		for (const n of this.store.nodes()) {
			counts.set(n.cluster, (counts.get(n.cluster) ?? 0) + 1);
		}
		return this.store
			.clusters()
			.map<ClusterRow>((c) => ({
				id: c.id,
				label: c.label,
				color: c.color,
				count: counts.get(c.id) ?? 0,
			}))
			.sort((a, b) => b.count - a.count);
	});

	private readonly maxCount = computed(() =>
		this.rows().reduce((m, r) => Math.max(m, r.count), 1),
	);

	protected barPct(row: ClusterRow): number {
		return Math.round((row.count / this.maxCount()) * 100);
	}

	protected isOn(id: string): boolean {
		return this.store.filterClusters().has(id);
	}

	protected toggle(id: string): void {
		this.store.toggleClusterFilter(id);
	}

	protected clearFilter(): void {
		this.store.clearClusterFilter();
	}
}
