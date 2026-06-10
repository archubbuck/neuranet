import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore } from '../data/app.store';
import { IconComponent } from '../ui/icon.component';
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
	imports: [IconComponent, RouterLink, RouterLinkActive],
	host: { '[class.collapsed]': 'store.collapsed()' },
	template: `
		<aside>
			<div class="header">
			<button class="header-btn" routerLink="/" aria-label="Home" title="Home">
				<app-icon name="arrow-left" [size]="14" color="#FBBF24" />
			</button>
			<button class="header-btn header-title-btn" aria-label="Home" title="Home">
				<span>TopicNet</span>
			</button>
			<button class="header-btn" (click)="store.toggleCollapsed()" aria-label="Collapse sidebar" title="Collapse sidebar">
				<app-icon name="sidebar" [size]="14" />
				</button>
			</div>

			<nav>
				@for (item of nav; track item.path) {
					<a
						class="nav-item"
						[routerLink]="item.path"
						[routerLinkActiveOptions]="{ exact: item.path === '/' }"
						routerLinkActive="active"
						[title]="item.label"
					>
						<app-icon [name]="item.icon" [size]="16" />
						<span>{{ item.label }}</span>
					</a>
				}
			</nav>

			<div class="footer">
				<button class="footer-btn" aria-label="User profile" title="User profile">
					<app-icon name="user" [size]="14" />
				</button>
				<button class="footer-btn username-btn" aria-label="User profile" title="demo_user">
					<span>demo_user</span>
				</button>
				<a class="footer-btn" routerLink="/settings" aria-label="Settings" title="Settings">
					<app-icon name="settings" [size]="14" />
				</a>
			</div>
		</aside>
	`,
	styles: [
		`
			:host {
				display: block;
				width: 220px;
				flex-shrink: 0;
				background: #0b1120;
				border-right: 1px solid rgba(255, 255, 255, 0.05);
				color: #94a3b8;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				transition: width 200ms ease;
			}
			:host.collapsed {
				width: 56px;
			}
			:host.collapsed .header-title-btn,
			:host.collapsed .username-btn,
			:host.collapsed .nav-item span {
				display: none;
			}
			:host.collapsed .nav-item {
				justify-content: center;
				padding: 10px 0;
			}
			:host.collapsed .header-btn:last-child {
				display: none;
			}
			:host.collapsed .header,
			:host.collapsed .footer {
				grid-template-columns: 1fr;
			}
			:host.collapsed .footer-btn:last-child {
				border-left: none;
				border-top: 1px solid rgba(255, 255, 255, 0.06);
			}
			aside {
				display: flex;
				flex-direction: column;
				height: 100%;
			}
			.header, .footer {
				display: grid;
				grid-template-columns: auto 1fr auto;
				align-items: stretch;
			}
			.header {
				border-bottom: 1px solid rgba(255, 255, 255, 0.05);
			}
			.header-btn, .footer-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				background: none;
				border: none;
				padding: 10px 6px;
				color: #94a3b8;
				cursor: pointer;
				transition: background 120ms ease-out, color 120ms ease-out;
			}
			.header-btn:hover, .footer-btn:hover {
				background: rgba(255, 255, 255, 0.06);
				color: #f1f5f9;
			}
			.header-btn:first-child, .header-btn:last-child,
			.footer-btn:first-child, .footer-btn:last-child {
				padding: 10px 14px;
			}
			.header-title-btn {
				color: #f1f5f9;
				font-weight: 600;
				font-size: 13px;
				letter-spacing: 0.01em;
			}
			.header-btn + .header-btn,
			.footer-btn + .footer-btn {
				border-left: 1px solid rgba(255, 255, 255, 0.06);
			}
			nav {
				display: flex;
				flex-direction: column;
				gap: 2px;
				padding: 10px 0;
				flex: 1 1 auto;
				overflow-y: auto;
			}
			.nav-item {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 10px 14px;
				border-radius: 0;
				width: 100%;
				color: inherit;
				text-decoration: none;
				font-size: 13px;
				font-weight: 500;
				transition: background 120ms ease-out, color 120ms ease-out;
				cursor: pointer;
			}
			.nav-item:hover {
				background: rgba(255, 255, 255, 0.04);
				color: #f1f5f9;
			}
			.nav-item.active {
				background: rgba(251, 191, 36, 0.08);
				color: #fbbf24;
			}
			.footer {
				border-top: 1px solid rgba(255, 255, 255, 0.05);
			}
			.username-btn {
				font-size: 12px;
				font-weight: 500;
				color: #cbd5e1;
			}
		`,
	],
})
export class SidebarComponent {
	protected readonly nav = NAV;
	protected readonly store = inject(AppStore);
}
