import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TN, TopicDoc } from '../topicnet-data';

@Component({
  selector: 'app-upload-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tn-wrap">
      <div class="tn-card">
        <h1 class="tn-heading">Import Content</h1>
        <p class="tn-sub">Add documents to extract semantic topics and build your network.</p>

        <div class="tn-drop-zone" [class.dragging]="dragging" (dragover)="onDragOver($event)" (dragleave)="onDragLeave()" (drop)="onDrop($event)">
          <div class="tn-drop-icon">↑</div>
          <div class="tn-drop-text">Drop .txt or .md files here</div>
          <div class="tn-drop-sub">or paste text below</div>
        </div>

        <div class="tn-divider"><div class="tn-div-line"></div><span>or</span><div class="tn-div-line"></div></div>

        <div class="tn-input-group">
          <input class="tn-input" placeholder="Document title (optional)" [(ngModel)]="title" />
        </div>
        <div class="tn-input-group">
          <textarea class="tn-textarea" rows="5" placeholder="Paste your text content here..." [(ngModel)]="text"></textarea>
        </div>

        <button type="button" class="tn-add-btn" (click)="addDocument()" [disabled]="processing">
          {{ processing ? 'Processing...' : '+ Add Document' }}
        </button>

        <div class="tn-queue-wrap" *ngIf="docs.length > 0">
          <div class="tn-queue-header">
            <span>Processed</span>
            <span>{{ docs.length }} doc{{ docs.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="tn-queue-item" *ngFor="let d of docs">
            <div class="tn-queue-dot"></div>
            <div class="tn-queue-title">{{ d.title }}</div>
            <div class="tn-queue-status">✓ ready</div>
          </div>
        </div>

        <button type="button" class="tn-view-btn" *ngIf="docs.length > 0" (click)="viewNetwork.emit()">
          View Network →
        </button>
      </div>
    </div>
  `,
  styles: `
    .tn-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: ${TN.bg};
      background-image: radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      background-size: 28px 28px;
      overflow-y: auto;
    }

    .tn-card {
      width: 100%;
      max-width: 640px;
    }

    .tn-heading {
      font-size: 28px;
      font-weight: 700;
      color: ${TN.text};
      margin: 0 0 6px;
      letter-spacing: -0.5px;
    }

    .tn-sub {
      font-size: 14px;
      color: ${TN.dim};
      margin: 0 0 32px;
    }

    .tn-drop-zone {
      border: 2px dashed ${TN.border2};
      border-radius: 16px;
      padding: 40px 24px;
      text-align: center;
      margin-bottom: 20px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.02);
      transition: all 0.2s;
    }

    .tn-drop-zone.dragging {
      border-color: ${TN.amber};
      background: ${TN.amberBg};
    }

    .tn-drop-icon {
      font-size: 28px;
      margin-bottom: 10px;
      color: ${TN.dim};
    }

    .tn-drop-text {
      font-size: 14px;
      color: ${TN.mid};
      margin-bottom: 4px;
    }

    .tn-drop-sub {
      font-size: 12px;
      color: ${TN.dim};
    }

    .tn-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
      color: ${TN.dim};
      font-size: 12px;
    }

    .tn-div-line {
      flex: 1;
      height: 1px;
      background: ${TN.border};
    }

    .tn-input-group {
      margin-bottom: 10px;
    }

    .tn-input,
    .tn-textarea {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid ${TN.border2};
      background: ${TN.panel2};
      font-size: 13px;
      color: ${TN.text};
      outline: none;
      box-sizing: border-box;
    }

    .tn-textarea {
      resize: none;
    }

    .tn-add-btn {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      margin-top: 10px;
      background: ${TN.amber};
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #0b0b18;
      transition: opacity 0.15s;
    }

    .tn-add-btn:disabled {
      opacity: 0.7;
    }

    .tn-queue-wrap {
      margin-top: 24px;
      background: ${TN.panel};
      border: 1px solid ${TN.border2};
      border-radius: 14px;
      overflow: hidden;
    }

    .tn-queue-header {
      padding: 12px 18px;
      border-bottom: 1px solid ${TN.border};
      font-size: 11px;
      font-weight: 600;
      color: ${TN.dim};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tn-queue-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-bottom: 1px solid ${TN.border};
    }

    .tn-queue-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
    }

    .tn-queue-title {
      font-size: 13px;
      color: ${TN.text};
      flex: 1;
    }

    .tn-queue-status {
      font-size: 11px;
      color: #4ade80;
      font-weight: 500;
    }

    .tn-view-btn {
      display: block;
      width: 100%;
      padding: 13px;
      border-radius: 10px;
      margin-top: 16px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-size: 14px;
      font-weight: 600;
      color: ${TN.amber};
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
  `,
})
export class UploadViewComponent {
  @Input() docs: TopicDoc[] = [];
  @Output() add = new EventEmitter<TopicDoc>();
  @Output() viewNetwork = new EventEmitter<void>();

  title = '';
  text = '';
  dragging = false;
  processing = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
  }

  addDocument(): void {
    if (!this.text.trim()) {
      return;
    }

    this.processing = true;
    setTimeout(() => {
      this.add.emit({
        id: Date.now(),
        title: this.title || 'Untitled document',
        text: this.text,
        status: 'done',
      });
      this.title = '';
      this.text = '';
      this.processing = false;
    }, 800);
  }
}
