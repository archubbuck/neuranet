import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

/**
 * Renders the current `ToastService.current()` value at the bottom of the
 * viewport. Slides up via CSS animation; auto-dismisses through the service.
 */
@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast(); as t) {
      <div
        class="inline-flex items-center gap-[9px] px-4 py-[10px] bg-[rgba(15,24,40,0.92)] backdrop-blur border border-border-def text-fg-1 text-[13px] font-display animate-[toast-rise_180ms_ease-out]"
        [style.borderColor]="borderColor()"
        role="status"
        aria-live="polite"
        style="box-shadow: 0 8px 24px rgba(0,0,0,0.4)"
      >
        <span class="w-[7px] h-[7px] rounded-full shrink-0" [style.background]="dotColor()"></span>
        <span>{{ t.message }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: 28px;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
    }
    @keyframes toast-rise {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class ToastComponent {
  private readonly service = inject(ToastService);
  protected readonly toast = this.service.current;

  protected readonly dotColor = computed(() => {
    const t = this.toast();
    if (!t) return '#94a3b8';
    if (t.kind === 'success') return '#34d399';
    if (t.kind === 'error') return '#fb7185';
    return '#38bdf8';
  });

  protected readonly borderColor = computed(() => {
    const t = this.toast();
    if (!t) return 'rgba(255,255,255,0.09)';
    if (t.kind === 'success') return 'rgba(52,211,153,0.35)';
    if (t.kind === 'error') return 'rgba(251,113,133,0.35)';
    return 'rgba(56,189,248,0.35)';
  });
}
