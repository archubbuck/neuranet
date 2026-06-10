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
      <div class="backdrop" aria-hidden="true" (click)="closed.emit()">
        <div class="container" [style.width.px]="width()" (click)="$event.stopPropagation()">
          <div class="header">
            <div>
              <h3>{{ title() }}</h3>
              @if (subtitle()) {
                <p>{{ subtitle() }}</p>
              }
            </div>
            <button class="close-btn" type="button" aria-label="Close" (click)="closed.emit()">
              <app-icon name="x" [size]="15" />
            </button>
          </div>
          <div class="body">
            <ng-content />
          </div>
          @if (showFooter()) {
            <div class="footer">
              <ng-content select="[footer]" />
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 5000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(6, 9, 15, 0.6);
        backdrop-filter: blur(8px);
      }
      .container {
        width: 460px;
        max-width: 100%;
        max-height: 86vh;
        display: flex;
        flex-direction: column;
        background: #0b1120;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 0;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65);
        overflow: hidden;
        animation: tnPopModal 200ms ease-out;
      }
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
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 15px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .header h3 {
        font-size: 15px;
        font-weight: 600;
        color: #f1f5f9;
        letter-spacing: -0.01em;
        margin: 0;
      }
      .header p {
        font-size: 12px;
        color: #475569;
        margin-top: 3px;
        margin-bottom: 0;
      }
      .close-btn {
        width: 28px;
        height: 28px;
        border-radius: 0;
        border: none;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #f1f5f9;
      }
      .body {
        padding: 18px;
        overflow-y: auto;
      }
      .footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 13px 18px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
    `,
  ],
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
