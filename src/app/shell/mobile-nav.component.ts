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
		<nav>
			@for (item of nav; track item.path) {
				<a
					class="tab"
					[routerLink]="item.path"
					[routerLinkActiveOptions]="{ exact: item.path === '/' }"
					routerLinkActive="active"
				>
					<app-icon [name]="item.icon" [size]="18" />
					<span class="label">{{ item.label }}</span>
				</a>
			}
		</nav>
	`,
	styles: [
		`
			:host {
				display: block;
				border-top: 1px solid rgba(255, 255, 255, 0.05);
				background: #0b1120;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				flex-shrink: 0;
			}
			nav {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				padding: 6px 8px 10px;
			}
			.tab {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 4px;
				padding: 8px 4px;
				color: #94a3b8;
				text-decoration: none;
				font-size: 11px;
				border-radius: 0;
				transition: color 120ms ease-out, background 120ms ease-out;
			}
			.tab:hover {
				color: #f1f5f9;
			}
			.tab.active {
				color: #fbbf24;
			}
		`,
	],
})
export class MobileNavComponent {
	protected readonly nav = NAV;
}
