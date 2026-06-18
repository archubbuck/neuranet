import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { IconComponent } from '../../ui/primitives/icon.component';

/**
 * Floating bottom-right zoom + spacing controls. Emits intent outputs;
 * the parent `NetworkScreenComponent` is responsible for routing them to
 * `NetworkGraphComponent.zoom()` / `adjustSpacing()` / `resetView()`.
 */
@Component({
  selector: 'app-zoom-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="stack">
      <button type="button" title="Zoom in" (click)="zoomIn.emit()">
        <app-icon name="plus" [size]="15" />
      </button>
      <div class="sep"></div>
      <button type="button" title="Zoom out" (click)="zoomOut.emit()">
        <app-icon name="minus" [size]="15" />
      </button>
      <div class="sep"></div>
      <button type="button" title="Spread nodes apart" (click)="spreadOut.emit()">
        <app-icon name="arrow-right" [size]="15" />
      </button>
      <div class="sep"></div>
      <button type="button" title="Bring nodes closer" (click)="tightenUp.emit()">
        <app-icon name="arrow-left" [size]="15" />
      </button>
      <div class="sep"></div>
      <button type="button" title="Reset view" (click)="resetView.emit()">
        <app-icon name="maximize" [size]="14" />
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        bottom: 16px;
        right: 16px;
        z-index: 5;
      }
      .stack {
        display: flex;
        flex-direction: column;
        background: rgba(11, 17, 32, 0.86);
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 0;
        backdrop-filter: blur(8px);
        overflow: hidden;
      }
      button {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        transition:
          background 150ms ease-out,
          color 150ms ease-out;
      }
      button:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #f1f5f9;
      }
      .sep {
        height: 1px;
        background: rgba(255, 255, 255, 0.05);
      }
    `,
  ],
})
export class ZoomControlsComponent {
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly spreadOut = output<void>();
  readonly tightenUp = output<void>();
  readonly resetView = output<void>();
}
