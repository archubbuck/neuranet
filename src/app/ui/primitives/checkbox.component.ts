import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * Styled checkbox with amber accent — used in management table rows
 * and bulk selection. Supports checked, unchecked, and indeterminate states.
 */
@Component({
  selector: 'app-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      aria-label="Toggle selection"
      class="flex items-center justify-center w-[17px] h-[17px] shrink-0 cursor-pointer p-0 border-[1.5px] border-border-strong bg-transparent transition-[all] duration-120 ease-out"
      [class.border-border-accent]="checked() || indeterminate()"
      [class.bg-amber-dim]="checked() || indeterminate()"
      [attr.aria-checked]="checked()"
      (click)="toggled.emit()"
    >
      @if (checked()) {
        <app-icon name="check" [size]="11" color="#FBBF24" [strokeWidth]="3" />
      } @else if (indeterminate()) {
        <span class="block w-[8px] h-[2px] bg-amber"></span>
      }
    </button>
  `,
  styles: ':host { display: inline-flex; flex-shrink: 0; }',
})
export class CheckboxComponent {
  readonly checked = input(false);
  readonly indeterminate = input(false);
  readonly toggled = output<void>();
}
