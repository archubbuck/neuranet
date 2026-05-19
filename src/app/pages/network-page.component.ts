import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DetailPanelComponent } from '../components/detail-panel.component';
import { NavbarComponent } from '../components/navbar.component';
import { NetworkCanvasComponent } from '../components/network-canvas.component';
import { SidebarComponent } from '../components/sidebar.component';
import { TN, TopicNode } from '../topicnet-data';
import { DocsApiService } from '../services/docs-api.service';

@Component({
  selector: 'app-network-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NavbarComponent, SidebarComponent, NetworkCanvasComponent, DetailPanelComponent],
  template: `
    <div class="tn-shell">
      <app-navbar
        [activeTab]="activeTab"
        [sidebarOpen]="sidebarOpen"
        [showSidebarToggle]="true"
        (tab)="onTab($event)"
        (toggleSidebar)="sidebarOpen = !sidebarOpen"
      ></app-navbar>

      <div class="tn-main">
        <app-sidebar
          *ngIf="activeTab === 'network' || activeTab === 'explore'"
          [open]="sidebarOpen"
          [activeCluster]="activeCluster"
          (clusterClick)="toggleCluster($event)"
        ></app-sidebar>

        <div class="tn-canvas-shell">
          <app-network-canvas
            [selectedNode]="selectedNode"
            [activeCluster]="activeCluster"
            [docsCount]="docsCount"
            (nodeClick)="onNodeClick($event)"
          ></app-network-canvas>

          <app-detail-panel
            *ngIf="activeTab === 'network' || activeTab === 'explore'"
            [node]="selectedNode"
            [open]="detailOpen"
            (close)="closeDetail()"
          ></app-detail-panel>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      min-width: 0;
      min-height: 0;
    }
    .tn-shell {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      width: 100%;
      height: 100%;
      background: ${TN.bg};
      overflow: hidden;
      min-width: 0;
      min-height: 0;
    }
    .tn-main {
      flex: 1 1 0%;
      display: flex;
      overflow: hidden;
      position: relative;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }
    .tn-canvas-shell {
      flex: 1 1 0%;
      display: flex;
      overflow: hidden;
      position: relative;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }
  `,
})
export class NetworkPageComponent {
  activeTab: 'network' | 'explore' | 'upload' = 'network';
  sidebarOpen = true;
  selectedNode: TopicNode | null = null;
  detailOpen = false;
  activeCluster: string | null = null;
  docsCount = 0;
  private readonly router = inject(Router);
  private readonly docsApi = inject(DocsApiService);

  constructor() {
    this.docsApi.listDocs().subscribe((docs) => {
      this.docsCount = docs.length;
    });
  }

  onTab(tab: 'network' | 'explore' | 'upload'): void {
    if (tab === 'upload') {
      this.router.navigateByUrl('/upload');
      return;
    }

    this.activeTab = tab;
    if (tab !== 'network' && tab !== 'explore') {
      this.detailOpen = false;
    }
  }

  onNodeClick(node: TopicNode | null): void {
    if (!node) {
      this.selectedNode = null;
      this.detailOpen = false;
      return;
    }

    this.selectedNode = node;
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.selectedNode = null;
    this.detailOpen = false;
  }

  toggleCluster(clusterId: string): void {
    this.activeCluster = this.activeCluster === clusterId ? null : clusterId;
  }
}
