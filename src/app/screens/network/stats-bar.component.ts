import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStore } from '../../data/app.store';

/**
 * Floating bottom-left readout: visible node count + total source count for
 * the current dataset. Ports `StatsBar` from the prototype.
 */
@Component({
  selector: 'app-stats-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-[11px] px-[11px_15px] py-1.5 bg-[rgba(11,17,32,0.86)] border border-border-def backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-display text-[11.5px] pointer-events-auto"
    >
      <span>
        <span class="text-fg-1 font-semibold font-mono">{{ visibleNodes() }}</span>
        <span class="text-fg-3 ml-1">{{ visibleNodes() === 1 ? 'node' : 'nodes' }}</span>
      </span>
      <span class="text-[#2a3d66]">·</span>
      <span>
        <span class="text-fg-1 font-semibold font-mono">{{ sourceCount() }}</span>
        <span class="text-fg-3 ml-1">{{ sourceCount() === 1 ? 'source' : 'sources' }}</span>
      </span>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      bottom: 16px;
      left: 16px;
      z-index: 5;
      pointer-events: none;
    }
  `,
})
export class StatsBarComponent {
  private readonly store = inject(AppStore);

  protected readonly visibleNodes = computed(() => this.store.visibleNodeIds().size);
  protected readonly sourceCount = computed(() => this.store.sources().length);
}
