import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Status values the badge knows how to color. Kept local so the ui/
 * layer stays decoupled from domain types (`SourceStatus` is
 * structurally compatible). */
export type BadgeStatus = 'idle' | 'fetching' | 'done' | 'error';

const DOT_STYLES: Record<string, string> = {
  done: 'bg-emerald shadow-[0_0_4px_rgba(52,211,153,0.4)]',
  active: 'bg-emerald shadow-[0_0_4px_rgba(52,211,153,0.4)]',
  fetching: 'bg-amber shadow-[0_0_5px_rgba(251,191,36,0.5)]',
  idle: 'bg-amber shadow-[0_0_5px_rgba(251,191,36,0.5)]',
  error: 'bg-rose shadow-[0_0_4px_rgba(251,113,133,0.4)]',
  paused: 'bg-amber',
};

/**
 * Reusable status badge — colored dot + label.
 *
 * Used on the Sources screen rows and anywhere a source/node status
 * needs to be displayed consistently.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-[10px] py-[4px] rounded-none bg-bg-hover font-mono text-[11px] text-fg-2 whitespace-nowrap"
    >
      <span class="block w-[6px] h-[6px] rounded-full shrink-0 bg-fg-3" [class]="dotClass()"></span>
      <span>{{ label() }}</span>
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<BadgeStatus>();
  readonly label = input.required<string>();

  protected readonly dotClass = computed(() => DOT_STYLES[this.status()] ?? 'bg-fg-3');
}
