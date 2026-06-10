import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../data/api.service';
import type { ReportsResponse } from '../../data/types';

interface ClusterStat {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly count: number;
  readonly pct: number;
}

/**
 * Reports screen — KPI surface backed by `GET /api/reports`, which
 * aggregates in SQL instead of scanning the full client-side store.
 */
@Component({
  selector: 'app-reports-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="root">
      <header>
        <h1>Reports</h1>
        <p>Snapshot of the current dataset.</p>
      </header>

      @if (error()) {
        <p class="empty">{{ error() }}</p>
      } @else {
        <section class="kpis">
          <div class="kpi">
            <div class="v">{{ nodeCount() }}</div>
            <div class="l">nodes</div>
          </div>
          <div class="kpi">
            <div class="v">{{ clusterCount() }}</div>
            <div class="l">clusters</div>
          </div>
          <div class="kpi">
            <div class="v">{{ edgeCount() }}</div>
            <div class="l">edges</div>
          </div>
          <div class="kpi">
            <div class="v">{{ sourceCount() }}</div>
            <div class="l">sources</div>
          </div>
          <div class="kpi">
            <div class="v">{{ docCount() }}</div>
            <div class="l">documents</div>
          </div>
        </section>

        <section class="card">
          <h2>Cluster distribution</h2>
          @if (clusterStats().length === 0) {
            <p class="empty">No clusters yet — add a source to populate.</p>
          } @else {
            <div class="rows">
              @for (c of clusterStats(); track c.id) {
                <div class="row" [style.--accent]="c.color">
                  <span class="dot" [style.background]="c.color"></span>
                  <span class="lbl">{{ c.label }}</span>
                  <div class="bar">
                    <div class="fill" [style.width.%]="c.pct" [style.background]="c.color"></div>
                  </div>
                  <span class="count">{{ c.count }}</span>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .root {
        flex: 1;
        padding: 36px 32px;
        overflow-y: auto;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        color: #94a3b8;
        max-width: 980px;
        width: 100%;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }
      header h1 {
        font-size: 22px;
        font-weight: 700;
        color: #f1f5f9;
        margin: 0 0 6px;
        letter-spacing: -0.02em;
      }
      header p {
        font-size: 13px;
        color: #475569;
        margin: 0 0 8px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        font-size: 10.5px;
        font-family: 'JetBrains Mono', monospace;
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.08);
        border: 1px solid rgba(251, 191, 36, 0.25);
        border-radius: 0;
        padding: 3px 8px;
        letter-spacing: 0.04em;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
      }
      .kpi {
        background: #0f1828;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 0;
        padding: 18px 22px;
      }
      .v {
        font-family: 'JetBrains Mono', monospace;
        font-size: 26px;
        font-weight: 600;
        color: #f1f5f9;
        letter-spacing: -0.02em;
        margin-bottom: 4px;
      }
      .l {
        font-size: 11px;
        color: #475569;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .card {
        background: #0f1828;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 0;
        padding: 22px 24px;
      }
      h2 {
        font-size: 14px;
        font-weight: 600;
        color: #f1f5f9;
        margin: 0 0 14px;
      }
      .empty {
        font-size: 13px;
        color: #475569;
        margin: 0;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .row {
        display: grid;
        grid-template-columns: auto 140px 1fr auto;
        align-items: center;
        gap: 12px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        box-shadow: 0 0 6px currentColor;
      }
      .lbl {
        font-size: 12.5px;
        color: #f1f5f9;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bar {
        height: 5px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 0;
        overflow: hidden;
      }
      .fill {
        height: 100%;
        border-radius: 0;
        opacity: 0.85;
      }
      .count {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: #94a3b8;
        min-width: 32px;
        text-align: right;
      }
    `,
  ],
})
export class ReportsScreenComponent {
  private readonly api = inject(ApiService);

  protected readonly report = signal<ReportsResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.report.set(await this.api.getReports());
      this.error.set(null);
    } catch {
      this.error.set('Failed to load reports. Is the API running?');
    }
  }

  protected readonly nodeCount = computed(() => this.report()?.totals.nodes ?? 0);
  protected readonly edgeCount = computed(() => this.report()?.totals.edges ?? 0);
  protected readonly clusterCount = computed(() => this.report()?.totals.clusters ?? 0);
  protected readonly sourceCount = computed(() => this.report()?.totals.sources ?? 0);
  protected readonly docCount = computed(() => this.report()?.totals.docs ?? 0);

  protected readonly clusterStats = computed<readonly ClusterStat[]>(() => {
    const dist = this.report()?.clusterDistribution ?? [];
    const max = Math.max(1, ...dist.map((c) => c.count));
    return dist.map<ClusterStat>((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      count: c.count,
      pct: Math.round((c.count / max) * 100),
    }));
  });
}
