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
      <div class="user-menu">
        <button class="trigger" (click)="open = !open" aria-label="User menu" title="User menu">
          @if (u.image) {
            <img [src]="u.image" alt="" class="avatar" />
          } @else {
            <span class="avatar-placeholder">{{ initials(u.name) }}</span>
          }
          @if (!compact()) {
            <span class="name">{{ u.name }}</span>
          }
        </button>

        @if (open) {
          <div class="dropdown">
            <div class="dropdown-header">
              <span class="dropdown-email">{{ u.email }}</span>
            </div>
            <button class="dropdown-item sign-out" (click)="open = false; signOut.emit()">
              Sign Out
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .user-menu {
        position: relative;
      }
      .trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: none;
        background: none;
        color: #cbd5e1;
        cursor: pointer;
        font: inherit;
        font-size: 0.8125rem;
        transition: background 120ms ease-out;
      }
      .trigger:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #f1f5f9;
      }
      .avatar,
      .avatar-placeholder {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .avatar-placeholder {
        background: #22d3ee;
        color: #090e1c;
        font-weight: 600;
        font-size: 0.7rem;
      }
      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        margin-bottom: 0.25rem;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        overflow: hidden;
        z-index: 50;
      }
      .dropdown-header {
        padding: 0.625rem 0.75rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .dropdown-email {
        font-size: 0.75rem;
        color: #64748b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }
      .dropdown-item {
        display: block;
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: none;
        background: none;
        color: #e2e8f0;
        cursor: pointer;
        text-align: left;
        font: inherit;
        font-size: 0.8125rem;
      }
      .dropdown-item:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .sign-out {
        color: #f87171;
      }
    `,
  ],
})
export class UserMenuComponent {
  readonly user = input<UserMenuUser | null>(null);
  /** When true, hides the user name and shows only the avatar. */
  readonly compact = input(false);
  readonly signOut = output<void>();

  protected open = false;

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
