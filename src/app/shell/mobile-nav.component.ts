import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/primitives/icon.component';
import type { IconName } from '../ui/icons';

interface NavItem {
  readonly icon: IconName;
  readonly label: string;
  readonly path: string;
}

const NAV: readonly NavItem[] = [
  { icon: 'network', label: 'Network', path: '/' },
  { icon: 'layers', label: 'Categories', path: '/categories' },
  { icon: 'database', label: 'Sources', path: '/sources' },
  { icon: 'search', label: 'Search', path: '/search' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

/** Bottom tab bar shown on mobile in place of the desktop sidebar. */
@Component({
  selector: 'app-mobile-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, RouterLinkActive],
  template: `
    <nav class="grid grid-cols-5 px-2 py-[6px_10px]">
      @for (item of nav; track item.path) {
        <a
          class="flex flex-col items-center gap-1 px-1 py-2 text-fg-2 no-underline text-[11px] transition-[color,background] duration-120 ease-out hover:text-fg-1"
          [routerLink]="item.path"
          [routerLinkActiveOptions]="{ exact: item.path === '/' }"
          routerLinkActive="active"
        >
          <app-icon [name]="item.icon" [size]="18" />
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      border-top: 1px solid var(--color-border-subtle);
      background: var(--color-bg-surface);
      font-family: var(--font-display);
      flex-shrink: 0;
    }
    .active {
      color: var(--color-amber);
    }
  `,
})
export class MobileNavComponent {
  protected readonly nav = NAV;
}
