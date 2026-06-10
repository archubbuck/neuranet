import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface DonutSegment {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

/**
 * SVG donut ring chart matching the prototype `Donut` component.
 * Segments are drawn as stroke-dasharray arcs around a center value/label.
 */
@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" style="display: block; flex-shrink: 0;">
      <!-- background ring -->
      <circle
        [attr.cx]="cx()"
        [attr.cy]="cy()"
        [attr.r]="radius()"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        [attr.stroke-width]="thickness()"
      />
      <!-- segments -->
      @for (arc of arcs(); track arc.idx) {
        <circle
          [attr.cx]="cx()"
          [attr.cy]="cy()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="arc.color"
          [attr.stroke-width]="thickness()"
          [attr.stroke-dasharray]="arc.dash + ' ' + (circ() - arc.dash)"
          [attr.stroke-dashoffset]="-arc.offset"
          [attr.transform]="'rotate(-90 ' + cx() + ' ' + cy() + ')'"
        />
      }
      <!-- center value -->
      @if (centerValue() !== undefined) {
        <text
          [attr.x]="cx()"
          [attr.y]="cy() - 2"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="'JetBrains Mono', monospace"
          font-size="19"
          font-weight="700"
          fill="#f1f5f9"
        >
          {{ centerValue() }}
        </text>
      }
      @if (centerLabel()) {
        <text
          [attr.x]="cx()"
          [attr.y]="cy() + 15"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="'Space Grotesk', system-ui, sans-serif"
          font-size="10"
          fill="#2a3d66"
        >
          {{ centerLabel() }}
        </text>
      }
    </svg>
  `,
})
export class DonutChartComponent {
  readonly segments = input<readonly DonutSegment[]>([]);
  readonly size = input(120);
  readonly thickness = input(17);
  readonly centerValue = input<string | undefined>(undefined);
  readonly centerLabel = input<string | undefined>(undefined);

  protected readonly cx = computed(() => this.size() / 2);
  protected readonly cy = computed(() => this.size() / 2);
  protected readonly radius = computed(() => (this.size() - this.thickness()) / 2);
  protected readonly circ = computed(() => 2 * Math.PI * this.radius());

  protected readonly arcs = computed(() => {
    const segs = this.segments().filter((s) => s.value > 0);
    const total = segs.reduce((a, s) => a + s.value, 0) || 1;
    const circ = this.circ();
    const gap = segs.length > 1 ? 2.5 : 0;
    let acc = 0;
    return segs.map((s, idx) => {
      const len = (s.value / total) * circ;
      const dash = Math.max(0.5, len - gap);
      const arc = { idx, color: s.color, dash, offset: acc };
      acc += len;
      return arc;
    });
  });
}
