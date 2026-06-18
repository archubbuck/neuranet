import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore } from '../data/app.store';
import { AuthStore } from '../data/auth.store';
import { IconComponent } from '../ui/primitives/icon.component';
import { UserMenuComponent } from '../ui/primitives/user-menu.component';
import type { IconName } from '../ui/icons';

interface NavItem {
  readonly icon: IconName;
  readonly label: string;
  /** Absolute path. `''` is the index route. */
  readonly path: string;
}

const NAV: readonly NavItem[] = [
  { icon: 'network', label: 'Network', path: '/network' },
  { icon: 'layers', label: 'Categories', path: '/categories' },
  { icon: 'hash', label: 'Topics', path: '/topics' },
  { icon: 'database', label: 'Sources', path: '/sources' },
  { icon: 'search', label: 'Search', path: '/search' },
];

/** Desktop sidebar — logo + primary nav. */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, RouterLinkActive, UserMenuComponent],
  template: `
    <aside
      class="flex flex-col h-full transition-[width] duration-200"
      [style.width.px]="store.collapsed() ? 56 : 220"
    >
      <div
        class="grid items-stretch border-b border-border-subtle"
        [style.grid-template-columns]="store.collapsed() ? '1fr' : 'auto 1fr auto'"
      >
        <button
          class="flex items-center justify-center px-3.5 py-[10px] bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-120 ease-out hover:bg-[rgba(255,255,255,0.06)] hover:text-fg-1"
          [class.hidden]="store.collapsed()"
          routerLink="/"
          aria-label="Home"
          title="Home"
        >
          <app-icon name="arrow-left" [size]="14" color="#FBBF24" />
        </button>
        <button
          class="flex items-center justify-center px-[6px] py-[10px] bg-transparent border-none cursor-pointer transition-[background,color] duration-120 ease-out hover:bg-[rgba(255,255,255,0.06)] hover:text-fg-1 text-fg-1 font-semibold text-[13px] tracking-[0.01em] border-l border-border-strong/60"
          [class.hidden]="store.collapsed()"
          aria-label="Home"
          title="Home"
        >
          <span>Neuranet</span>
        </button>
        <button
          class="flex items-center justify-center px-3.5 py-[10px] bg-transparent border-none text-fg-2 cursor-pointer transition-[background,color] duration-120 ease-out hover:bg-[rgba(255,255,255,0.06)] hover:text-fg-1 border-l border-border-strong/60"
          (click)="store.toggleCollapsed()"
          [attr.aria-label]="toggleBtn().ariaLabel"
          [title]="toggleBtn().title"
        >
          <app-icon [name]="toggleBtn().icon" [size]="14" />
        </button>
      </div>

      <nav class="flex flex-col gap-0.5 py-[10px] flex-1 overflow-y-auto">
        @for (item of nav; track item.path) {
          <a
            class="flex items-center gap-[10px] w-full text-fg-2 no-underline text-[13px] font-medium cursor-pointer transition-[background,color] duration-120 ease-out hover:bg-bg-hover hover:text-fg-1"
            [class.px-3.5]="!store.collapsed()"
            [class.px-0]="store.collapsed()"
            [class.justify-center]="store.collapsed()"
            [class.py-[10px]]="store.collapsed()"
            [routerLink]="item.path"
            [routerLinkActiveOptions]="{ exact: item.path === '/' }"
            routerLinkActive="active"
            [title]="item.label"
          >
            <app-icon [name]="item.icon" [size]="16" />
            <span [class.hidden]="store.collapsed()">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div
        class="grid items-stretch border-t border-border-subtle"
        [style.grid-template-columns]="store.collapsed() ? '1fr' : 'auto 1fr auto'"
        [class.justify-items-center]="store.collapsed()"
      >
        <app-user-menu
          [user]="authStore.user()"
          [compact]="store.collapsed()"
          (signOut)="onSignOut()"
        />
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
      background: var(--color-bg-surface);
      color: var(--color-fg-2);
      font-family: var(--font-display);
      transition: width 200ms ease;
    }
    .active {
      background: var(--color-bg-selected);
      color: var(--color-amber);
    }
  `,
})
export class SidebarComponent {
  protected readonly nav = NAV;
  protected readonly store = inject(AppStore);
  protected readonly authStore = inject(AuthStore);

  protected readonly toggleBtn = computed(() =>
    this.store.collapsed()
      ? { icon: 'arrow-right' as IconName, ariaLabel: 'Expand sidebar', title: 'Expand sidebar' }
      : { icon: 'sidebar' as IconName, ariaLabel: 'Collapse sidebar', title: 'Collapse sidebar' },
  );

  protected async onSignOut(): Promise<void> {
    await this.authStore.signOut();
  }
}
