import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import { AppStore } from '../../data/app.store';
import { ViewportService } from '../../core/viewport.service';
import { IconComponent } from '../../ui/primitives/icon.component';
import { ClustersPanelComponent } from './clusters-panel.component';
import { NetworkGraphComponent } from './network-graph.component';
import { SlideInDetailComponent } from './slide-in-detail.component';
import { StatsBarComponent } from './stats-bar.component';
import { ZoomControlsComponent } from './zoom-controls.component';

/**
 * Composition of the full network view: clusters panel + graph canvas with
 * overlays (stats, zoom, idle hint) + slide-in detail.
 *
 * Desktop: clusters panel is docked left of the canvas. Mobile: a "Filter"
 * pill toggles the panel as a drawer.
 */
@Component({
	selector: 'app-network-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		ClustersPanelComponent,
		NetworkGraphComponent,
		SlideInDetailComponent,
		StatsBarComponent,
		ZoomControlsComponent,
		IconComponent,
	],
	template: `
		<div class="screen" [class.mobile]="isMobile()">
			@if (!isMobile()) {
				<app-clusters-panel />
			}

			<div class="canvas-wrap">
				@defer {
					<app-network-graph #graph />

					@if (!selectedId()) {
						<div class="idle-hint">
							<app-icon name="circle-dot" [size]="13" color="#475569" />
							<span>Select a node to explore · scroll to zoom · drag to pan</span>
						</div>
					}

					<app-stats-bar />
					<app-zoom-controls
						(zoomIn)="graph.zoom(1.2)"
						(zoomOut)="graph.zoom(0.83)"
						(reset)="graph.resetView()"
					/>
				} @placeholder {
					<div class="graph-skeleton" aria-hidden="true"></div>
				}

				@if (isMobile()) {
					<button class="filter-pill" type="button" (click)="drawerOpen.set(true)">
						<app-icon name="layers" [size]="14" />
						<span>Filter</span>
						@if (filterCount() > 0) {
							<span class="badge">{{ filterCount() }}</span>
						}
					</button>
					<app-clusters-panel
						[mobile]="true"
						[open]="drawerOpen()"
						(dismiss)="drawerOpen.set(false)"
					/>
				}

				<app-slide-in-detail />
			</div>
		</div>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				min-height: 0;
				background: #060912;
			}
			.screen {
				display: flex;
				flex: 1;
				min-height: 0;
				position: relative;
			}
			.canvas-wrap {
				position: relative;
				flex: 1;
				min-width: 0;
				min-height: 0;
				overflow: hidden;
			}
			.graph-skeleton {
				position: absolute;
				inset: 0;
				background: #060912;
			}
			.idle-hint {
				position: absolute;
				top: 14px;
				left: 50%;
				transform: translateX(-50%);
				z-index: 4;
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 7px 14px;
				border-radius: 0;
				background: rgba(11, 17, 32, 0.7);
				border: 1px solid rgba(255, 255, 255, 0.05);
				backdrop-filter: blur(6px);
				pointer-events: none;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 12px;
				color: #475569;
			}
			.filter-pill {
				position: absolute;
				bottom: 16px;
				left: 50%;
				transform: translateX(-50%);
				z-index: 6;
				display: inline-flex;
				align-items: center;
				gap: 8px;
				padding: 8px 16px;
				border-radius: 0;
				background: rgba(11, 17, 32, 0.92);
				border: 1px solid rgba(255, 255, 255, 0.09);
				color: #f1f5f9;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 13px;
				font-weight: 500;
				cursor: pointer;
				backdrop-filter: blur(8px);
			}
			.filter-pill .badge {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				min-width: 18px;
				height: 18px;
				padding: 0 6px;
				border-radius: 0;
				background: #fbbf24;
				color: #1a1208;
				font-family: 'JetBrains Mono', monospace;
				font-size: 10.5px;
				font-weight: 600;
			}
		`,
	],
})
export class NetworkScreenComponent {
	private readonly viewport = inject(ViewportService);
	private readonly store = inject(AppStore);

	protected readonly isMobile = computed(() => this.viewport.state().isMobile);
	protected readonly selectedId = this.store.selectedNodeId;
	protected readonly filterCount = computed(() => this.store.filterClusters().size);
	protected readonly drawerOpen = signal<boolean>(false);
}
