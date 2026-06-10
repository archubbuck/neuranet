import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SourceStatus } from '../../data/types';

/**
 * Reusable status badge — colored dot + label.
 *
 * Used on the Sources screen rows and anywhere a source/node status
 * needs to be displayed consistently.
 */
@Component({
	selector: 'app-status-badge',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	template: `
		<span class="badge" [attr.data-status]="status()">
			<span class="dot"></span>
			<span>{{ label() }}</span>
		</span>
	`,
	styles: [
		`
			.badge {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 4px 10px;
				border-radius: 0;
				background: rgba(255, 255, 255, 0.04);
				font-size: 11px;
				font-family: var(--font-mono, 'JetBrains Mono', monospace);
				color: #94a3b8;
				white-space: nowrap;
			}
			.dot {
				width: 6px;
				height: 6px;
				border-radius: 50%;
				background: #475569;
				flex-shrink: 0;
			}
			.badge[data-status='done'] .dot,
			.badge[data-status='active'] .dot {
				background: #34d399;
				box-shadow: 0 0 4px rgba(52, 211, 153, 0.4);
			}
			.badge[data-status='fetching'] .dot,
			.badge[data-status='idle'] .dot {
				background: #fbbf24;
				box-shadow: 0 0 5px rgba(251, 191, 36, 0.5);
			}
			.badge[data-status='error'] .dot {
				background: #fb7185;
				box-shadow: 0 0 4px rgba(251, 113, 133, 0.4);
			}
			.badge[data-status='paused'] .dot {
				background: #fbbf24;
			}
		`,
	],
})
export class StatusBadgeComponent {
	readonly status = input.required<SourceStatus>();
	readonly label = input.required<string>();
}
