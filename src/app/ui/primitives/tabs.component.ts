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
    <div class="flex gap-0.5 border-b border-border-subtle" role="tablist">
      @for (t of tabs(); track t.id) {
        <button
          role="tab"
          type="button"
          class="inline-flex items-center gap-[7px] bg-transparent border-none border-b-2 border-transparent text-fg-2 font-inherit text-[13px] font-semibold px-3.5 py-[10px] cursor-pointer hover:text-fg-1"
          [class.text-amber]="active() === t.id"
          [class.border-b-amber]="active() === t.id"
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
            <span class="text-[10.5px] font-mono bg-bg-overlay text-fg-2 px-1.5 py-[1px]">{{
              t.badge
            }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class TabsComponent {
  readonly tabs = input.required<readonly TabDef[]>();
  readonly active = model.required<string>();
}
