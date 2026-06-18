import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Standard screen header: heading + subtitle on the left, projected
 * actions (search inputs, buttons) on the right.
 *
 *   <app-page-header heading="Manage categories" subtitle="…">
 *     <app-search-input … />
 *     <app-button … />
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-[22px] font-bold text-fg-1 mb-1.5 tracking-tight">{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="text-[13px] text-fg-3 m-0 max-w-[560px]">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex items-center gap-[10px] shrink-0">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
}
