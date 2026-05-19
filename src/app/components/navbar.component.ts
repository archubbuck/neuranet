import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TN } from '../topicnet-data';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="tn-nav">
      <div class="tn-logo-shell">
        <div class="tn-logo-mark">◉</div>
        <span class="tn-logo-text">TopicNet</span>
      </div>

      <div class="tn-tabs">
        <button type="button" class="tn-tab" [class.active]="activeTab === 'network'" (click)="tab.emit('network')">Network</button>
        <button type="button" class="tn-tab" [class.active]="activeTab === 'explore'" (click)="tab.emit('explore')">Explore</button>
        <button type="button" class="tn-tab" [class.active]="activeTab === 'upload'" (click)="tab.emit('upload')">Upload</button>
      </div>

      <div class="tn-right">
        <button *ngIf="showSidebarToggle" type="button" class="tn-icon-btn" [class.active]="sidebarOpen" (click)="toggleSidebar.emit()">▤</button>
        <button type="button" class="tn-icon-btn" title="Settings">⚙</button>
      </div>
    </nav>
  `,
  styles: `
    .tn-nav {
      display: flex;
      align-items: stretch;
      height: ${TN.navH}px;
      background: ${TN.panel};
      border-bottom: 1px solid ${TN.border2};
      flex-shrink: 0;
      position: relative;
      z-index: 20;
    }

    .tn-logo-shell {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 20px;
      width: ${TN.sbW}px;
      flex-shrink: 0;
      border-right: 1px solid ${TN.border2};
    }

    .tn-logo-mark {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }

    .tn-logo-text {
      font-weight: 700;
      font-size: 17px;
      color: ${TN.text};
      letter-spacing: -0.3px;
    }

    .tn-tabs {
      display: flex;
      align-items: stretch;
      flex: 1;
    }

    .tn-tab {
      display: flex;
      align-items: center;
      padding: 0 22px;
      font-size: 14px;
      font-weight: 500;
      color: ${TN.mid};
      background: transparent;
      border: 0;
      border-right: 1px solid ${TN.border};
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .tn-tab.active {
      color: ${TN.amber};
      background: ${TN.amberBg};
      border-bottom-color: ${TN.amber};
    }

    .tn-tab:hover {
      opacity: 0.85;
    }

    .tn-right {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      border-left: 1px solid ${TN.border};
    }

    .tn-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid ${TN.border2};
      background: transparent;
      color: ${TN.dim};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .tn-icon-btn.active {
      background: ${TN.amberBg};
      color: ${TN.amber};
    }

    @media (max-width: 900px) {
      .tn-logo-shell {
        width: 160px;
      }

      .tn-tab {
        padding: 0 14px;
      }
    }
  `,
})
export class NavbarComponent {
  @Input() activeTab: 'network' | 'explore' | 'upload' = 'network';
  @Input() sidebarOpen = true;
  @Input() showSidebarToggle = true;

  @Output() tab = new EventEmitter<'network' | 'explore' | 'upload'>();
  @Output() toggleSidebar = new EventEmitter<void>();
}
