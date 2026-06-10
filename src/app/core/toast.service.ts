import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly kind: ToastKind;
}

/**
 * Single-active-toast notification service. The store and any feature service
 * may call `show()`; `ToastComponent` renders the current toast and auto-
 * dismisses it after a short delay.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private readonly _current = signal<Toast | null>(null);
  readonly current = this._current.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = 3200): void {
    if (this.timer !== null) clearTimeout(this.timer);
    const toast: Toast = { id: this.nextId++, message, kind };
    this._current.set(toast);
    this.timer = setTimeout(() => {
      this._current.set(null);
      this.timer = null;
    }, durationMs);
  }

  dismiss(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this._current.set(null);
  }
}
