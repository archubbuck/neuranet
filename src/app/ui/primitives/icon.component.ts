import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ICONS, type IconName } from '../icons';

/**
 * Renders one of the bundled Lucide-style SVG icons in a 24×24 viewBox.
 *
 * Inputs:
 *  - `name`: which icon to render (typed against the keys of `ICONS`).
 *  - `size`: width/height in pixels (default 16).
 *  - `color`: stroke color CSS value (default `currentColor`).
 *  - `strokeWidth`: SVG stroke width (default 1.5).
 *
 * Icon path data is a fixed compile-time constant, so binding it through
 * `innerHTML` via `bypassSecurityTrustHtml` is safe — there is no user-
 * controllable string interpolated into the markup.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 24 24"
    fill="none"
    class="block shrink-0"
    [attr.stroke]="color()"
    [attr.stroke-width]="strokeWidth()"
    stroke-linecap="round"
    stroke-linejoin="round"
    [innerHTML]="paths()"
  ></svg>`,
  styles: ':host { display: inline-flex; flex-shrink: 0; line-height: 0; }',
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly color = input<string>('currentColor');
  readonly strokeWidth = input<number>(1.5);

  protected readonly paths = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''),
  );
}
