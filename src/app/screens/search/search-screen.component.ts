import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStore } from '../../data/app.store';
import { ApiService } from '../../data/api.service';
import type { SearchHit } from '../../data/types';
import { IconComponent } from '../../ui/primitives/icon.component';

/**
 * Search screen — hits `GET /api/search?q=…`.
 * Debounces input so we don't fire a request on every keystroke.
 */
@Component({
  selector: 'app-search-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div
      class="flex-1 px-8 py-9 overflow-y-auto font-display text-fg-2 max-w-[880px] w-full mx-auto"
    >
      <header class="mb-[22px]">
        <h1 class="text-[22px] font-bold text-fg-1 m-0 mb-1.5 tracking-tight">Search</h1>
        <p class="text-[13px] text-fg-3 m-0">Find topics and documents.</p>
      </header>

      <label
        class="flex items-center gap-[10px] px-4 py-3 bg-bg-elevated border border-border-def mb-[18px]"
      >
        <app-icon name="search" [size]="15" />
        <input
          type="search"
          [(ngModel)]="query"
          placeholder="Search topics, descriptions, document text…"
          class="flex-1 bg-transparent border-none outline-none text-fg-1 text-[14px] font-inherit placeholder:text-fg-4"
        />
        @if (query()) {
          <button
            type="button"
            class="bg-transparent border-none text-fg-3 cursor-pointer p-1 inline-flex items-center hover:text-fg-1"
            (click)="query.set('')"
            aria-label="Clear"
          >
            <app-icon name="x" [size]="13" />
          </button>
        }
      </label>

      @if (loading()) {
        <p class="text-[13px] text-fg-3 py-8 text-center">Searching…</p>
      } @else if (!query()) {
        <p class="text-[13px] text-fg-3 py-8 text-center">Type at least 2 characters to search.</p>
      } @else if (error()) {
        <p class="text-[13px] text-rose-400 py-8 text-center">{{ error() }}</p>
      } @else if (results().length === 0) {
        <p class="text-[13px] text-fg-3 py-8 text-center">No matches for "{{ query() }}".</p>
      } @else {
        <ul class="list-none flex flex-col gap-1.5">
          @for (r of results(); track r.id + r.type) {
            <li
              class="grid gap-[14px] px-4 py-[14px] bg-bg-elevated border border-border-subtle"
              style="grid-template-columns: auto 1fr"
              [attr.data-kind]="r.type"
            >
              <span
                class="font-mono text-[10.5px] text-fg-3 bg-bg-hover px-2 py-[3px] uppercase tracking-wide h-fit"
              >
                {{ r.type }}
              </span>
              <div>
                <button
                  type="button"
                  class="bg-transparent border-none font-inherit text-[14px] text-fg-1 cursor-pointer p-0 mb-1 text-left hover:text-amber"
                  (click)="onPick(r)"
                >
                  {{ r.label }}
                </button>
                <p
                  class="text-xs text-fg-2 leading-relaxed m-0 mb-1.5"
                  [innerHTML]="highlight(r.snippet)"
                ></p>
                <span class="text-[11px] font-mono text-fg-3">{{ r.meta }}</span>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    :host mark {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
      padding: 0 2px;
    }
  `,
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
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
