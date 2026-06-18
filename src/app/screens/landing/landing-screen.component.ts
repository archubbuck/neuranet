import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/primitives/icon.component';
import { ApiService } from '../../data/api.service';

interface HeroNode {
  cx: number;
  cy: number;
  r: number;
  cls: string;
}

const HERO_NODES: HeroNode[] = [
  { cx: 620, cy: 96, r: 34, cls: 'node-cyan' },
  { cx: 700, cy: 180, r: 26, cls: 'node-violet' },
  { cx: 520, cy: 60, r: 22, cls: 'node-emerald' },
  { cx: 560, cy: 200, r: 28, cls: 'node-rose' },
  { cx: 688, cy: 300, r: 22, cls: 'node-sky' },
  { cx: 400, cy: 110, r: 20, cls: 'node-orange' },
  { cx: 460, cy: 272, r: 20, cls: 'node-lime' },
  { cx: 580, cy: 360, r: 16, cls: 'node-violet' },
  { cx: 300, cy: 70, r: 14, cls: 'node-emerald' },
  { cx: 360, cy: 330, r: 14, cls: 'node-cyan' },
  { cx: 740, cy: 80, r: 20, cls: 'node-rose' },
  { cx: 720, cy: 250, r: 16, cls: 'node-lime' },
  { cx: 420, cy: 30, r: 18, cls: 'node-pink' },
  { cx: 240, cy: 140, r: 16, cls: 'node-pink' },
  { cx: 180, cy: 60, r: 12, cls: 'node-sky' },
  { cx: 100, cy: 120, r: 10, cls: 'node-violet' },
  { cx: 300, cy: 220, r: 14, cls: 'node-rose' },
  { cx: 660, cy: 420, r: 20, cls: 'node-emerald' },
  { cx: 500, cy: 400, r: 16, cls: 'node-cyan' },
  { cx: 620, cy: 470, r: 14, cls: 'node-orange' },
];

const INFLUENCE_RADIUS = 350;
const HOVER_SCALE = 1.8;
const MAX_SHRINK = 0.55;

/**
 * Marketing landing page for Neuranet, ported from the
 * `Neuranet Landing Page v3.html` design handoff.
 *
 * Sections (top to bottom): hero → stats strip → problem → sources →
 * app preview → how it works → comparison table → roadmap → final CTA → footer.
 */
@Component({
  selector: 'app-landing-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './landing-screen.component.html',
  styleUrl: './landing-screen.component.css',
})
export class LandingScreenComponent {
  private readonly api = inject(ApiService);

  protected readonly email = signal('');
  protected readonly submitted = signal(false);

  protected readonly nodes = HERO_NODES;
  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly nodeRadii = computed(() => {
    const hi = this.hoveredIndex();
    return this.nodes.map((node, i) => {
      if (hi === null) return node.r;
      if (i === hi) return node.r * HOVER_SCALE;
      const hx = this.nodes[hi].cx;
      const hy = this.nodes[hi].cy;
      const dx = node.cx - hx;
      const dy = node.cy - hy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.exp(-dist / INFLUENCE_RADIUS);
      const scale = 1 - MAX_SHRINK * t;
      return node.r * scale;
    });
  });

  protected readonly stageWrap = viewChild<ElementRef<HTMLElement>>('stageWrap');
  protected readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  protected readonly stageScale = signal(1);
  protected readonly stageHeight = signal(360);

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.resizeObserver?.disconnect());
    if (typeof ResizeObserver === 'undefined') return;
    queueMicrotask(() => this.observeStage());
  }

  private observeStage(): void {
    const wrap = this.stageWrap()?.nativeElement;
    if (!wrap) return;
    this.resizeObserver = new ResizeObserver(() => this.measureStage(wrap));
    this.resizeObserver.observe(wrap);
    this.measureStage(wrap);
  }

  private measureStage(wrap: HTMLElement): void {
    if (getComputedStyle(wrap).display === 'none') return;
    const width = wrap.clientWidth;
    if (width <= 0) return;
    const scale = width / 1312;
    this.stageScale.set(scale);
    this.stageHeight.set(360 * scale);
  }

  protected onSubmit(): void {
    const value = this.email().trim();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) return;
    this.api.joinWaitlist(value).then(() => this.submitted.set(true));
  }
}
