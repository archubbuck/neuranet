import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStore } from '../../data/app.store';
import { C } from '../../ui/tokens';
import { IconComponent } from '../../ui/primitives/icon.component';
import type { Node } from '../../data/types';

interface MetricCell {
  readonly label: string;
  readonly value: string;
  readonly color: string;
}

interface ConnectedRow {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly degree: number;
}

/**
 * Right-side slide-in panel that opens when a node is selected and
 * `detailView === 'slide'`. Shows real backend-available metrics
 * (cluster, sources/degree, depth, sentiment-if-present) plus the list of
 * connected nodes.
 *
 * The richer activity / sentiment-strip / timeline UI from the prototype is
 * intentionally deferred until the backend ships those fields.
 */
@Component({
  selector: 'app-slide-in-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <aside
      class="absolute top-0 right-0 h-full w-[360px] max-w-full z-30 bg-bg-surface border-l border-border-def shadow-[-12px_0_40px_rgba(0,0,0,0.4)] flex flex-col translate-x-[110%] transition-transform duration-300 ease-out font-display text-fg-2"
      [class.translate-x-0]="open()"
    >
      @if (node(); as n) {
        <header class="flex items-center gap-2 px-[14px_14px_0] shrink-0">
          <span
            class="inline-flex items-center gap-[5px] px-[3px_9px] py-0.5 text-[11px] font-medium"
            [style.--accent]="clusterColor()"
            [style.background]="'color-mix(in srgb, var(--accent, #fbbf24) 8%, transparent)'"
            [style.borderColor]="'color-mix(in srgb, var(--accent, #fbbf24) 16%, transparent)'"
            [style.border]="'1px solid'"
            [style.color]="'var(--accent, #fbbf24)'"
          >
            <span
              class="w-[5px] h-[5px] rounded-full"
              [style.background]="'var(--accent, #fbbf24)'"
            ></span>
            <span>{{ clusterLabel() }}</span>
          </span>
          <div class="flex-1"></div>
          <button
            type="button"
            class="w-7 h-7 bg-transparent border-none text-fg-2 inline-flex items-center justify-center cursor-pointer hover:bg-bg-hover hover:text-fg-1"
            (click)="store.setDetailView('full')"
            title="Expand to full view"
          >
            <app-icon name="maximize" [size]="14" />
          </button>
          <button
            type="button"
            class="w-7 h-7 bg-transparent border-none text-fg-2 inline-flex items-center justify-center cursor-pointer hover:bg-bg-hover hover:text-fg-1"
            (click)="store.selectNode(null)"
            title="Close"
          >
            <app-icon name="x" [size]="15" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-[14px_18px_28px]">
          <div class="flex items-center gap-[13px] mb-3">
            <div
              class="w-11 h-11 rounded-full shrink-0 relative"
              [style.--accent]="clusterColor()"
              [style.background]="'radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--accent) 80%, transparent), color-mix(in srgb, var(--accent) 53%, transparent))'"
              [style.boxShadow]="'0 0 20px color-mix(in srgb, var(--accent) 31%, transparent), 0 0 48px color-mix(in srgb, var(--accent) 10%, transparent)'"
            >
              <div class="absolute top-2 left-[9px] w-3.5 h-3.5 rounded-full bg-white/25"></div>
            </div>
            <h2 class="text-[19px] font-bold text-fg-1 tracking-tight leading-[1.15] m-0">
              {{ n.label }}
            </h2>
          </div>

          @if (n.desc) {
            <p class="text-xs text-fg-3 leading-relaxed mt-0 mb-[18px]">{{ n.desc }}</p>
          }

          <div class="grid grid-cols-2 gap-2 mb-5">
            @for (m of metrics(); track m.label) {
              <div class="bg-bg-elevated border border-border-subtle px-[11px_13px] py-2.5">
                <div
                  class="font-mono text-base font-semibold tracking-tight mb-[3px]"
                  [style.color]="m.color"
                >
                  {{ m.value }}
                </div>
                <div class="text-[10px] text-[#2a3d66] tracking-wide">{{ m.label }}</div>
              </div>
            }
          </div>

          @if (connected().length > 0) {
            <div
              class="flex justify-between items-center text-[10.5px] font-semibold text-fg-2 tracking-wide uppercase mt-[18px] mb-[9px]"
            >
              <span>Connected topics ({{ connected().length }})</span>
            </div>
            <div class="flex flex-col gap-[5px]">
              @for (c of connected(); track c.id) {
                <button
                  type="button"
                  class="flex items-center gap-2.5 px-[8px_10px] py-2 bg-bg-elevated border border-border-subtle text-inherit cursor-pointer text-left font-inherit transition-all duration-150 hover:[border-color:color-mix(in_srgb,var(--accent,#475569)_30%,transparent)] hover:[background:color-mix(in_srgb,var(--accent,#0f1828)_6%,#0f1828)]"
                  [style.--accent]="c.color"
                  (click)="store.selectNode(c.id)"
                >
                  <span
                    class="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                    [style.background]="c.color"
                  ></span>
                  <span class="flex-1 text-xs text-fg-1 truncate">{{ c.label }}</span>
                  <span class="text-[11px] font-mono text-fg-3">{{ c.degree }}</span>
                </button>
              }
            </div>
          }
        </div>
      }
    </aside>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class SlideInDetailComponent {
  protected readonly store = inject(AppStore);
  private readonly amber = C.amber;
  private readonly emerald = C.emerald;
  private readonly rose = C.rose;

  protected readonly node = this.store.selectedNode;

  protected readonly open = computed(
    () => this.store.detailView() === 'slide' && this.store.selectedNode() != null,
  );

  private readonly clusterMap = computed(() => {
    const m = new Map<string, { label: string; color: string }>();
    for (const c of this.store.clusters()) m.set(c.id, { label: c.label, color: c.color });
    return m;
  });

  protected clusterColor(): string {
    const n = this.node();
    if (!n) return C.fg3;
    return this.clusterMap().get(n.cluster)?.color ?? C.fg3;
  }

  protected clusterLabel(): string {
    const n = this.node();
    if (!n) return '';
    return this.clusterMap().get(n.cluster)?.label ?? n.cluster;
  }

  protected metrics = computed<readonly MetricCell[]>(() => {
    const n = this.node();
    if (!n) return [];
    const cells: MetricCell[] = [
      { label: 'Connections', value: String(n.degree), color: this.amber },
      { label: 'Importance', value: String(n.importance), color: this.clusterColor() },
      { label: 'Depth', value: String(n.depth), color: C.fg2 },
    ];
    if (typeof n.sentiment === 'number') {
      const s = n.sentiment;
      cells.push({
        label: 'Sentiment',
        value: (s >= 0 ? '+' : '−') + Math.abs(s).toFixed(2),
        color: s >= 0 ? this.emerald : this.rose,
      });
    } else {
      cells.push({
        label: 'Central',
        value: n.isCentral ? 'yes' : 'no',
        color: n.isCentral ? this.amber : C.fg2,
      });
    }
    return cells;
  });

  protected connected = computed<readonly ConnectedRow[]>(() => {
    const n = this.node();
    if (!n) return [];
    const ids = new Set<string>();
    for (const e of this.store.edges()) {
      if (e.source === n.id) ids.add(e.target);
      else if (e.target === n.id) ids.add(e.source);
    }
    if (ids.size === 0) return [];
    const byId = new Map<string, Node>();
    for (const node of this.store.nodes()) byId.set(node.id, node);
    const rows: ConnectedRow[] = [];
    for (const id of ids) {
      const target = byId.get(id);
      if (!target) continue;
      rows.push({
        id: target.id,
        label: target.label,
        color: this.clusterMap().get(target.cluster)?.color ?? C.fg3,
        degree: target.degree,
      });
    }
    return rows.sort((a, b) => b.degree - a.degree).slice(0, 12);
  });
}
