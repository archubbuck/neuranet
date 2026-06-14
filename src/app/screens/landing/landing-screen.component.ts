import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/primitives/icon.component';
import { ApiService } from '../../data/api.service';

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
  imports: [FormsModule, IconComponent],
  templateUrl: './landing-screen.component.html',
  styleUrl: './landing-screen.component.css',
})
export class LandingScreenComponent {
  private readonly api = inject(ApiService);

  protected readonly email = signal('');
  protected readonly submitted = signal(false);
  protected readonly email2 = signal('');
  protected readonly finalSubmitted = signal(false);

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

  protected onFinalSubmit(): void {
    const value = this.email2().trim();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) return;
    this.api.joinWaitlist(value).then(() => this.finalSubmitted.set(true));
  }
}
