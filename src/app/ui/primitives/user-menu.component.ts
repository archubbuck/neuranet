import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Minimal user shape — kept local to avoid breaking ui/ layer rules. */
interface UserMenuUser {
  readonly name: string;
  readonly email: string;
  readonly image?: string;
}

/**
 * User avatar + name + sign-out action.
 *
 * Dumb presentational component — follows `ui/` layer rules: no imports
 * from `data/`, `screens/`, or `shell/`. All data flows through inputs,
 * all events through outputs.
 */
@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as u) {
      <div class="relative">
        <button
          class="flex items-center gap-2 w-full px-3 py-2 border-none bg-transparent text-slate-300 cursor-pointer font-inherit text-[13px] transition-[background] duration-120 ease-out hover:bg-[rgba(255,255,255,0.06)] hover:text-fg-1"
          (click)="open = !open"
          aria-label="User menu"
          title="User menu"
        >
          @if (u.image) {
            <img [src]="u.image" alt="" class="w-6 h-6 rounded-full shrink-0" />
          } @else {
            <span
              class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-cyan-400 text-[#090e1c] font-semibold text-[0.7rem]"
            >
              {{ initials(u.name) }}
            </span>
          }
          @if (!compact()) {
            <span class="truncate">{{ u.name }}</span>
          }
        </button>

        @if (open) {
          <div
            class="absolute bottom-full left-0 right-0 mb-1 bg-[#0f172a] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden z-50"
          >
            <div class="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
              <span class="text-xs text-slate-500 truncate block">{{ u.email }}</span>
            </div>
            <button
              class="block w-full px-3 py-2 border-none bg-transparent text-slate-300 cursor-pointer text-left font-inherit text-[13px] hover:text-rose-400"
              (click)="open = false; signOut.emit()"
            >
              Sign Out
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: ':host { display: block; position: relative; }',
})
export class UserMenuComponent {
  readonly user = input<UserMenuUser | null>(null);
  readonly compact = input(false);
  readonly signOut = output<void>();
  protected open = false;

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
