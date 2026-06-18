import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
    <div class="flex flex-1 min-h-0 relative">
      @if (!isMobile()) {
        <app-clusters-panel />
      }

      <div class="relative flex-1 min-w-0 min-h-0 overflow-hidden">
        @defer {
          <app-network-graph #graph />

          @if (!selectedId()) {
            <div
              class="absolute top-3.5 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2 px-3.5 py-1.5 bg-[rgba(11,17,32,0.7)] border border-border-subtle backdrop-blur-sm pointer-events-none font-display text-xs text-fg-3"
            >
              <app-icon name="circle-dot" [size]="13" color="#475569" />
              <span>Select a node to explore · scroll to zoom · drag to pan</span>
            </div>
          }

          <app-stats-bar />
          <app-zoom-controls
            (zoomIn)="graph.zoom(1.2)"
            (zoomOut)="graph.zoom(0.83)"
            (spreadOut)="graph.adjustSpacing(10)"
            (tightenUp)="graph.adjustSpacing(-10)"
            (resetView)="graph.resetView()"
          />
        } @placeholder {
          <div class="absolute inset-0 bg-[#060912]" aria-hidden="true"></div>
        }

        @if (isMobile()) {
          <button
            class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[6] inline-flex items-center gap-2 px-4 py-2 bg-[rgba(11,17,32,0.92)] border border-border-def text-fg-1 font-display text-[13px] font-medium cursor-pointer backdrop-blur-md"
            type="button"
            (click)="drawerOpen.set(true)"
          >
            <app-icon name="layers" [size]="14" />
            <span>Filter</span>
            @if (filterCount() > 0) {
              <span
                class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-amber text-[#1a1208] font-mono text-[10.5px] font-semibold"
                >{{ filterCount() }}</span
              >
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
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      background: #060912;
    }
  `,
})
export class NetworkScreenComponent {
  private readonly viewport = inject(ViewportService);
  private readonly store = inject(AppStore);

  protected readonly isMobile = computed(() => this.viewport.state().isMobile);
  protected readonly selectedId = this.store.selectedNodeId;
  protected readonly filterCount = computed(() => this.store.filterClusters().size);
  protected readonly drawerOpen = signal<boolean>(false);
}
