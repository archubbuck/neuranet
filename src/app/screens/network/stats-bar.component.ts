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
    <div class="bar">
      <span class="stat">
        <span class="value">{{ visibleNodes() }}</span>
        <span class="label">{{ visibleNodes() === 1 ? 'node' : 'nodes' }}</span>
      </span>
      <span class="dot">·</span>
      <span class="stat">
        <span class="value">{{ sourceCount() }}</span>
        <span class="label">{{ sourceCount() === 1 ? 'source' : 'sources' }}</span>
      </span>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        bottom: 16px;
        left: 16px;
        z-index: 5;
        pointer-events: none;
      }
      .bar {
        display: inline-flex;
        align-items: center;
        gap: 11px;
        padding: 7px 15px;
        border-radius: 0;
        background: rgba(11, 17, 32, 0.86);
        border: 1px solid rgba(255, 255, 255, 0.09);
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 11.5px;
        pointer-events: auto;
      }
      .value {
        color: #f1f5f9;
        font-weight: 600;
        font-family: 'JetBrains Mono', monospace;
      }
      .label {
        color: #475569;
        margin-left: 4px;
      }
      .dot {
        color: #2a3d66;
      }
    `,
  ],
})
export class StatsBarComponent {
  private readonly store = inject(AppStore);

  protected readonly visibleNodes = computed(() => this.store.visibleNodeIds().size);
  protected readonly sourceCount = computed(() => this.store.sources().length);
}
