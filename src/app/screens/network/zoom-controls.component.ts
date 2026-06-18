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
    <div
      class="flex flex-col bg-[rgba(11,17,32,0.86)] border border-border-def backdrop-blur-md overflow-hidden"
    >
      <button
        type="button"
        title="Zoom in"
        class="w-[30px] h-[30px] flex items-center justify-center bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-150 hover:bg-bg-hover hover:text-fg-1"
        (click)="zoomIn.emit()"
      >
        <app-icon name="plus" [size]="15" />
      </button>
      <div class="h-px bg-[rgba(255,255,255,0.05)]"></div>
      <button
        type="button"
        title="Zoom out"
        class="w-[30px] h-[30px] flex items-center justify-center bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-150 hover:bg-bg-hover hover:text-fg-1"
        (click)="zoomOut.emit()"
      >
        <app-icon name="minus" [size]="15" />
      </button>
      <div class="h-px bg-[rgba(255,255,255,0.05)]"></div>
      <button
        type="button"
        title="Spread nodes apart"
        class="w-[30px] h-[30px] flex items-center justify-center bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-150 hover:bg-bg-hover hover:text-fg-1"
        (click)="spreadOut.emit()"
      >
        <app-icon name="arrow-right" [size]="15" />
      </button>
      <div class="h-px bg-[rgba(255,255,255,0.05)]"></div>
      <button
        type="button"
        title="Bring nodes closer"
        class="w-[30px] h-[30px] flex items-center justify-center bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-150 hover:bg-bg-hover hover:text-fg-1"
        (click)="tightenUp.emit()"
      >
        <app-icon name="arrow-left" [size]="15" />
      </button>
      <div class="h-px bg-[rgba(255,255,255,0.05)]"></div>
      <button
        type="button"
        title="Reset view"
        class="w-[30px] h-[30px] flex items-center justify-center bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-150 hover:bg-bg-hover hover:text-fg-1"
        (click)="resetView.emit()"
      >
        <app-icon name="maximize" [size]="14" />
      </button>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      bottom: 16px;
      right: 16px;
      z-index: 5;
    }
  `,
})
export class ZoomControlsComponent {
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly spreadOut = output<void>();
  readonly tightenUp = output<void>();
  readonly resetView = output<void>();
}
