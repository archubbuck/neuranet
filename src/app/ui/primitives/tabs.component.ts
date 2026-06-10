import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from './icon.component';

export interface TabDef {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  /** Optional count badge rendered after the label. */
  readonly badge?: number;
}

/**
 * Underlined tab strip. Two-way bindable active tab id:
 *
 *   <app-tabs [tabs]="tabs" [(active)]="activeTab" />
 */
@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="tabs" role="tablist">
      @for (t of tabs(); track t.id) {
        <button
          class="tab"
          role="tab"
          type="button"
          [class.on]="active() === t.id"
          [attr.aria-selected]="active() === t.id"
          (click)="active.set(t.id)"
        >
          <app-icon
            [name]="t.icon"
            [size]="15"
            [color]="active() === t.id ? '#FBBF24' : 'currentColor'"
          />
          {{ t.label }}
          @if (t.badge != null && t.badge > 0) {
            <span class="tab-badge">{{ t.badge }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tabs {
        display: flex;
        gap: 2px;
        border-bottom: 1px solid var(--c-border-subtle, rgba(255, 255, 255, 0.05));
      }
      .tab {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--c-fg2, #94a3b8);
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 14px;
        cursor: pointer;
      }
      .tab:hover {
        color: var(--c-fg1, #f1f5f9);
      }
      .tab.on {
        color: var(--c-amber, #fbbf24);
        border-bottom-color: var(--c-amber, #fbbf24);
      }
      .tab-badge {
        font-size: 10.5px;
        font-family: 'JetBrains Mono', monospace;
        background: var(--c-bg-overlay, #152035);
        color: var(--c-fg2, #94a3b8);
        padding: 1px 6px;
      }
    `,
  ],
})
export class TabsComponent {
  readonly tabs = input.required<readonly TabDef[]>();
  readonly active = model.required<string>();
}
