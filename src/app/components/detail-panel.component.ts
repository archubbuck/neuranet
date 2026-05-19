import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CLUSTER_DEFS, ClusterDef, TN, TopicEdge, TopicNode, clusterColor } from '../topicnet-data';

@Component({
  selector: 'app-detail-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="tn-detail" [class.open]="open">
      <ng-container *ngIf="node; else emptyState">
        <div class="tn-header">
          <div class="tn-close-row">
            <span class="tn-badge" [style.background]="color + '18'" [style.border]="'1px solid ' + color + '30'" [style.color]="color">
              <span class="tn-badge-dot" [style.background]="color"></span>
              {{ clusterLabel }}
            </span>
            <button type="button" class="tn-close-btn" (click)="close.emit()">✕</button>
          </div>
          <h2 class="tn-name">{{ node.label }}</h2>
          <p class="tn-desc">{{ node.desc }}</p>
        </div>

        <div class="tn-body">
          <div class="tn-stats-row">
            <div class="tn-stat">
              <div class="tn-stat-label">Degree</div>
              <div class="tn-stat-val">{{ node.degree }}</div>
            </div>
            <div class="tn-stat">
              <div class="tn-stat-label">Importance</div>
              <div class="tn-stat-val amber">{{ node.importance }}<span>/10</span></div>
            </div>
          </div>

          <div *ngIf="neighbours.length > 0">
            <div class="tn-section-title">Related topics</div>
            <div class="tn-chips">
              <span class="tn-chip" *ngFor="let n of neighbours" [style.background]="clusterColor(n.cluster) + '14'" [style.border]="'1px solid ' + clusterColor(n.cluster) + '28'" [style.color]="clusterColor(n.cluster) + 'ee'">
                <span class="tn-chip-dot" [style.background]="clusterColor(n.cluster)"></span>
                {{ n.label }}
              </span>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="tn-empty">
          <div class="tn-empty-icon">◎</div>
          <div class="tn-empty-text">Click any node in the network to inspect its connections and details.</div>
        </div>
      </ng-template>
    </aside>
  `,
  styles: `
    .tn-detail {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: ${TN.detW}px;
      background: ${TN.panel};
      border-left: 1px solid ${TN.border2};
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 10;
    }

    .tn-detail.open {
      transform: translateX(0);
    }

    .tn-header {
      padding: 22px 22px 18px;
      border-bottom: 1px solid ${TN.border};
    }

    .tn-close-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .tn-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .tn-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .tn-close-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid ${TN.border2};
      background: transparent;
      color: ${TN.dim};
      cursor: pointer;
    }

    .tn-name {
      font-weight: 700;
      font-size: 22px;
      color: ${TN.text};
      line-height: 1.2;
      margin: 0 0 8px;
    }

    .tn-desc {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: ${TN.mid};
    }

    .tn-body {
      padding: 18px 22px;
      flex: 1;
    }

    .tn-stats-row {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .tn-stat {
      flex: 1;
      background: ${TN.panel2};
      border: 1px solid ${TN.border};
      border-radius: 10px;
      padding: 12px 14px;
    }

    .tn-stat-label {
      font-size: 11px;
      color: ${TN.dim};
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .tn-stat-val {
      font-size: 22px;
      font-weight: 700;
      color: #7878ff;
    }

    .tn-stat-val.amber {
      color: ${TN.amber};
    }

    .tn-stat-val span {
      font-size: 13px;
      font-weight: 400;
      color: ${TN.dim};
    }

    .tn-section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: ${TN.dim};
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .tn-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tn-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
    }

    .tn-chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tn-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
    }

    .tn-empty-icon {
      font-size: 32px;
      margin-bottom: 14px;
      opacity: 0.2;
    }

    .tn-empty-text {
      font-size: 14px;
      color: ${TN.dim};
      line-height: 1.5;
    }
  `,
})
export class DetailPanelComponent {
  @Input() node: TopicNode | null = null;
  @Input() open = false;
  @Input() nodes: TopicNode[] = [];
  @Input() edges: TopicEdge[] = [];
  @Input() clusters: ClusterDef[] = CLUSTER_DEFS;
  @Output() close = new EventEmitter<void>();

  get colourSource(): TopicNode | null {
    return this.node;
  }

  get color(): string {
    return this.node ? clusterColor(this.node.cluster) : TN.amber;
  }

  get clusterLabel(): string {
    if (!this.node) {
      return '';
    }
    return this.clusters.find((cluster) => cluster.id === this.node?.cluster)?.label ?? this.node.cluster;
  }

  get neighbours(): TopicNode[] {
    if (!this.node) {
      return [];
    }

    const ids = new Set<string>();
    for (const edge of this.edges) {
      if (edge.source === this.node.id) {
        ids.add(edge.target);
      }
      if (edge.target === this.node.id) {
        ids.add(edge.source);
      }
    }
    return this.nodes.filter((candidate) => ids.has(candidate.id));
  }

  protected readonly clusterColor = clusterColor;
}
