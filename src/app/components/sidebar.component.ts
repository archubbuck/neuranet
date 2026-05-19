import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CLUSTER_DEFS, ClusterDef, TN } from '../topicnet-data';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="tn-sidebar" [class.closed]="!open">
      <div class="tn-sidebar-inner">
        <div class="tn-cap">Clusters</div>
        <button type="button" class="tn-row" *ngFor="let cl of clusters" [class.dim]="activeCluster !== null && activeCluster !== cl.id" (click)="clusterClick.emit(cl.id)">
          <div class="tn-row-top">
            <div class="tn-row-label">
              <span class="tn-dot" [style.background]="cl.color"></span>
              {{ cl.label }}
            </div>
            <span class="tn-count">{{ cl.count }}</span>
          </div>
          <div class="tn-track">
            <div class="tn-bar" [style.background]="cl.color" [style.width.%]="(cl.count / maxCount) * 100"></div>
          </div>
        </button>
      </div>
    </aside>
  `,
  styles: `
    .tn-sidebar {
      width: ${TN.sbW}px;
      flex-shrink: 0;
      overflow: hidden;
      background: ${TN.panel};
      border-right: 1px solid ${TN.border2};
      transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }

    .tn-sidebar.closed {
      width: 0;
      border-right: none;
    }

    .tn-sidebar-inner {
      width: ${TN.sbW}px;
      padding: 22px 20px;
      flex-shrink: 0;
    }

    .tn-cap {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: ${TN.dim};
      text-transform: uppercase;
      margin-bottom: 14px;
    }

    .tn-row {
      width: 100%;
      margin-bottom: 18px;
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.15s;
      background: none;
      border: 0;
      text-align: left;
    }

    .tn-row.dim {
      opacity: 0.28;
    }

    .tn-row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .tn-row-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: ${TN.mid};
    }

    .tn-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tn-count {
      font-size: 12px;
      font-weight: 600;
      color: ${TN.dim};
      font-variant-numeric: tabular-nums;
    }

    .tn-track {
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .tn-bar {
      height: 6px;
      border-radius: 3px;
      opacity: 0.8;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
})
export class SidebarComponent {
  @Input() open = true;
  @Input() activeCluster: string | null = null;
  @Input() clusters: ClusterDef[] = CLUSTER_DEFS;

  @Output() clusterClick = new EventEmitter<string>();

  get maxCount(): number {
    const counts = this.clusters.map((cluster) => cluster.count);
    return Math.max(1, ...counts);
  }
}
