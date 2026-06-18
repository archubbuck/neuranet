import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from '../primitives/icon.component';

/**
 * Reusable modal shell matching the prototype `MModal`.
 * Wraps content with a header (title + subtitle + close button),
 * scrollable body, and optional footer actions.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[5000] flex items-center justify-center p-5 bg-[rgba(6,9,15,0.6)] backdrop-blur-sm"
        aria-hidden="true"
        (click)="closed.emit()"
      >
        <div
          [style.width.px]="width()"
          class="w-full max-h-[86vh] flex flex-col bg-bg-surface border border-border-def overflow-hidden animate-[tnPopModal_200ms_ease-out]"
          style="max-width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.65)"
          (click)="$event.stopPropagation()"
        >
          <div
            class="flex items-start justify-between gap-3 px-[18px] py-[15px] border-b border-border-subtle"
          >
            <div>
              <h3 class="text-[15px] font-semibold text-fg-1 tracking-tight m-0">{{ title() }}</h3>
              @if (subtitle()) {
                <p class="text-xs text-fg-3 mt-[3px] mb-0">{{ subtitle() }}</p>
              }
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center shrink-0 bg-transparent border-none text-fg-2 cursor-pointer hover:bg-bg-hover hover:text-fg-1"
              type="button"
              aria-label="Close"
              (click)="closed.emit()"
            >
              <app-icon name="x" [size]="15" />
            </button>
          </div>
          <div class="p-[18px] overflow-y-auto">
            <ng-content />
          </div>
          @if (showFooter()) {
            <div class="flex justify-end gap-2 px-[18px] py-[13px] border-t border-border-subtle">
              <ng-content select="[footer]" />
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    @keyframes tnPopModal {
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
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly subtitle = input<string | undefined>(undefined);
  readonly width = input(460);
  readonly showFooter = input(true);
  /** Emitted on backdrop click, close button, or Escape. */
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
