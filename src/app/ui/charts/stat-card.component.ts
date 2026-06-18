import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Big-number stat card used in analytics dashboards.
 * Shows a large monospaced value with a smaller label below.
 */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-bg-elevated border border-border-subtle p-[14px_16px] min-w-0">
      <div
        class="font-mono text-[23px] font-bold tracking-tight leading-none truncate text-fg-1"
        [style.color]="color()"
      >
        {{ value() }}
      </div>
      <div class="text-xs text-fg-3 mt-[7px]">{{ label() }}</div>
    </div>
  `,
  styles: ':host { display: block; min-width: 0; }',
})
export class StatCardComponent {
  readonly value = input('0');
  readonly label = input('');
  readonly color = input('#f1f5f9');
}
