import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface HBarRow {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

/**
 * Ranked horizontal bar chart matching the prototype `HBarList`.
 * Each row shows a colored dot, label, proportional bar, and value.
 */
@Component({
  selector: 'app-hbar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length === 0) {
      <div class="text-[12.5px] text-fg-3 py-1.5">{{ emptyText() }}</div>
    } @else {
      <div class="flex flex-col gap-[11px]">
        @for (r of rows(); track r.label) {
          <div class="flex items-center gap-[10px]">
            <span
              class="w-[8px] h-[8px] rounded-full shrink-0"
              [style.background]="r.color"
              [style.boxShadow]="'0 0 5px ' + r.color + '80'"
            ></span>
            <span
              class="shrink-0 text-[12.5px] text-fg-2 truncate"
              [style.width]="'var(--hbar-label-w, 116px)'"
              [title]="r.label"
              >{{ r.label }}</span
            >
            <div class="flex-1 h-2 bg-[rgba(255,255,255,0.05)] overflow-hidden min-w-[24px]">
              <div
                class="h-full opacity-85 block transition-[width] duration-400 ease-out"
                [style.width.%]="barPct(r.value)"
                [style.background]="r.color"
                [style.boxShadow]="'0 0 8px ' + r.color + '40'"
              ></div>
            </div>
            <span class="w-[52px] text-right shrink-0 font-mono text-xs text-fg-1">{{
              formatVal(r.value)
            }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class HBarListComponent {
  readonly rows = input<readonly HBarRow[]>([]);
  readonly fmtFn = input<((v: number) => string) | undefined>(undefined);
  readonly labelWidth = input(116);
  readonly emptyText = input('No data');

  protected barPct(value: number): number {
    const mx = Math.max(1, ...this.rows().map((r) => r.value));
    return Math.max(2, (value / mx) * 100);
  }

  protected formatVal(value: number): string {
    const fn = this.fmtFn();
    return fn ? fn(value) : String(value);
  }
}
