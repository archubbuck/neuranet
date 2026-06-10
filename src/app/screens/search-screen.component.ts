import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStore } from '../data/app.store';
import { ApiService } from '../data/api.service';
import type { SearchHit } from '../data/types';
import { IconComponent } from '../ui/icon.component';

/**
 * Search screen — hits `GET /api/search?q=…`.
 * Debounces input so we don't fire a request on every keystroke.
 */
@Component({
	selector: 'app-search-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule, IconComponent],
	template: `
		<div class="root">
			<header>
				<h1>Search</h1>
				<p>Find topics and documents.</p>
			</header>

			<label class="search">
				<app-icon name="search" [size]="15" />
				<input
					type="search"
					[(ngModel)]="query"
					placeholder="Search topics, descriptions, document text…"
					autofocus
				/>
				@if (query()) {
					<button type="button" class="clear" (click)="query.set('')" aria-label="Clear">
						<app-icon name="x" [size]="13" />
					</button>
				}
			</label>

			@if (loading()) {
				<p class="hint">Searching…</p>
			} @else if (!query()) {
				<p class="hint">Type at least 2 characters to search.</p>
			} @else if (error()) {
				<p class="hint error">{{ error() }}</p>
			} @else if (results().length === 0) {
				<p class="hint">No matches for "{{ query() }}".</p>
			} @else {
				<ul class="results">
					@for (r of results(); track r.id + r.type) {
						<li class="hit" [attr.data-kind]="r.type">
							<span class="kind">{{ r.type }}</span>
							<div class="meta">
								<button
									type="button"
									class="title"
									(click)="onPick(r)"
								>{{ r.label }}</button>
								<p class="snippet" [innerHTML]="highlight(r.snippet)"></p>
								<span class="sub">{{ r.meta }}</span>
							</div>
						</li>
					}
				</ul>
			}
		</div>
	`,
	styles: [
		`
			:host { display: flex; flex: 1; min-height: 0; }
			.root {
				flex: 1; padding: 36px 32px; overflow-y: auto;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #94a3b8; max-width: 880px; width: 100%; margin: 0 auto;
			}
			header { margin-bottom: 22px; }
			h1 {
				font-size: 22px; font-weight: 700; color: #f1f5f9;
				margin: 0 0 6px; letter-spacing: -0.02em;
			}
			header p { font-size: 13px; color: #475569; margin: 0; }
			.search {
				display: flex; align-items: center; gap: 10px;
				padding: 12px 16px; background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.09);
				border-radius: 0; margin-bottom: 18px; color: #475569;
			}
			.search input {
				flex: 1; background: transparent; border: none; outline: none;
				color: #f1f5f9; font-size: 14px; font-family: inherit;
			}
			.clear {
				background: transparent; border: none; color: #475569;
				cursor: pointer; padding: 4px;
				display: inline-flex; align-items: center;
			}
			.clear:hover { color: #f1f5f9; }
			.hint {
				font-size: 13px; color: #475569; padding: 32px 0; text-align: center;
			}
			.hint.error { color: #f87171; }
			.results { list-style: none; display: flex; flex-direction: column; gap: 6px; }
			.hit {
				display: grid; grid-template-columns: auto 1fr; gap: 14px;
				padding: 14px 16px; background: #0f1828;
				border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0;
			}
			.hit .kind {
				font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
				color: #475569; background: rgba(255, 255, 255, 0.04);
				padding: 3px 8px; border-radius: 0;
				letter-spacing: 0.04em; text-transform: uppercase;
				height: fit-content;
			}
			.hit[data-kind='node'] .kind {
				color: #fbbf24; background: rgba(251, 191, 36, 0.06);
			}
			.title {
				background: transparent; border: none; font-family: inherit;
				font-size: 14px; color: #f1f5f9; cursor: pointer;
				padding: 0; margin-bottom: 4px; text-align: left;
			}
			.title:hover { color: #fbbf24; }
			.snippet {
				font-size: 12px; color: #94a3b8; line-height: 1.55; margin: 0 0 6px;
			}
			.snippet :global(mark) {
				background: rgba(251, 191, 36, 0.2); color: #fbbf24;
				padding: 0 2px; border-radius: 0;
			}
			.sub {
				font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #475569;
			}
		`,
	],
})
export class SearchScreenComponent {
	private readonly store = inject(AppStore);
	private readonly api = inject(ApiService);
	private readonly router = inject(Router);

	protected readonly query = signal<string>('');
	protected readonly results = signal<readonly SearchHit[]>([]);
	protected readonly loading = signal<boolean>(false);
	protected readonly error = signal<string | null>(null);

	private currentRequestId = 0;

	constructor() {
		// Debounced server-side search. Fires whenever the query changes;
		// ignored if query is too short. onCleanup clears the pending timer
		// on re-run AND on destroy so a dead component never issues requests.
		effect((onCleanup) => {
			const q = this.query().trim();
			if (q.length < 2) {
				this.results.set([]);
				this.loading.set(false);
				this.error.set(null);
				return;
			}
			this.loading.set(true);
			const reqId = ++this.currentRequestId;
			const timer = setTimeout(() => {
				void this.runSearch(q, reqId);
			}, 220);
			onCleanup(() => clearTimeout(timer));
		});
	}

	private async runSearch(q: string, reqId: number): Promise<void> {
		try {
			const res = await this.api.search(q);
			// Drop the response if a newer request has been issued in the
			// meantime — prevents out-of-order updates on slow networks.
			if (reqId !== this.currentRequestId) return;
			this.results.set(res.results);
			this.error.set(null);
		} catch (e) {
			if (reqId !== this.currentRequestId) return;
			this.error.set(e instanceof Error ? e.message : 'Search failed');
			this.results.set([]);
		} finally {
			if (reqId === this.currentRequestId) this.loading.set(false);
		}
	}

	onPick(hit: SearchHit): void {
		if (hit.type === 'node') {
			this.store.selectNode(hit.id);
			void this.router.navigate(['/network']);
		}
	}

	protected highlight(snippet: string): string {
		const q = this.query().trim();
		if (q.length < 2) return this.escape(snippet);
		const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp(escaped, 'gi');
		return this.escape(snippet).replace(re, (m) => `<mark>${m}</mark>`);
	}

	private escape(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}
}
