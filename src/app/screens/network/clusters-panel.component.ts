import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
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
        class="absolute inset-0 z-[39] bg-[rgba(6,9,15,0.5)] backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-280 ease-out"
        [class.opacity-100!]="open()"
        [class.pointer-events-auto!]="open()"
        (click)="dismiss.emit()"
        aria-hidden="true"
      ></div>
    }

    <aside
      class="flex flex-col bg-bg-surface border-r border-border-def w-[240px] shrink-0 overflow-hidden font-display text-fg-2"
      [class.absolute!]="mobile()"
      [class.top-0!]="mobile()"
      [class.left-0!]="mobile()"
      [class.h-full!]="mobile()"
      [class.w-[min(300px,84%)]!]="mobile()"
      [class.z-[40]!]="mobile()"
      [class.shadow-[12px_0_40px_rgba(0,0,0,0.5)]!]="mobile()"
      [class.-translate-x-[110%]]="mobile() && !open()"
      [class.translate-x-0]="mobile() && open()"
      [class.transition-transform]="mobile()"
      [class.duration-280]="mobile()"
      [class.ease-out]="mobile()"
    >
      <header
        class="flex items-center justify-between px-[10px_10px_10px_14px] border-b border-border-subtle shrink-0"
      >
        <span class="text-[13px] font-semibold text-fg-1">Filter network</span>
        @if (mobile()) {
          <button
            type="button"
            class="bg-transparent border-none text-fg-2 w-7 h-7 inline-flex items-center justify-center cursor-pointer hover:bg-bg-hover hover:text-fg-1"
            (click)="dismiss.emit()"
            aria-label="Close filter"
          >
            <app-icon name="x" [size]="15" />
          </button>
        }
      </header>

      <div class="flex-1 overflow-y-auto px-2 py-2.5">
        <button
          type="button"
          class="grid gap-2.5 items-center w-full bg-transparent border-none border-l-2 border-l-transparent px-2.5 py-2 cursor-pointer text-left text-inherit mb-1.5 hover:bg-bg-hover transition-colors duration-150"
          style="grid-template-columns: auto 1fr"
          [class.bg-[rgba(251,191,36,0.06)]]="!hasFilter()"
          [class.border-l-[#FBBF24]]="!hasFilter()"
          [class.text-fg-1]="!hasFilter()"
          (click)="clearFilter()"
        >
          <app-icon name="layers" [size]="13" [color]="hasFilter() ? '#475569' : '#FBBF24'" />
          <div class="flex items-center gap-2 min-w-0">
            <span class="flex-1 text-[12.5px] truncate">All groups</span>
            <span class="text-[11px] font-mono text-fg-3">{{ totalNodes() }}</span>
          </div>
        </button>

        @for (c of rows(); track c.id) {
          <button
            type="button"
            class="grid gap-2.5 items-center w-full bg-transparent border-none border-l-2 border-l-transparent px-2.5 py-2 cursor-pointer text-left text-inherit mb-0.5 hover:bg-bg-hover transition-colors duration-150"
            style="grid-template-columns: auto 1fr"
            [class.on]="isOn(c.id)"
            [style.--accent]="c.color"
            (click)="toggle(c.id)"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
              [style.background]="c.color"
            ></span>
            <div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="flex-1 text-[12.5px] truncate">{{ c.label }}</span>
                <span class="text-[11px] font-mono text-fg-3">{{ c.count }}</span>
              </div>
              <div class="h-[3px] bg-[rgba(255,255,255,0.05)] overflow-hidden mt-1">
                <div
                  class="h-full opacity-50 transition-opacity duration-150"
                  [style.width.%]="barPct(c)"
                  [style.background]="c.color"
                ></div>
              </div>
            </div>
          </button>
        }

        @if (hasFilter()) {
          <button
            type="button"
            class="bg-transparent border-none text-amber cursor-pointer font-inherit text-[11px] px-3 py-2 mt-1"
            (click)="clearFilter()"
          >
            Clear filter ({{ filterSize() }})
          </button>
        }
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: contents;
    }
    .on {
      background: color-mix(in srgb, var(--accent, #fbbf24) 8%, transparent);
      border-left-color: var(--accent, #fbbf24);
      color: #f1f5f9;
    }
    .on .opacity-50 {
      opacity: 1;
    }
  `,
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

  private readonly maxCount = computed(() => this.rows().reduce((m, r) => Math.max(m, r.count), 1));

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
