import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Settings placeholder. After the workspace concept was removed there is no
 * per-tenant metadata left to edit; the screen now renders informational
 * copy so the navigation entry still resolves.
 */
@Component({
	selector: 'app-settings-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	template: `
		<div class="root">
			<header>
				<h1>Settings</h1>
				<p>Application preferences.</p>
			</header>
			<section class="card">
				<h2>Coming soon</h2>
				<p class="hint">
					User preferences and account settings will live here in a future
					release. For now the app runs against a single global dataset.
				</p>
			</section>
		</div>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				min-height: 0;
			}
			.root {
				flex: 1;
				padding: 36px 32px;
				overflow-y: auto;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #94a3b8;
				max-width: 720px;
				width: 100%;
				margin: 0 auto;
				display: flex;
				flex-direction: column;
				gap: 24px;
			}
			header h1 {
				font-size: 22px;
				font-weight: 700;
				color: #f1f5f9;
				letter-spacing: -0.02em;
				margin: 0 0 6px;
			}
			header p {
				font-size: 13px;
				color: #475569;
				margin: 0;
			}
			.card {
				background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.05);
				border-radius: 0;
				padding: 22px 24px;
				display: flex;
				flex-direction: column;
				gap: 10px;
			}
			h2 {
				font-size: 14px;
				font-weight: 600;
				color: #f1f5f9;
				margin: 0;
			}
			.hint {
				font-size: 12px;
				color: #475569;
				margin: 0;
				line-height: 1.6;
			}
		`,
	],
})
export class SettingsScreenComponent {}
