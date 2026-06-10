import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStore } from '../../data/app.store';
import { IconComponent } from '../../ui/primitives/icon.component';

/**
 * Lightweight modal stub. Phase 2 only supports the Reddit source type — the
 * full multi-step Add-Source modal (web/PDF tabs, drag-drop, status pips)
 * ships in Phase 4. The simplified version here is enough to exercise the
 * end-to-end flow: create source → fetch → graph populated.
 *
 * Driven by a parent component via `open()`/`close()`. Not portal-rendered —
 * placed inline as a fixed-position overlay.
 */
@Component({
  selector: 'app-add-source-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (visible()) {
      <div class="overlay" aria-hidden="true" (click)="onBackdropClick($event)">
        <div class="modal" role="dialog" aria-label="Add source">
          <header>
            <h2>Add a source</h2>
            <button type="button" class="close" aria-label="Close" (click)="close()">
              <app-icon name="x" [size]="16" />
            </button>
          </header>

          <p class="hint">Phase 2 only supports Reddit threads. Web/PDF arrive in Phase 4.</p>

          <label class="field">
            <span>Reddit thread URL</span>
            <input
              type="url"
              [(ngModel)]="url"
              placeholder="https://www.reddit.com/r/.../comments/..."
              [disabled]="submitting()"
              (keydown.enter)="submit()"
            />
          </label>

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <footer>
            <button type="button" class="ghost" (click)="close()" [disabled]="submitting()">
              Cancel
            </button>
            <button type="button" class="primary" (click)="submit()" [disabled]="!canSubmit()">
              {{ submitting() ? 'Ingesting…' : 'Add source' }}
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 14, 0.7);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 16px;
        font-family: var(--font-display);
      }
      .modal {
        background: var(--c-bg-surface);
        border: 1px solid var(--c-border-def);
        border-radius: 0;
        width: 100%;
        max-width: 440px;
        padding: 24px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h2 {
        font-size: 16px;
        font-weight: 600;
        color: var(--c-fg-1);
        letter-spacing: -0.01em;
      }
      .close {
        background: none;
        border: none;
        color: var(--c-fg-3);
        cursor: pointer;
        padding: 4px;
        border-radius: 0;
      }
      .close:hover {
        color: var(--c-fg-1);
        background: rgba(255, 255, 255, 0.05);
      }
      .hint {
        font-size: 12px;
        color: var(--c-fg-4);
        line-height: 1.5;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .field span {
        font-size: 12px;
        color: var(--c-fg-3);
      }
      .field input {
        background: var(--c-bg-base);
        border: 1px solid var(--c-border-def);
        color: var(--c-fg-1);
        border-radius: 0;
        padding: 10px 12px;
        font-size: 13px;
        font-family: var(--font-mono);
        outline: none;
      }
      .field input:focus {
        border-color: var(--c-amber);
      }
      .field input:disabled {
        opacity: 0.5;
      }
      .error {
        font-size: 12px;
        color: var(--c-rose);
        background: rgba(244, 63, 94, 0.08);
        border: 1px solid rgba(244, 63, 94, 0.25);
        padding: 8px 12px;
        border-radius: 0;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      button.ghost,
      button.primary {
        font-family: var(--font-display);
        font-size: 13px;
        font-weight: 500;
        padding: 9px 16px;
        border-radius: 0;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background 0.12s ease;
      }
      button.ghost {
        background: transparent;
        border-color: var(--c-border-def);
        color: var(--c-fg-2);
      }
      button.ghost:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.04);
      }
      button.primary {
        background: var(--c-amber);
        color: #1a1208;
      }
      button.primary:hover:not(:disabled) {
        background: #fcd34d;
      }
      button.primary:disabled,
      button.ghost:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AddSourceModalComponent {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  readonly visible = signal(false);
  readonly url = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly canSubmit = computed(() => !this.submitting() && this.url().trim().startsWith('http'));

  open(): void {
    this.url.set('');
    this.errorMessage.set(null);
    this.submitting.set(false);
    this.visible.set(true);
  }

  close(): void {
    if (this.submitting()) return;
    this.visible.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  async submit(): Promise<void> {
    const threadUrl = this.url().trim();
    if (!threadUrl) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const source = await this.store.addSource({
        sourceType: 'reddit',
        config: { threadUrl },
      });
      if (!source) {
        this.errorMessage.set('Could not save source. Try again.');
        return;
      }
      await this.store.fetchSource(source.id);
      this.visible.set(false);
      await this.router.navigate(['/network']);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Failed to fetch source');
    } finally {
      this.submitting.set(false);
    }
  }
}
