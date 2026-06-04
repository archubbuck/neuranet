import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataSource, DataSourceStatus, TN } from '../topicnet-data';

@Component({
  selector: 'app-source-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sp-shell" [style.background]="TN.panel" [style.border]="'1px solid ' + TN.border" [style.color]="TN.text">
      <div class="sp-header">
        <h3>Data Sources</h3>
        <button class="sp-add-btn" [style.background]="TN.amber" [style.color]="'#000'" (click)="showAddForm = !showAddForm">
          {{ showAddForm ? 'Cancel' : '+ Add Source' }}
        </button>
      </div>

      <!-- Add form -->
      <div *ngIf="showAddForm" class="sp-add-form">
        <label [style.color]="TN.mid">Reddit Thread URL</label>
        <input
          [style.background]="TN.panel2"
          [style.color]="TN.text"
          [style.border]="'1px solid ' + TN.border2"
          placeholder="https://www.reddit.com/r/.../comments/..."
          [(ngModel)]="redditUrl"
          (keyup.enter)="addRedditSource()"
        />
        <button
          class="sp-submit-btn"
          [style.background]="TN.amber"
          [style.color]="'#000'"
          [disabled]="!redditUrl.trim()"
          (click)="addRedditSource()"
        >
          Fetch Thread
        </button>
      </div>

      <!-- Source list -->
      <div class="sp-list">
        <div *ngIf="sources.length === 0" class="sp-empty" [style.color]="TN.dim">
          No data sources yet. Add a Reddit thread to get started.
        </div>

        <div
          *ngFor="let src of sources"
          class="sp-item"
          [style.borderBottom]="'1px solid ' + TN.border"
        >
          <div class="sp-item-left">
            <span class="sp-type-badge" [style.background]="sourceTypeColor(src.sourceType)">📌 Reddit</span>
            <span class="sp-url" [style.color]="TN.mid">{{ sourceUrlPreview(src) }}</span>
          </div>
          <div class="sp-item-right">
            <span class="sp-status" [style.color]="statusColor(src.status)">{{ statusLabel(src) }}</span>
            <button
              class="sp-delete-btn"
              [style.color]="TN.dim"
              (click)="deleteSource.emit(src.id)"
              title="Remove source"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sp-shell { border-radius: 10px; padding: 16px; font-family: system-ui, sans-serif; }

    .sp-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
    }
    .sp-header h3 { margin: 0; font-size: 15px; font-weight: 600; }

    .sp-add-btn {
      padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: opacity 0.15s;
    }
    .sp-add-btn:hover { opacity: 0.85; }

    .sp-add-form {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px; border-radius: 8px;
      margin-bottom: 12px; background: rgba(255,255,255,0.03);
    }
    .sp-add-form label { font-size: 12px; }
    .sp-add-form input {
      padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none;
    }
    .sp-submit-btn {
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; align-self: flex-start;
    }
    .sp-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .sp-submit-btn:not(:disabled):hover { opacity: 0.85; }

    .sp-list { display: flex; flex-direction: column; }

    .sp-empty { font-size: 13px; padding: 20px 0; text-align: center; }

    .sp-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; font-size: 13px;
    }
    .sp-item:last-child { border-bottom: none !important; }

    .sp-item-left { display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
    .sp-type-badge { padding: 2px 8px; border-radius: 6px; font-size: 11px; align-self: flex-start; }
    .sp-url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }

    .sp-item-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .sp-status { font-size: 12px; font-weight: 500; }

    .sp-delete-btn {
      background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 4px;
      line-height: 1; transition: color 0.15s;
    }
    .sp-delete-btn:hover { color: #ff607a !important; }
  `],
})
export class SourcePanelComponent {
  @Input() sources: DataSource[] = [];
  @Output() addSource = new EventEmitter<{ sourceType: string; config: Record<string, unknown> }>();
  @Output() deleteSource = new EventEmitter<number>();

  protected readonly TN = TN;
  protected showAddForm = false;
  protected redditUrl = '';

  protected addRedditSource(): void {
    const url = this.redditUrl.trim();
    if (!url) return;

    this.addSource.emit({ sourceType: 'reddit', config: { threadUrl: url } });
    this.redditUrl = '';
    this.showAddForm = false;
  }

  protected sourceUrlPreview(src: DataSource): string {
    if (src.sourceType === 'reddit' && (src.config as any)?.threadUrl) {
      return (src.config as any).threadUrl;
    }
    return src.sourceType;
  }

  protected sourceTypeColor(_type: string): string {
    return 'rgba(245,158,11,0.15)';
  }

  protected statusColor(status: DataSourceStatus): string {
    const map: Record<DataSourceStatus, string> = {
      pending: '#f5c842',
      fetching: '#7878ff',
      done: '#6bcb77',
      error: '#ff607a',
    };
    return map[status] ?? '#888';
  }

  protected statusLabel(src: DataSource): string {
    if (src.status === 'error' && src.statusMessage) return `Error: ${src.statusMessage}`;
    const map: Record<DataSourceStatus, string> = {
      pending: 'Pending',
      fetching: 'Fetching…',
      done: 'Done',
      error: 'Error',
    };
    return map[src.status] ?? src.status;
  }
}
