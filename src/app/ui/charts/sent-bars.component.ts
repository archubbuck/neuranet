import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface SentBarRow {
  readonly label: string;
  readonly value: number; // -1 to 1
  readonly color: string;
}

/**
 * Diverging sentiment bar chart matching the prototype `SentBars`.
 * Positive values extend right from center (emerald), negative extend left (rose).
 */
@Component({
  selector: 'app-sent-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length === 0) {
      <div class="text-[12.5px] text-fg-3">No data</div>
    } @else {
      <div class="flex flex-col gap-[10px]">
        @for (r of rows(); track r.label) {
          @let pos = r.value >= 0;
          @let barPct = barWidth(r.value);
          <div class="flex items-center gap-[10px]">
            <span
              class="w-[8px] h-[8px] rounded-full shrink-0"
              [style.background]="r.color"
              [style.boxShadow]="'0 0 5px ' + r.color + '80'"
            ></span>
            <span class="w-[116px] shrink-0 text-[12.5px] text-fg-2 truncate" [title]="r.label">{{
              r.label
            }}</span>
            <div class="flex-1 h-2 bg-[rgba(255,255,255,0.05)] relative">
              <div class="absolute left-1/2 top-0 w-px h-full bg-[rgba(255,255,255,0.14)]"></div>
              <div
                class="absolute top-0 h-full"
                [style.left]="pos ? '50%' : ''"
                [style.right]="pos ? '' : '50%'"
                [style.width.%]="barPct / 2"
                [style.background]="pos ? '#34D39945' : '#FB718545'"
                [style.borderRight]="pos ? '1.5px solid #34D399' : 'none'"
                [style.borderLeft]="!pos ? '1.5px solid #FB7185' : 'none'"
                [style.borderRadius]="pos ? '0 3px 3px 0' : '3px 0 0 3px'"
              ></div>
            </div>
            <span
              class="w-[46px] text-right shrink-0 font-mono text-xs"
              [style.color]="pos ? '#34D399' : '#FB7185'"
              >{{ (pos ? '+' : '−') + (r.value < 0 ? -r.value : r.value).toFixed(2) }}</span
            >
          </div>
        }
      </div>
    }
  `,
})
export class SentBarsComponent {
  readonly rows = input<readonly SentBarRow[]>([]);

  protected barWidth(value: number): number {
    return Math.min(1, Math.abs(value)) * 90;
  }
}
