import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocsApiService } from '../services/docs-api.service';
import { TN, Workspace } from '../topicnet-data';

@Component({
  selector: 'app-workspace-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="ws-list-shell" [style.background]="TN.bg" [style.color]="TN.text" [style.minHeight]="'100vh'">
      <!-- Header -->
      <header class="ws-list-header" [style.background]="TN.panel" [style.borderBottom]="'1px solid ' + TN.border">
        <h1 [style.color]="TN.text">Topic Visualizer</h1>
        <span [style.color]="TN.mid">Workspaces</span>
      </header>

      <!-- Workspace cards -->
      <div class="ws-list-body">
        <!-- Create form -->
        <div class="ws-create-card" [style.background]="TN.panel" [style.border]="'1px solid ' + TN.border">
          <button
            *ngIf="!showCreateForm"
            class="ws-create-btn"
            [style.background]="TN.amber"
            [style.color]="'#000'"
            [style.border]="'none'"
            (click)="showCreateForm = true"
          >
            + New Workspace
          </button>

          <div *ngIf="showCreateForm" class="ws-create-form">
            <input
              #nameInput
              [style.background]="TN.panel2"
              [style.color]="TN.text"
              [style.border]="'1px solid ' + TN.border2"
              placeholder="Workspace name"
              [(ngModel)]="newName"
              (keyup.enter)="createWorkspace()"
            />
            <input
              [style.background]="TN.panel2"
              [style.color]="TN.text"
              [style.border]="'1px solid ' + TN.border2"
              placeholder="Description (optional)"
              [(ngModel)]="newDescription"
              (keyup.enter)="createWorkspace()"
            />
            <div class="ws-create-actions">
              <button class="ws-create-submit" [style.background]="TN.amber" [style.color]="'#000'" (click)="createWorkspace()">
                Create
              </button>
              <button class="ws-create-cancel" [style.background]="'transparent'" [style.color]="TN.mid" (click)="showCreateForm = false">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading() && workspaces().length === 0 && !showCreateForm" class="ws-empty" [style.color]="TN.mid">
          <p>No workspaces yet.</p>
          <p>Create one to start building a topic network from your data sources.</p>
        </div>

        <!-- Cards -->
        <div class="ws-grid">
          <div
            *ngFor="let ws of workspaces()"
            class="ws-card"
            [style.background]="TN.panel"
            [style.border]="'1px solid ' + TN.border"
            (click)="openWorkspace(ws)"
          >
            <div class="ws-card-body">
              <h3 [style.color]="TN.text">{{ ws.name }}</h3>
              <p *ngIf="ws.description" [style.color]="TN.mid">{{ ws.description }}</p>
            </div>
            <div class="ws-card-footer" [style.borderTop]="'1px solid ' + TN.border">
              <span [style.color]="TN.dim">{{ ws.sourceCount ?? 0 }} data source(s)</span>
              <span [style.color]="TN.amber">Open →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ws-list-shell { display: flex; flex-direction: column; font-family: system-ui, sans-serif; }

    .ws-list-header {
      display: flex; align-items: baseline; gap: 12px;
      padding: 16px 32px;
    }
    .ws-list-header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .ws-list-header span { font-size: 14px; }

    .ws-list-body { padding: 32px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }

    .ws-create-card { padding: 20px; border-radius: 10px; margin-bottom: 24px; }

    .ws-create-btn {
      padding: 10px 24px; border-radius: 8px; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s;
    }
    .ws-create-btn:hover { opacity: 0.85; }

    .ws-create-form { display: flex; flex-direction: column; gap: 10px; }
    .ws-create-form input {
      padding: 10px 14px; border-radius: 8px; font-size: 14px; outline: none;
    }
    .ws-create-actions { display: flex; gap: 10px; }

    .ws-create-submit, .ws-create-cancel {
      padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none;
    }

    .ws-empty { text-align: center; padding: 60px 20px; font-size: 15px; line-height: 1.6; }

    .ws-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }

    .ws-card {
      border-radius: 10px; padding: 20px; cursor: pointer;
      transition: border-color 0.15s, transform 0.1s;
    }
    .ws-card:hover { border-color: rgba(245,158,11,0.4) !important; transform: translateY(-2px); }

    .ws-card-body h3 { margin: 0 0 8px 0; font-size: 17px; font-weight: 600; }
    .ws-card-body p { margin: 0; font-size: 13px; line-height: 1.4; }

    .ws-card-footer {
      margin-top: 16px; padding-top: 12px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px;
    }
  `],
})
export class WorkspaceListPageComponent {
  private readonly api = inject(DocsApiService);
  private readonly router = inject(Router);

  protected readonly TN = TN;
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly loading = signal(true);

  protected showCreateForm = false;
  protected newName = '';
  protected newDescription = '';

  constructor() {
    this.loadWorkspaces();
  }

  private loadWorkspaces(): void {
    this.loading.set(true);
    this.api.listWorkspaces().subscribe({
      next: (list) => {
        this.workspaces.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected createWorkspace(): void {
    const name = this.newName.trim();
    if (!name) return;

    this.api.createWorkspace({ name, description: this.newDescription.trim() }).subscribe({
      next: (ws) => {
        this.showCreateForm = false;
        this.newName = '';
        this.newDescription = '';
        this.loadWorkspaces();
      },
      error: () => {},
    });
  }

  protected openWorkspace(ws: Workspace): void {
    this.router.navigate(['/workspace', ws.id]);
  }
}
