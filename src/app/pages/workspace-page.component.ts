import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DetailPanelComponent } from '../components/detail-panel.component';
import { NavbarComponent } from '../components/navbar.component';
import { NetworkCanvasComponent } from '../components/network-canvas.component';
import { SidebarComponent } from '../components/sidebar.component';
import { SourcePanelComponent } from '../components/source-panel.component';
import {
  ClusterDef,
  DataSource,
  TN,
  TopicEdge,
  TopicNode,
  Workspace,
} from '../topicnet-data';
import { DocsApiService, CreateSourceInput } from '../services/docs-api.service';

@Component({
  selector: 'app-workspace-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    SidebarComponent,
    NetworkCanvasComponent,
    DetailPanelComponent,
    SourcePanelComponent,
  ],
  template: `
    <div class="tn-shell">
      <app-navbar
        [activeTab]="'network'"
        [sidebarOpen]="sidebarOpen"
        [showSidebarToggle]="true"
        [workspaceName]="workspace()?.name ?? ''"
        [workspaceId]="workspaceId"
        (toggleSidebar)="sidebarOpen = !sidebarOpen"
      ></app-navbar>

      <div class="tn-main">
        <app-sidebar
          [open]="sidebarOpen"
          [activeCluster]="activeCluster"
          [clusters]="clusters"
          (clusterClick)="toggleCluster($event)"
        ></app-sidebar>

        <div class="tn-canvas-shell">
          <app-network-canvas
            [selectedNode]="selectedNode"
            [activeCluster]="activeCluster"
            [docsCount]="docsCount"
            [nodes]="nodes"
            [edges]="edges"
            [clusters]="clusters"
            (nodeClick)="onNodeClick($event)"
          ></app-network-canvas>

          <app-detail-panel
            [node]="selectedNode"
            [open]="detailOpen"
            [nodes]="nodes"
            [edges]="edges"
            [clusters]="clusters"
            (close)="closeDetail()"
          ></app-detail-panel>
        </div>

        <!-- Source panel (slide-in from right when open) -->
        <div class="tn-source-panel" *ngIf="showSourcePanel">
          <app-source-panel
            [sources]="sources()"
            (addSource)="onAddSource($event)"
            (deleteSource)="onDeleteSource($event)"
          ></app-source-panel>
        </div>
      </div>

      <!-- Floating source toggle -->
      <button
        class="tn-source-toggle"
        [style.background]="TN.amber"
        [style.color]="'#000'"
        (click)="showSourcePanel = !showSourcePanel"
      >
        {{ showSourcePanel ? 'Hide Sources' : 'Data Sources' }}
      </button>
    </div>
  `,
  styles: [
    `
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
        position: relative;
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
      .tn-source-panel {
        width: 340px;
        flex-shrink: 0;
        overflow-y: auto;
        padding: 12px;
        box-sizing: border-box;
      }
      .tn-source-toggle {
        position: absolute;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        z-index: 10;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        transition: opacity 0.15s;
      }
      .tn-source-toggle:hover {
        opacity: 0.85;
      }
    `,
  ],
})
export class WorkspacePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DocsApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly TN = TN;

  protected workspaceId = 0;
  protected readonly workspace = signal<Workspace | null>(null);
  protected readonly sources = signal<DataSource[]>([]);
  protected sidebarOpen = true;
  protected showSourcePanel = false;
  protected selectedNode: TopicNode | null = null;
  protected detailOpen = false;
  protected activeCluster: string | null = null;
  protected docsCount = 0;

  protected nodes: TopicNode[] = [];
  protected edges: TopicEdge[] = [];
  protected clusters: ClusterDef[] = [];

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id) {
        this.router.navigate(['/']);
        return;
      }
      this.workspaceId = id;
      this.loadWorkspace();
      this.loadNetwork();
      this.loadSources();
    });
  }

  private loadWorkspace(): void {
    this.api.getWorkspace(this.workspaceId).subscribe({
      next: (ws) => {
        this.workspace.set(ws);
        this.cdr.markForCheck();
      },
    });
  }

  private loadNetwork(): void {
    this.api.getNetworkOverlay(this.workspaceId).subscribe((overlay) => {
      this.nodes = overlay.derivedNodes;
      this.edges = overlay.derivedEdges;
      this.clusters = overlay.derivedClusters.map((cluster) => {
        const count = overlay.derivedNodes.filter((n) => n.cluster === cluster.id).length;
        return { ...cluster, count };
      });
      this.docsCount = overlay.derivedNodes.length;
      this.cdr.markForCheck();
    });
  }

  private loadSources(): void {
    this.api.listSources(this.workspaceId).subscribe({
      next: (list) => {
        this.sources.set(list);
        this.cdr.markForCheck();
      },
    });
  }

  protected onAddSource(input: CreateSourceInput): void {
    this.api.createSource(this.workspaceId, input).subscribe({
      next: (source) => {
        this.loadSources();
        // Trigger fetch
        this.api.fetchSource(this.workspaceId, source.id).subscribe({
          next: () => {
            this.loadSources();
            this.loadNetwork();
          },
          error: () => {
            this.loadSources();
          },
        });
      },
    });
  }

  protected onDeleteSource(sourceId: number): void {
    this.api.deleteSource(this.workspaceId, sourceId).subscribe({
      next: () => {
        this.loadSources();
        this.loadNetwork();
      },
    });
  }

  protected onNodeClick(node: TopicNode | null): void {
    if (!node) {
      this.selectedNode = null;
      this.detailOpen = false;
      return;
    }
    this.selectedNode = node;
    this.detailOpen = true;
  }

  protected closeDetail(): void {
    this.selectedNode = null;
    this.detailOpen = false;
  }

  protected toggleCluster(clusterId: string): void {
    this.activeCluster = this.activeCluster === clusterId ? null : clusterId;
  }
}
