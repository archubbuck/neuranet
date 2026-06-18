import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-[7px] text-[13px] font-semibold px-3.5 py-2 rounded-none cursor-pointer border border-transparent disabled:opacity-40 disabled:cursor-default';

/**
 * Standard button. Variants map to the design tokens; content is projected:
 *
 *   <app-button variant="primary" (pressed)="save()">Save</app-button>
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [class]="btnClass()" type="button" [disabled]="disabled()" (click)="pressed.emit()">
      <ng-content />
    </button>
  `,
  styles: ':host { display: inline-flex; }',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly disabled = input<boolean>(false);
  readonly pressed = output<void>();

  protected readonly btnClass = computed(() => {
    const variant = this.variant();
    const vClasses = {
      primary: 'bg-amber text-fg-on-accent hover:bg-amber-hover',
      secondary: 'bg-bg-elevated border-border-def text-fg-1 hover:bg-bg-overlay',
      ghost: 'bg-transparent text-fg-2 hover:bg-bg-hover hover:text-fg-1',
      danger: 'bg-transparent border-rose text-rose hover:bg-rose/10',
    }[variant];
    return `${BASE_CLASSES} ${vClasses}`;
  });
}
