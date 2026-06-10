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
    <aside class="panel" [class.open]="open()">
      @if (node(); as n) {
        <header>
          <span class="badge" [style.--accent]="clusterColor()">
            <span class="dot"></span>
            <span class="lbl">{{ clusterLabel() }}</span>
          </span>
          <div class="spacer"></div>
          <button
            type="button"
            class="icon-btn"
            (click)="store.setDetailView('full')"
            title="Expand to full view"
          >
            <app-icon name="maximize" [size]="14" />
          </button>
          <button type="button" class="icon-btn" (click)="store.selectNode(null)" title="Close">
            <app-icon name="x" [size]="15" />
          </button>
        </header>

        <div class="body">
          <div class="title-row">
            <div class="orb" [style.--accent]="clusterColor()">
              <div class="orb-spec"></div>
            </div>
            <h2>{{ n.label }}</h2>
          </div>

          @if (n.desc) {
            <p class="desc">{{ n.desc }}</p>
          }

          <div class="metrics">
            @for (m of metrics(); track m.label) {
              <div class="metric">
                <div class="m-value" [style.color]="m.color">{{ m.value }}</div>
                <div class="m-label">{{ m.label }}</div>
              </div>
            }
          </div>

          @if (connected().length > 0) {
            <div class="section-label">
              <span>Connected topics ({{ connected().length }})</span>
            </div>
            <div class="connected">
              @for (c of connected(); track c.id) {
                <button
                  type="button"
                  class="row"
                  [style.--accent]="c.color"
                  (click)="store.selectNode(c.id)"
                >
                  <span class="row-dot" [style.background]="c.color"></span>
                  <span class="row-lbl">{{ c.label }}</span>
                  <span class="row-meta">{{ c.degree }}</span>
                </button>
              }
            </div>
          }
        </div>
      }
    </aside>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .panel {
        position: absolute;
        top: 0;
        right: 0;
        height: 100%;
        width: 360px;
        max-width: 100%;
        z-index: 30;
        background: #0b1120;
        border-left: 1px solid rgba(255, 255, 255, 0.09);
        box-shadow: -12px 0 40px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        transform: translateX(110%);
        transition: transform 300ms ease-out;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        color: #94a3b8;
      }
      .panel.open {
        transform: translateX(0);
      }
      header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 14px 0;
        flex-shrink: 0;
      }
      .spacer {
        flex: 1;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 9px;
        border-radius: 0;
        background: color-mix(in srgb, var(--accent, #fbbf24) 8%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent, #fbbf24) 16%, transparent);
        color: var(--accent, #fbbf24);
        font-size: 11px;
        font-weight: 500;
      }
      .badge .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--accent, #fbbf24);
      }
      .icon-btn {
        width: 28px;
        height: 28px;
        border-radius: 0;
        background: transparent;
        border: none;
        color: #94a3b8;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #f1f5f9;
      }
      .body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 18px 28px;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-bottom: 12px;
      }
      .orb {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        flex-shrink: 0;
        position: relative;
        background: radial-gradient(
          circle at 35% 35%,
          color-mix(in srgb, var(--accent) 80%, transparent),
          color-mix(in srgb, var(--accent) 53%, transparent)
        );
        box-shadow:
          0 0 20px color-mix(in srgb, var(--accent) 31%, transparent),
          0 0 48px color-mix(in srgb, var(--accent) 10%, transparent);
      }
      .orb-spec {
        position: absolute;
        top: 8px;
        left: 9px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.25);
      }
      h2 {
        font-size: 19px;
        font-weight: 700;
        color: #f1f5f9;
        letter-spacing: -0.02em;
        line-height: 1.15;
        margin: 0;
      }
      .desc {
        font-size: 12px;
        color: #475569;
        line-height: 1.65;
        margin: 0 0 18px;
      }
      .metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 20px;
      }
      .metric {
        background: #0f1828;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 0;
        padding: 11px 13px;
      }
      .m-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin-bottom: 3px;
      }
      .m-label {
        font-size: 10px;
        color: #2a3d66;
        letter-spacing: 0.03em;
      }
      .section-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10.5px;
        font-weight: 600;
        color: #94a3b8;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin: 18px 0 9px;
      }
      .connected {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 0;
        background: #0f1828;
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: inherit;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: all 150ms ease-out;
      }
      .row:hover {
        border-color: color-mix(in srgb, var(--accent, #475569) 30%, transparent);
        background: color-mix(in srgb, var(--accent, #0f1828) 6%, #0f1828);
      }
      .row-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 6px currentColor;
      }
      .row-lbl {
        flex: 1;
        font-size: 12px;
        color: #f1f5f9;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row-meta {
        font-size: 11px;
        font-family: 'JetBrains Mono', monospace;
        color: #475569;
      }
    `,
  ],
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
