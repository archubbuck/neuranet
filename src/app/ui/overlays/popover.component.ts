import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Generic click-away popover. Renders a full-screen backdrop and a
 * floating panel positioned relative to the parent container.
 *
 * The parent must have `position: relative` for correct placement.
 */
@Component({
  selector: 'app-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[4000]" aria-hidden="true" (click)="closed.emit()"></div>
      <div
        class="absolute z-[4001] bg-bg-overlay border border-border-def animate-[tnPop_160ms_ease-out]"
        [style]="style()"
      >
        <ng-content />
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    @keyframes tnPop {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class PopoverComponent {
  readonly open = input(false);
  readonly style = input<string>('');
  /** Emitted when the user clicks outside the panel. */
  readonly closed = output<void>();
}
