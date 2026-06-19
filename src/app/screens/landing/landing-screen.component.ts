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
  template: `<div class="page relative min-h-full overflow-x-hidden overflow-y-auto">
    <div class="relative max-w-[1680px] mx-auto px-6 sm:px-8 lg:px-16">
      <header class="flex items-center justify-between pt-8 lg:pt-10 pb-4">
        <div class="flex items-center gap-3">
          <span
            class="w-8 h-8 grid place-items-center rounded-md bg-bg-elevated border border-border-accent shadow-[0_0_6px_rgba(251,191,36,0.4)] text-amber"
            ><app-icon name="network" [size]="18"
          /></span>
          <span class="text-[20px] sm:text-[22px] font-semibold tracking-tight text-fg-1"
            >Neuranet</span
          >
        </div>
        <button
          class="lg:hidden w-8 h-8 grid place-items-center text-fg-2 hover:text-fg-1 transition-colors"
          aria-label="Toggle navigation"
          (click)="mobileNavOpen.set(!mobileNavOpen())"
        >
          <app-icon [name]="mobileNavOpen() ? 'x' : 'menu'" [size]="20" />
        </button>
        <nav
          class="flex items-center gap-7"
          [class.max-lg:hidden]="!mobileNavOpen()"
          [class]="
            mobileNavOpen()
              ? 'max-lg:flex max-lg:flex-col max-lg:absolute max-lg:top-16 max-lg:inset-x-0 max-lg:bg-bg-surface max-lg:border-b max-lg:border-border-subtle max-lg:p-6 max-lg:gap-4 max-lg:z-50'
              : ''
          "
        >
          <a
            class="text-sm font-medium text-fg-2 no-underline hover:text-fg-1 transition-colors duration-200"
            href="#product"
            (click)="mobileNavOpen.set(false)"
            >Product</a
          >
          <a
            class="text-sm font-medium text-fg-2 no-underline hover:text-fg-1 transition-colors duration-200"
            href="#how"
            (click)="mobileNavOpen.set(false)"
            >How it works</a
          >
          <a
            class="text-sm font-medium text-fg-2 no-underline hover:text-fg-1 transition-colors duration-200"
            href="#compare"
            (click)="mobileNavOpen.set(false)"
            >Compare</a
          >
          <a
            class="text-sm font-medium text-fg-2 no-underline hover:text-fg-1 transition-colors duration-200"
            href="#roadmap"
            (click)="mobileNavOpen.set(false)"
            >Roadmap</a
          >
          <a
            class="text-sm font-medium text-fg-2 no-underline hover:text-fg-1 transition-colors duration-200"
            routerLink="/login"
            (click)="mobileNavOpen.set(false)"
            >Sign In <app-icon name="arrow-right" [size]="14"
          /></a>
        </nav>
      </header>

      <main
        class="grid grid-cols-1 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] gap-10 lg:gap-[clamp(40px,5vw,96px)] items-center py-12 sm:py-[clamp(48px,5vw,72px)_clamp(56px,5.5vw,80px)]"
      >
        <section class="max-w-[680px]">
          <h1
            class="text-balance text-[clamp(36px,4.5vw,78px)] sm:text-[clamp(42px,5.2vw,78px)] leading-[1.04] font-bold tracking-tight text-fg-1 mt-0"
          >
            Map the network inside your research
          </h1>
          <p
            class="mt-6 sm:mt-7 max-w-[560px] text-[17px] sm:text-[19px] leading-relaxed tracking-tight text-fg-2"
          >
            Neuranet ingests Reddit, LinkedIn, the web, PDFs, and raw text — then surfaces topics,
            clusters, connections, and sentiment as an explorable network.
          </p>
          <ul class="list-none p-0 mt-8 flex flex-col gap-4">
            <li class="flex items-center gap-3 text-[16px] text-fg-1">
              <app-icon name="circle-check" [size]="20" class="text-amber shrink-0" />Turn raw
              sources into structured topic maps
            </li>
            <li class="flex items-center gap-3 text-[16px] text-fg-1">
              <app-icon name="circle-check" [size]="20" class="text-amber shrink-0" />Trace
              connections across communities and documents
            </li>
            <li class="flex items-center gap-3 text-[16px] text-fg-1">
              <app-icon name="circle-check" [size]="20" class="text-amber shrink-0" />Track
              sentiment as it shifts, scored in real time
            </li>
          </ul>

          @if (!submitted()) {
            <form
              class="flex gap-3 mt-8 flex-col sm:flex-row max-w-[560px]"
              (submit)="$event.preventDefault(); onSubmit()"
              novalidate
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                aria-label="Email address"
                class="h-[52px] px-[18px] rounded-md text-[16px] bg-bg-elevated border border-border-def text-fg-1 outline-none w-full sm:max-w-[260px] placeholder:text-fg-4 focus:border-border-accent focus:shadow-[0_0_0_3px_rgba(251,191,36,0.15)] transition-all duration-200"
                [ngModel]="email()"
                (ngModelChange)="email.set($event)"
                name="email"
              />
              <button
                class="h-[52px] px-6 rounded-md bg-amber text-fg-on-accent font-semibold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer border-none hover:bg-amber-hover active:scale-[0.97] shadow-[0_0_6px_rgba(251,191,36,0.4)] hover:shadow-[0_0_12px_rgba(251,191,36,0.3),0_0_40px_rgba(251,191,36,0.1)] transition-all duration-200"
                type="submit"
              >
                <span>Join the waitlist</span>
                <app-icon name="arrow-right" [size]="16" />
              </button>
            </form>
          } @else {
            <p class="flex items-center gap-2.5 mt-7 text-[15px] text-fg-1" role="status">
              <span
                class="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-bg-elevated border border-border-accent shadow-[0_0_6px_rgba(251,191,36,0.4)] text-amber"
                ><app-icon name="check" [size]="18"
              /></span>
              You're on the list — we'll be in touch.
            </p>
          }
          <p class="text-[14px] text-fg-2 mt-4">
            Built for researchers, analysts, and knowledge workers.
          </p>
        </section>

        <div class="relative pointer-events-none hidden lg:block" aria-hidden="true">
          <svg
            class="hero-svg w-full h-auto"
            viewBox="0 0 760 520"
            fill="none"
            [style.opacity]="'0.75'"
          >
            <g>
              <line class="stroke-white/24 stroke-[1.5]" x1="620" y1="96" x2="700" y2="180" />
              <line class="stroke-white/24 stroke-[1.5]" x1="620" y1="96" x2="520" y2="60" />
              <line class="stroke-white/24 stroke-[1.5]" x1="620" y1="96" x2="560" y2="200" />
              <line class="stroke-white/24 stroke-[1.5]" x1="700" y1="180" x2="560" y2="200" />
              <line class="stroke-white/24 stroke-[1.5]" x1="700" y1="180" x2="688" y2="300" />
              <line class="stroke-white/24 stroke-[1.5]" x1="520" y1="60" x2="400" y2="110" />
              <line class="stroke-white/24 stroke-[1.5]" x1="560" y1="200" x2="460" y2="272" />
              <line class="stroke-white/24 stroke-[1.5]" x1="560" y1="200" x2="400" y2="110" />
              <line class="stroke-white/24 stroke-[1.5]" x1="688" y1="300" x2="580" y2="360" />
              <line class="stroke-white/24 stroke-[1.5]" x1="460" y1="272" x2="580" y2="360" />
              <line class="stroke-white/24 stroke-[1.5]" x1="400" y1="110" x2="300" y2="70" />
              <line class="stroke-white/24 stroke-[1.5]" x1="460" y1="272" x2="360" y2="330" />
              <line class="stroke-white/24 stroke-[1.5]" x1="740" y1="80" x2="620" y2="96" />
              <line class="stroke-white/24 stroke-[1.5]" x1="740" y1="80" x2="700" y2="180" />
              <line class="stroke-white/24 stroke-[1.5]" x1="720" y1="250" x2="700" y2="180" />
              <line class="stroke-white/24 stroke-[1.5]" x1="720" y1="250" x2="688" y2="300" />
              <line class="stroke-white/24 stroke-[1.5]" x1="420" y1="30" x2="520" y2="60" />
              <line class="stroke-white/24 stroke-[1.5]" x1="420" y1="30" x2="400" y2="110" />
              <line class="stroke-white/24 stroke-[1.5]" x1="240" y1="140" x2="300" y2="70" />
              <line class="stroke-white/24 stroke-[1.5]" x1="240" y1="140" x2="180" y2="60" />
              <line class="stroke-white/24 stroke-[1.5]" x1="240" y1="140" x2="300" y2="220" />
              <line class="stroke-white/24 stroke-[1.5]" x1="180" y1="60" x2="100" y2="120" />
              <line class="stroke-white/24 stroke-[1.5]" x1="300" y1="220" x2="360" y2="330" />
              <line class="stroke-white/24 stroke-[1.5]" x1="300" y1="220" x2="400" y2="110" />
              <line class="stroke-white/24 stroke-[1.5]" x1="660" y1="420" x2="688" y2="300" />
              <line class="stroke-white/24 stroke-[1.5]" x1="660" y1="420" x2="580" y2="360" />
              <line class="stroke-white/24 stroke-[1.5]" x1="660" y1="420" x2="620" y2="470" />
              <line class="stroke-white/24 stroke-[1.5]" x1="500" y1="400" x2="460" y2="272" />
              <line class="stroke-white/24 stroke-[1.5]" x1="500" y1="400" x2="580" y2="360" />
              <line class="stroke-white/24 stroke-[1.5]" x1="500" y1="400" x2="620" y2="470" />
            </g>
            @for (node of nodes; track node.cx + ',' + node.cy; let i = $index) {
              <circle
                [class]="node.cls"
                [attr.cx]="node.cx"
                [attr.cy]="node.cy"
                [attr.r]="nodeRadii()[i]"
                class="cursor-pointer"
                (mouseenter)="hoveredIndex.set(i)"
                (mouseleave)="hoveredIndex.set(null)"
              />
            }
          </svg>
        </div>
      </main>

      <section class="border-y border-border-subtle py-10 bg-bg-surface/40">
        <div class="max-w-[1680px] mx-auto px-6 sm:px-8 lg:px-16 grid grid-cols-2 md:grid-cols-4">
          <div class="flex items-baseline gap-3 py-[26px] px-7 md:border-r border-border-subtle">
            <span class="text-[26px] font-bold font-mono text-fg-1">12.4M</span>
            <span class="text-[13px] text-fg-2 tracking-[0.03em]">notes mapped</span>
          </div>
          <div class="flex items-baseline gap-3 py-[26px] px-7 md:border-r border-border-subtle">
            <span class="text-[26px] font-bold font-mono text-fg-1">48,212</span>
            <span class="text-[13px] text-fg-2 tracking-[0.03em]">sources connected</span>
          </div>
          <div class="flex items-baseline gap-3 py-[26px] px-7 md:border-r border-border-subtle">
            <span class="text-[26px] font-bold font-mono text-fg-1">1,380</span>
            <span class="text-[13px] text-fg-2 tracking-[0.03em]">active workspaces</span>
          </div>
          <div class="flex items-baseline gap-3 py-[26px] px-7">
            <span class="text-[26px] font-bold font-mono text-fg-1">4 min</span>
            <span class="text-[13px] text-fg-2 tracking-[0.03em]">median time to first map</span>
          </div>
        </div>
      </section>

      <section class="py-[clamp(64px,6vw,96px)]">
        <div
          class="max-w-[880px] mx-auto px-6 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[clamp(32px,3vw,48px)] items-start"
        >
          <h2
            class="text-[clamp(30px,2.8vw,42px)] leading-tight font-bold tracking-tight text-fg-1 mb-0"
          >
            Search finds documents. It can't see <em class="not-italic text-amber">structure</em>.
          </h2>
          <div
            class="border-l border-border-def pl-[clamp(24px,2.5vw,48px)] flex flex-col gap-[18px]"
          >
            <p class="text-[16px] leading-relaxed text-fg-2 max-w-[60ch]">
              The same arguments, actors, and numbers resurface across communities, articles, and
              papers — but stored as pages and bookmarks, those links are invisible. You end up
              re-reading instead of reasoning.
            </p>
            <p class="text-[16px] leading-relaxed text-fg-2 max-w-[60ch]">
              <strong class="text-fg-1 font-medium">Neuranet reads every source you connect</strong>
              and renders the structure underneath: topics, clusters, connections, and how sentiment
              moves between them.
            </p>
          </div>
        </div>
      </section>

      <section class="border-t border-border-subtle py-16 sm:py-[clamp(56px,5.5vw,80px)]">
        <h2
          class="text-[clamp(28px,2.8vw,42px)] sm:text-[clamp(30px,2.8vw,42px)] font-bold tracking-tight max-w-[800px] text-fg-1"
        >
          Every kind of source. One network.
        </h2>
        <p class="mt-[14px] text-[15px] sm:text-[16px] leading-relaxed text-fg-2 max-w-[62ch]">
          Connect live feeds or drop in files — everything lands in the same graph, linked and
          scored the moment it arrives.
        </p>
        <div class="mt-9 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          <div>
            <h3 class="text-[13px] font-medium tracking-[0.03em] text-fg-2 pb-[14px]">
              Live feeds
            </h3>
            <div
              class="flex gap-[14px] items-start py-[18px] border-t border-border-subtle hover:bg-bg-hover/30 transition-colors duration-200 -mx-2 px-2 rounded-md group"
            >
              <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-sm bg-bg-elevated border border-border-subtle text-fg-2 group-hover:border-border-accent group-hover:text-amber transition-colors duration-200"
                ><app-icon name="message-square" [size]="16"
              /></span>
              <div class="flex-1 min-w-0">
                <div
                  class="flex justify-between items-baseline gap-3 flex-wrap text-[15px] font-semibold tracking-tight"
                >
                  Reddit communities<span
                    class="font-mono text-[11px] font-normal text-fg-2 whitespace-nowrap"
                    >r/energy &middot; 12,402 posts</span
                  >
                </div>
                <div class="mt-1 text-[13px] leading-relaxed text-fg-2">
                  Subreddits, threads, and comments — streamed as they post.
                </div>
              </div>
            </div>
            <div
              class="flex gap-[14px] items-start py-[18px] border-t border-border-subtle hover:bg-bg-hover/30 transition-colors duration-200 -mx-2 px-2 rounded-md group"
            >
              <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-sm bg-bg-elevated border border-border-subtle text-fg-2 group-hover:border-border-accent group-hover:text-amber transition-colors duration-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  width="16"
                  height="16"
                >
                  <path
                    d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                  />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <div
                  class="flex justify-between items-baseline gap-3 flex-wrap text-[15px] font-semibold tracking-tight"
                >
                  LinkedIn posts<span
                    class="font-mono text-[11px] font-normal text-fg-2 whitespace-nowrap"
                    >3,120 posts tracked</span
                  >
                </div>
                <div class="mt-1 text-[13px] leading-relaxed text-fg-2">
                  Public posts and articles from the people and companies you follow.
                </div>
              </div>
            </div>
            <div
              class="flex gap-[14px] items-start py-[18px] border-t border-border-subtle hover:bg-bg-hover/30 transition-colors duration-200 -mx-2 px-2 rounded-md group"
            >
              <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-sm bg-bg-elevated border border-border-subtle text-fg-2 group-hover:border-border-accent group-hover:text-amber transition-colors duration-200"
                ><app-icon name="globe" [size]="16"
              /></span>
              <div class="flex-1 min-w-0">
                <div
                  class="flex justify-between items-baseline gap-3 flex-wrap text-[15px] font-semibold tracking-tight"
                >
                  Web crawls<span
                    class="font-mono text-[11px] font-normal text-fg-2 whitespace-nowrap"
                    >re-crawled &middot; 15 min</span
                  >
                </div>
                <div class="mt-1 text-[13px] leading-relaxed text-fg-2">
                  Sites and feeds, re-crawled on a schedule you set.
                </div>
              </div>
            </div>
          </div>
          <div class="lg:border-l lg:border-border-def lg:pl-14">
            <h3 class="text-[13px] font-medium tracking-[0.03em] text-fg-2 pb-[14px]">
              Files &amp; text
            </h3>
            <div
              class="flex gap-[14px] items-start py-[18px] border-t border-border-subtle hover:bg-bg-hover/30 transition-colors duration-200 -mx-2 px-2 rounded-md group"
            >
              <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-sm bg-bg-elevated border border-border-subtle text-fg-2 group-hover:border-border-accent group-hover:text-amber transition-colors duration-200"
                ><app-icon name="file-text" [size]="16"
              /></span>
              <div class="flex-1 min-w-0">
                <div
                  class="flex justify-between items-baseline gap-3 flex-wrap text-[15px] font-semibold tracking-tight"
                >
                  PDFs<span class="font-mono text-[11px] font-normal text-fg-2 whitespace-nowrap"
                    >IPCC-AR7.pdf &middot; 214 pages</span
                  >
                </div>
                <div class="mt-1 text-[13px] leading-relaxed text-fg-2">
                  Papers, reports, and filings — parsed page by page.
                </div>
              </div>
            </div>
            <div
              class="flex gap-[14px] items-start py-[18px] border-t border-border-subtle hover:bg-bg-hover/30 transition-colors duration-200 -mx-2 px-2 rounded-md group"
            >
              <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-sm bg-bg-elevated border border-border-subtle text-fg-2 group-hover:border-border-accent group-hover:text-amber transition-colors duration-200"
                ><app-icon name="file" [size]="16"
              /></span>
              <div class="flex-1 min-w-0">
                <div
                  class="flex justify-between items-baseline gap-3 flex-wrap text-[15px] font-semibold tracking-tight"
                >
                  Text &amp; Markdown files<span
                    class="font-mono text-[11px] font-normal text-fg-2 whitespace-nowrap"
                    >.txt &middot; .md &middot; .csv</span
                  >
                </div>
                <div class="mt-1 text-[13px] leading-relaxed text-fg-2">
                  Notes and exports from any tool, dropped in as-is.
                </div>
              </div>
            </div>
            <div
              class="flex gap-[14px] items-start py-[18px] border-t border-border-subtle hover:bg-bg-hover/30 transition-colors duration-200 -mx-2 px-2 rounded-md group"
            >
              <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-sm bg-bg-elevated border border-border-subtle text-fg-2 group-hover:border-border-accent group-hover:text-amber transition-colors duration-200"
                ><app-icon name="type" [size]="16"
              /></span>
              <div class="flex-1 min-w-0">
                <div
                  class="flex justify-between items-baseline gap-3 flex-wrap text-[15px] font-semibold tracking-tight"
                >
                  Raw text<span
                    class="font-mono text-[11px] font-normal text-fg-2 whitespace-nowrap"
                    >paste &rarr; mapped &middot; ~2 s</span
                  >
                </div>
                <div class="mt-1 text-[13px] leading-relaxed text-fg-2">
                  Paste anything; it's mapped into the network on the spot.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-border-subtle py-[clamp(64px,6vw,96px)]" id="product">
        <div class="font-mono text-[13px] font-medium tracking-[0.08em] text-amber">
          Inside Neuranet
        </div>
        <h2
          class="mt-[14px] text-[clamp(30px,2.8vw,42px)] font-bold tracking-tight max-w-[760px] text-fg-1"
        >
          One workspace for sources, clusters, and sentiment.
        </h2>
        <section
          class="bg-bg-surface border border-border-def rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.4)] grid grid-cols-1 lg:grid-cols-[200px_1fr] overflow-hidden lg:min-h-[620px] max-w-[1240px] mx-auto mt-10"
          aria-label="Neuranet product preview"
        >
          <aside
            class="border-b lg:border-b-0 lg:border-r border-border-subtle p-5 lg:p-[20px_12px] flex lg:flex-col gap-1 lg:gap-[2px] overflow-x-auto"
            style="-webkit-overflow-scrolling:touch"
          >
            <div class="flex items-center gap-2 px-2 pb-[18px] shrink-0 lg:block">
              <span
                class="w-6 h-6 grid place-items-center rounded-sm bg-bg-elevated border border-border-accent shadow-[0_0_6px_rgba(251,191,36,0.4)] text-amber"
                ><app-icon name="network" [size]="14"
              /></span>
              <span class="text-[15px] font-semibold tracking-tight text-fg-1 ml-2">Neuranet</span>
            </div>
            <div
              class="flex items-center gap-2.5 py-[9px] px-2.5 rounded-md text-[13px] font-medium tracking-[0.03em] text-fg-2 whitespace-nowrap bg-bg-selected text-fg-1"
              style="box-shadow:inset 2px 0 0 #fbbf24"
            >
              <app-icon name="network" [size]="16" class="text-amber" />Network explorer
            </div>
            <div
              class="flex items-center gap-2.5 py-[9px] px-2.5 rounded-md text-[13px] font-medium tracking-[0.03em] text-fg-2 whitespace-nowrap"
            >
              <app-icon name="circle-dot" [size]="16" />Topics
            </div>
            <div
              class="flex items-center gap-2.5 py-[9px] px-2.5 rounded-md text-[13px] font-medium tracking-[0.03em] text-fg-2 whitespace-nowrap"
            >
              <app-icon name="database" [size]="16" />Sources
            </div>
            <div
              class="flex items-center gap-2.5 py-[9px] px-2.5 rounded-md text-[13px] font-medium tracking-[0.03em] text-fg-2 whitespace-nowrap"
            >
              <app-icon name="search" [size]="16" />Search
            </div>
            <div
              class="flex items-center gap-2.5 py-[9px] px-2.5 rounded-md text-[13px] font-medium tracking-[0.03em] text-fg-2 whitespace-nowrap"
            >
              <app-icon name="layers" [size]="16" />Workspace
            </div>
            <div
              class="flex items-center gap-2.5 py-[9px] px-2.5 rounded-md text-[13px] font-medium tracking-[0.03em] text-fg-2 whitespace-nowrap"
            >
              <app-icon name="settings" [size]="16" />Settings
            </div>
          </aside>

          <div class="p-6 flex flex-col gap-4">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 class="text-[22px] font-semibold tracking-tight text-fg-1">
                  Climate research workspace
                </h2>
                <p class="mt-1 text-[13px] text-fg-2">
                  Mapping 12,847 nodes across 6 clusters &middot; last ingested 4 min ago
                </p>
              </div>
              <button
                class="inline-flex items-center gap-1.5 h-[34px] px-3.5 bg-amber text-fg-on-accent border-none rounded-md font-semibold text-[13px] cursor-pointer whitespace-nowrap"
                type="button"
              >
                <app-icon name="plus" [size]="14" />Run query
              </button>
            </div>

            <div
              class="flex-1 grid grid-cols-1 lg:grid-cols-[54fr_46fr] lg:grid-rows-[auto_1fr] gap-3.5"
            >
              <div
                class="bg-bg-elevated border border-border-def rounded-lg p-4 flex flex-col lg:row-span-2"
              >
                <div class="text-[12px] font-medium tracking-[0.03em] text-fg-2">
                  Network &mdash; 6 clusters
                </div>
                <div class="flex-1 relative my-3 min-h-[240px] lg:min-h-[280px]">
                  <svg
                    class="graph absolute inset-0 w-full h-full"
                    viewBox="0 0 420 300"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label="Topic network graph"
                  >
                    <g>
                      <line class="graph-edge" x1="210" y1="150" x2="120" y2="80" />
                      <line class="graph-edge" x1="210" y1="150" x2="310" y2="88" />
                      <line class="graph-edge" x1="210" y1="150" x2="96" y2="196" />
                      <line class="graph-edge" x1="210" y1="150" x2="300" y2="220" />
                      <line class="graph-edge" x1="120" y1="80" x2="60" y2="140" />
                      <line class="graph-edge" x1="310" y1="88" x2="368" y2="150" />
                      <line class="graph-edge" x1="310" y1="88" x2="300" y2="220" />
                      <line class="graph-edge" x1="96" y1="196" x2="160" y2="252" />
                      <line class="graph-edge" x1="120" y1="80" x2="190" y2="40" />
                      <line class="graph-edge" x1="368" y1="150" x2="340" y2="250" />
                      <line class="graph-edge" x1="60" y1="140" x2="96" y2="196" />
                      <line class="graph-edge" x1="190" y1="40" x2="270" y2="34" />
                      <line class="graph-edge" x1="160" y1="252" x2="240" y2="266" />
                      <line class="graph-edge" x1="300" y1="220" x2="240" y2="266" />
                    </g>
                    <circle class="selected-ring" cx="210" cy="150" r="19" />
                    <circle class="node-cyan" cx="210" cy="150" r="13" />
                    <circle class="node-rose" cx="120" cy="80" r="9" />
                    <circle class="node-emerald" cx="310" cy="88" r="11" />
                    <circle class="node-violet" cx="96" cy="196" r="10" />
                    <circle class="node-lime" cx="300" cy="220" r="9" />
                    <circle class="node-sky" cx="368" cy="150" r="7" />
                    <circle class="node-orange" cx="60" cy="140" r="6" />
                    <circle class="node-violet" cx="160" cy="252" r="7" />
                    <circle class="node-rose" cx="190" cy="40" r="6" />
                    <circle class="node-emerald" cx="270" cy="34" r="5" />
                    <circle class="node-sky" cx="340" cy="250" r="6" />
                    <circle class="node-cyan" cx="240" cy="266" r="5" />
                    <text class="graph-node-label" x="210" y="182" text-anchor="middle">
                      carbon pricing
                    </text>
                    <text class="graph-node-label" x="310" y="68" text-anchor="middle">
                      grid storage
                    </text>
                    <text class="graph-node-label" x="96" y="216" text-anchor="middle">
                      r/energy
                    </text>
                  </svg>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-[3px] border border-border-subtle rounded-sm text-[11px] tracking-[0.03em] text-fg-2 bg-bg-surface"
                    ><span class="w-[7px] h-[7px] rounded-full" style="background:#22d3ee"></span
                    >Tech</span
                  >
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-[3px] border border-border-subtle rounded-sm text-[11px] tracking-[0.03em] text-fg-2 bg-bg-surface"
                    ><span class="w-[7px] h-[7px] rounded-full" style="background:#34d399"></span
                    >Science</span
                  >
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-[3px] border border-border-subtle rounded-sm text-[11px] tracking-[0.03em] text-fg-2 bg-bg-surface"
                    ><span class="w-[7px] h-[7px] rounded-full" style="background:#fb7185"></span
                    >Policy</span
                  >
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-[3px] border border-border-subtle rounded-sm text-[11px] tracking-[0.03em] text-fg-2 bg-bg-surface"
                    ><span class="w-[7px] h-[7px] rounded-full" style="background:#a78bfa"></span
                    >Social</span
                  >
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-[3px] border border-border-subtle rounded-sm text-[11px] tracking-[0.03em] text-fg-2 bg-bg-surface"
                    ><span class="w-[7px] h-[7px] rounded-full" style="background:#a3e635"></span
                    >Climate</span
                  >
                </div>
                <div
                  class="mt-3 pt-3 border-t border-border-subtle flex justify-between items-center text-[12px] text-fg-2"
                >
                  <span>Selected: carbon pricing</span>
                  <span class="font-mono text-[11px]">47 connections</span>
                </div>
              </div>

              <div class="bg-bg-elevated border border-border-def rounded-lg p-4 flex flex-col">
                <div class="text-[12px] font-medium tracking-[0.03em] text-fg-2">What changed</div>
                <ul class="list-none mt-3.5 flex flex-col gap-3.5">
                  <li class="flex gap-3 items-start">
                    <span
                      class="w-7 h-7 shrink-0 grid place-items-center rounded-sm bg-bg-overlay border border-border-subtle text-amber"
                      ><app-icon name="trending-up" [size]="14"
                    /></span>
                    <div>
                      <div class="text-[13px] font-medium text-fg-1">
                        Sentiment shift <span class="font-mono">+0.42</span>
                      </div>
                      <div class="mt-0.5 text-[12px] text-fg-2">
                        r/energy cluster, past 24 hours
                      </div>
                    </div>
                  </li>
                  <li class="flex gap-3 items-start">
                    <span
                      class="w-7 h-7 shrink-0 grid place-items-center rounded-sm bg-bg-overlay border border-border-subtle text-amber"
                      ><app-icon name="database" [size]="14"
                    /></span>
                    <div>
                      <div class="text-[13px] font-medium text-fg-1">2 new sources connected</div>
                      <div class="mt-0.5 text-[12px] text-fg-2">LinkedIn posts, arXiv PDFs</div>
                    </div>
                  </li>
                  <li class="flex gap-3 items-start">
                    <span
                      class="w-7 h-7 shrink-0 grid place-items-center rounded-sm bg-bg-overlay border border-border-subtle text-amber"
                      ><app-icon name="circle-dot" [size]="14"
                    /></span>
                    <div>
                      <div class="text-[13px] font-medium text-fg-1">14 unclustered documents</div>
                      <div class="mt-0.5 text-[12px] text-fg-2">Review to assign clusters</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div class="bg-bg-elevated border border-border-def rounded-lg p-4 flex flex-col">
                <div class="text-[12px] font-medium tracking-[0.03em] text-fg-2">Insights</div>
                <p class="mt-2.5 text-[13px] leading-relaxed text-fg-1">
                  Carbon pricing discussion is trending positive across 3 clusters.
                </p>
                <div class="flex-1 min-h-[72px] relative mt-2.5">
                  <svg
                    class="absolute inset-0 w-full h-full"
                    viewBox="0 0 220 64"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Sentiment trend chart"
                  >
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="rgba(251,191,36,0.25)" />
                        <stop offset="100%" stop-color="rgba(251,191,36,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,46 L30,40 L60,44 L90,30 L120,34 L150,20 L180,24 L220,8 L220,64 L0,64 Z"
                      fill="url(#sparkFill)"
                    />
                    <polyline
                      points="0,46 30,40 60,44 90,30 120,34 150,20 180,24 220,8"
                      fill="none"
                      stroke="#fbbf24"
                      stroke-width="2"
                      style="filter:drop-shadow(0 0 4px rgba(251,191,36,0.5))"
                    />
                    <circle
                      cx="220"
                      cy="8"
                      r="3"
                      fill="#fbbf24"
                      style="filter:drop-shadow(0 0 5px rgba(251,191,36,0.7))"
                    />
                  </svg>
                </div>
                <div class="mt-2.5 flex items-center justify-between">
                  <button
                    class="inline-flex items-center gap-1.5 h-[30px] px-3 bg-transparent border border-border-def rounded-md text-fg-1 text-[12px] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-200"
                    type="button"
                  >
                    View insight
                  </button>
                  <span class="font-mono text-[12px] text-emerald">+0.38</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section
        class="border-t border-border-subtle py-16 sm:py-[clamp(48px,5vw,72px)_clamp(56px,5.5vw,80px)]"
        id="how"
      >
        <div class="font-mono text-[13px] font-medium tracking-[0.08em] text-amber">
          How it works
        </div>
        <h2
          class="mt-[14px] text-[clamp(28px,2.8vw,42px)] sm:text-[clamp(30px,2.8vw,42px)] font-bold tracking-tight max-w-[760px] text-fg-1"
        >
          From raw noise to a navigable network.
        </h2>

        <div
          class="how-stagewrap relative mt-8 overflow-hidden rounded-xl bg-bg-surface/60 border border-border-subtle"
          #stageWrap
          [style.height.px]="stageHeight()"
        >
          <div
            class="how-stage relative w-[1312px] h-[360px] origin-top-left"
            #stage
            [style.transform]="'scale(' + stageScale() + ')'"
          >
            <svg
              class="absolute inset-0 w-full h-full"
              viewBox="0 0 1312 360"
              preserveAspectRatio="none"
              role="img"
              aria-label="Source fragments converge into a topic network and resolve into a quantified answer"
            >
              <path
                d="M 300 44 C 420 56, 500 84, 596 108"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                stroke-width="1"
              />
              <path
                d="M 348 112 C 460 130, 560 152, 682 172"
                fill="none"
                stroke="rgba(251,191,36,0.22)"
                stroke-width="1"
              />
              <path
                d="M 296 184 C 410 200, 480 226, 584 246"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                stroke-width="1"
              />
              <path
                d="M 372 254 C 450 256, 510 254, 586 252"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                stroke-width="1"
              />
              <path
                d="M 318 322 C 460 314, 560 250, 686 192"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                stroke-width="1"
              />
              <line class="graph-edge" x1="700" y1="180" x2="600" y2="110" />
              <line class="graph-edge" x1="700" y1="180" x2="810" y2="120" />
              <line class="graph-edge" x1="700" y1="180" x2="590" y2="250" />
              <line class="graph-edge" x1="700" y1="180" x2="800" y2="255" />
              <line class="graph-edge" x1="700" y1="180" x2="870" y2="180" />
              <line class="graph-edge" x1="600" y1="110" x2="660" y2="48" />
              <line class="graph-edge" x1="810" y1="120" x2="870" y2="180" />
              <line class="graph-edge" x1="800" y1="255" x2="740" y2="318" />
              <line class="graph-edge" x1="590" y1="250" x2="600" y2="110" />
              <path
                d="M 716 176 C 840 140, 900 140, 996 144"
                fill="none"
                stroke="rgba(251,191,36,0.5)"
                stroke-width="1.5"
              />
              <circle
                cx="996"
                cy="144"
                r="3"
                fill="#fbbf24"
                style="filter:drop-shadow(0 0 5px rgba(251,191,36,0.7))"
              />
              <circle class="selected-ring" cx="700" cy="180" r="20" />
              <circle class="node-cyan" cx="700" cy="180" r="13" />
              <circle class="node-rose" cx="600" cy="110" r="9" />
              <circle class="node-emerald" cx="810" cy="120" r="10" />
              <circle class="node-violet" cx="590" cy="250" r="9" />
              <circle class="node-lime" cx="800" cy="255" r="8" />
              <circle class="node-sky" cx="870" cy="180" r="7" />
              <circle class="node-orange" cx="660" cy="48" r="6" />
              <circle class="node-violet" cx="740" cy="318" r="6" />
              <text class="how-glabel" x="700" y="216" text-anchor="middle">carbon pricing</text>
              <text class="how-glabel" x="810" y="102" text-anchor="middle">grid storage</text>
            </svg>
            <div class="how-shard" style="left:8px;top:28px;opacity:0.8">
              &ldquo;carbon border tariffs will reshape&hellip;&rdquo;<span class="src"
                >r/energy &middot; comment</span
              >
            </div>
            <div class="how-shard" style="left:64px;top:96px;opacity:0.55">
              Table 4 &mdash; levelized cost of storage<span class="src"
                >IPCC-AR7.pdf &middot; p.214</span
              >
            </div>
            <div class="how-shard" style="left:0;top:168px;opacity:0.7">
              &ldquo;utilities are lobbying against&hellip;&rdquo;<span class="src"
                >gridwatch.org &middot; article</span
              >
            </div>
            <div class="how-shard" style="left:84px;top:238px;opacity:0.5">
              &ldquo;$85/ton is the number that matters&rdquo;<span class="src"
                >r/climatepolicy &middot; thread</span
              >
            </div>
            <div class="how-shard" style="left:24px;top:306px;opacity:0.65">
              long-duration storage mandates<span class="src">docket-2026-114.pdf</span>
            </div>
            <div class="how-answer">
              <div class="q">
                <span class="hl">query:</span> &ldquo;who links carbon pricing to grid
                storage?&rdquo;
              </div>
              <div class="big">47 connections</div>
              <div class="meta">
                sentiment <span class="ok">+0.38</span> &middot; rising 3 weeks
              </div>
            </div>
          </div>
        </div>

        <div class="how-stack hidden max-lg:block mt-8 max-w-[480px]" aria-hidden="true">
          <div class="hs-shards">
            <div class="how-shard" style="opacity:0.8">
              &ldquo;carbon border tariffs will reshape&hellip;&rdquo;<span class="src"
                >r/energy &middot; comment</span
              >
            </div>
            <div class="how-shard" style="opacity:0.55">
              Table 4 &mdash; levelized cost of storage<span class="src"
                >IPCC-AR7.pdf &middot; p.214</span
              >
            </div>
            <div class="how-shard" style="opacity:0.7">
              &ldquo;utilities are lobbying against&hellip;&rdquo;<span class="src"
                >gridwatch.org &middot; article</span
              >
            </div>
          </div>
          <div class="hs-link"></div>
          <div class="hs-net">
            <svg viewBox="550 20 360 320" fill="none">
              <line class="graph-edge" x1="700" y1="180" x2="600" y2="110" />
              <line class="graph-edge" x1="700" y1="180" x2="810" y2="120" />
              <line class="graph-edge" x1="700" y1="180" x2="590" y2="250" />
              <line class="graph-edge" x1="700" y1="180" x2="800" y2="255" />
              <line class="graph-edge" x1="700" y1="180" x2="870" y2="180" />
              <line class="graph-edge" x1="600" y1="110" x2="660" y2="48" />
              <line class="graph-edge" x1="810" y1="120" x2="870" y2="180" />
              <line class="graph-edge" x1="800" y1="255" x2="740" y2="318" />
              <line class="graph-edge" x1="590" y1="250" x2="600" y2="110" />
              <circle class="selected-ring" cx="700" cy="180" r="20" />
              <circle class="node-cyan" cx="700" cy="180" r="13" />
              <circle class="node-rose" cx="600" cy="110" r="9" />
              <circle class="node-emerald" cx="810" cy="120" r="10" />
              <circle class="node-violet" cx="590" cy="250" r="9" />
              <circle class="node-lime" cx="800" cy="255" r="8" />
              <circle class="node-sky" cx="870" cy="180" r="7" />
              <circle class="node-orange" cx="660" cy="48" r="6" />
              <circle class="node-violet" cx="740" cy="318" r="6" />
              <text class="how-glabel" x="700" y="216" text-anchor="middle">carbon pricing</text>
              <text class="how-glabel" x="810" y="102" text-anchor="middle">grid storage</text>
            </svg>
          </div>
          <div class="hs-link"></div>
          <div class="how-answer">
            <div class="q">
              <span class="hl">query:</span> &ldquo;who links carbon pricing to grid storage?&rdquo;
            </div>
            <div class="big">47 connections</div>
            <div class="meta">sentiment <span class="ok">+0.38</span> &middot; rising 3 weeks</div>
          </div>
        </div>

        <div class="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-12">
          <div
            class="p-5 rounded-lg bg-bg-surface/50 border border-border-subtle hover:border-border-def transition-colors duration-200"
          >
            <div class="font-mono text-[13px] font-medium tracking-[0.08em] text-fg-3">01</div>
            <div class="w-7 h-0.5 bg-amber shadow-[0_0_6px_rgba(251,191,36,0.4)] my-2.5"></div>
            <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">Connect sources</h3>
            <p class="mt-1.5 text-[13px] leading-relaxed text-fg-2">
              Reddit, web, and PDFs &mdash; ingested continuously.
            </p>
          </div>
          <div
            class="p-5 rounded-lg bg-bg-surface/50 border border-border-subtle hover:border-border-def transition-colors duration-200"
          >
            <div class="font-mono text-[13px] font-medium tracking-[0.08em] text-fg-3">02</div>
            <div class="w-7 h-0.5 bg-amber shadow-[0_0_6px_rgba(251,191,36,0.4)] my-2.5"></div>
            <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">Structure emerges</h3>
            <p class="mt-1.5 text-[13px] leading-relaxed text-fg-2">
              Clusters, connections, and sentiment &mdash; no manual tagging.
            </p>
          </div>
          <div
            class="p-5 rounded-lg bg-bg-surface/50 border border-border-subtle hover:border-border-def transition-colors duration-200"
          >
            <div class="font-mono text-[13px] font-medium tracking-[0.08em] text-fg-3">03</div>
            <div class="w-7 h-0.5 bg-amber shadow-[0_0_6px_rgba(251,191,36,0.4)] my-2.5"></div>
            <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">Answers, quantified</h3>
            <p class="mt-1.5 text-[13px] leading-relaxed text-fg-2">
              Semantic queries return numbers, not guesses.
            </p>
          </div>
        </div>
      </section>

      <section
        class="border-t border-border-subtle py-16 sm:py-[clamp(56px,5.5vw,80px)_clamp(64px,6vw,96px)]"
        id="compare"
      >
        <h2
          class="text-[clamp(28px,2.8vw,42px)] sm:text-[clamp(30px,2.8vw,42px)] font-bold tracking-tight max-w-[800px] text-fg-1"
        >
          Notes hold what you saved. Neuranet shows what it means.
        </h2>
        <p class="mt-[14px] text-[15px] sm:text-[16px] leading-relaxed text-fg-2 max-w-[62ch]">
          Notion, Obsidian, and Roam are built to store pages. Neuranet is built to reveal the
          network across them.
        </p>
        <table class="w-full border-collapse mt-11 overflow-x-auto block lg:table">
          <thead>
            <tr>
              <th
                class="text-left text-[13px] font-medium tracking-[0.03em] text-fg-2 pb-[14px] pr-6"
              ></th>
              <th
                class="text-left text-[13px] font-medium tracking-[0.03em] text-fg-2 pb-[14px] px-6"
              >
                Notes apps
              </th>
              <th
                class="text-left text-[13px] font-medium tracking-[0.03em] text-amber pb-[14px] px-6"
              >
                Neuranet
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                class="w-[17%] text-[14px] font-semibold text-fg-1 py-[18px] pr-6 align-top border-t border-border-subtle"
              >
                Connections
              </td>
              <td
                class="w-[39%] text-[15px] leading-relaxed text-fg-2 py-[18px] px-6 align-top border-t border-border-subtle"
              >
                Manual back-links you create and maintain
              </td>
              <td
                class="w-[44%] text-[15px] leading-relaxed text-fg-1 py-[18px] px-6 align-top border-t border-border-subtle bg-[rgba(251,191,36,0.04)]"
              >
                Discovered automatically from the content
              </td>
            </tr>
            <tr>
              <td
                class="text-[14px] font-semibold text-fg-1 py-[18px] pr-6 align-top border-t border-border-subtle"
              >
                Ingestion
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-2 py-[18px] px-6 align-top border-t border-border-subtle"
              >
                Copy-paste, clippers, manual imports
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-1 py-[18px] px-6 align-top border-t border-border-subtle bg-[rgba(251,191,36,0.04)]"
              >
                Continuous &mdash; Reddit, LinkedIn, web, PDFs, and raw text
              </td>
            </tr>
            <tr>
              <td
                class="text-[14px] font-semibold text-fg-1 py-[18px] pr-6 align-top border-t border-border-subtle"
              >
                Sentiment
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-2 py-[18px] px-6 align-top border-t border-border-subtle"
              >
                Not tracked
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-1 py-[18px] px-6 align-top border-t border-border-subtle bg-[rgba(251,191,36,0.04)]"
              >
                Scored per topic, updated in real time
              </td>
            </tr>
            <tr>
              <td
                class="text-[14px] font-semibold text-fg-1 py-[18px] pr-6 align-top border-t border-border-subtle"
              >
                Questions
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-2 py-[18px] px-6 align-top border-t border-border-subtle"
              >
                Keyword search over saved pages
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-1 py-[18px] px-6 align-top border-t border-border-subtle bg-[rgba(251,191,36,0.04)]"
              >
                Semantic queries with quantified answers
              </td>
            </tr>
            <tr>
              <td
                class="text-[14px] font-semibold text-fg-1 py-[18px] pr-6 align-top border-t border-border-subtle"
              >
                Scale
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-2 py-[18px] px-6 align-top border-t border-border-subtle"
              >
                Slows past a few thousand pages
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-1 py-[18px] px-6 align-top border-t border-border-subtle bg-[rgba(251,191,36,0.04)]"
              >
                12.4M nodes mapped and counting
              </td>
            </tr>
            <tr>
              <td
                class="text-[14px] font-semibold text-fg-1 py-[18px] pr-6 align-top border-t border-border-subtle"
              >
                Upkeep
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-2 py-[18px] px-6 align-top border-t border-border-subtle"
              >
                Weekly gardening to stay useful
              </td>
              <td
                class="text-[15px] leading-relaxed text-fg-1 py-[18px] px-6 align-top border-t border-border-subtle bg-[rgba(251,191,36,0.04)]"
              >
                Self-updating as sources change
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        class="border-t border-border-subtle py-16 sm:py-[clamp(56px,5.5vw,80px)]"
        id="roadmap"
      >
        <h2
          class="text-[clamp(28px,2.8vw,42px)] sm:text-[clamp(30px,2.8vw,42px)] font-bold tracking-tight max-w-[800px] text-fg-1"
        >
          What's shipping next.
        </h2>
        <p class="mt-[14px] text-[15px] sm:text-[16px] leading-relaxed text-fg-2 max-w-[62ch]">
          Sequenced by quarter; dates firm up as early access expands.
        </p>
        <div class="mt-9">
          <div
            class="grid grid-cols-[120px_1fr_auto] gap-8 items-baseline py-5 border-t border-border-subtle"
          >
            <span class="font-mono text-[13px] text-fg-2 tracking-[0.03em]">Q2 2026</span>
            <div>
              <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">
                Alerts &amp; digests
              </h3>
              <p class="mt-1.5 text-[14px] leading-relaxed text-fg-2 max-w-[62ch]">
                Threshold alerts when sentiment moves; weekly cluster digests by email.
              </p>
            </div>
            <span
              class="font-mono text-[11px] tracking-[0.03em] px-2.5 py-1 rounded-sm border border-border-accent text-amber shadow-[0_0_6px_rgba(251,191,36,0.4)] whitespace-nowrap"
              >in development</span
            >
          </div>
          <div
            class="grid grid-cols-[120px_1fr_auto] gap-8 items-baseline py-5 border-t border-border-subtle"
          >
            <span class="font-mono text-[13px] text-fg-2 tracking-[0.03em]">Q3 2026</span>
            <div>
              <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">Team workspaces</h3>
              <p class="mt-1.5 text-[14px] leading-relaxed text-fg-2 max-w-[62ch]">
                Shared graphs, annotations, and saved queries for research groups.
              </p>
            </div>
            <span
              class="font-mono text-[11px] tracking-[0.03em] px-2.5 py-1 rounded-sm border border-border-accent text-amber shadow-[0_0_6px_rgba(251,191,36,0.4)] whitespace-nowrap"
              >in development</span
            >
          </div>
          <div
            class="grid grid-cols-[120px_1fr_auto] gap-8 items-baseline py-5 border-t border-border-subtle"
          >
            <span class="font-mono text-[13px] text-fg-2 tracking-[0.03em]">Q4 2026</span>
            <div>
              <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">API &amp; export</h3>
              <p class="mt-1.5 text-[14px] leading-relaxed text-fg-2 max-w-[62ch]">
                Query the graph programmatically; export GraphML, CSV, and embeddings.
              </p>
            </div>
            <span
              class="font-mono text-[11px] tracking-[0.03em] px-2.5 py-1 rounded-sm border border-border-def text-fg-2 whitespace-nowrap"
              >planned</span
            >
          </div>
          <div
            class="grid grid-cols-[120px_1fr_auto] gap-8 items-baseline py-5 border-t border-border-subtle"
          >
            <span class="font-mono text-[13px] text-fg-2 tracking-[0.03em]">S1 2026</span>
            <div>
              <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">More live sources</h3>
              <p class="mt-1.5 text-[14px] leading-relaxed text-fg-2 max-w-[62ch]">
                X threads, YouTube transcripts, and RSS join Reddit and LinkedIn.
              </p>
            </div>
            <span
              class="font-mono text-[11px] tracking-[0.03em] px-2.5 py-1 rounded-sm border border-border-def text-fg-2 whitespace-nowrap"
              >planned</span
            >
          </div>
          <div
            class="grid grid-cols-[120px_1fr_auto] gap-8 items-baseline py-5 border-t border-border-subtle border-b border-border-subtle"
          >
            <span class="font-mono text-[13px] text-fg-2 tracking-[0.03em]">2027</span>
            <div>
              <h3 class="text-[17px] font-semibold tracking-tight text-fg-1">Connector SDK</h3>
              <p class="mt-1.5 text-[14px] leading-relaxed text-fg-2 max-w-[62ch]">
                Build private connectors for internal wikis, data rooms, and archives.
              </p>
            </div>
            <span
              class="font-mono text-[11px] tracking-[0.03em] px-2.5 py-1 rounded-sm border border-border-def text-fg-2 whitespace-nowrap"
              >exploring</span
            >
          </div>
        </div>
      </section>

      <footer class="border-t border-border-subtle">
        <div
          class="pt-10 pb-8 flex items-center justify-between gap-6 text-[13px] text-fg-3 flex-col items-start gap-4 sm:flex-row"
        >
          <span>&copy; 2025 Neuranet</span>
          <a
            class="inline-flex items-center gap-2 text-fg-3 no-underline hover:text-fg-2 transition-colors duration-200"
            href="mailto:hello@neuranetai.app"
          >
            <app-icon name="mail" [size]="14" /><span class="font-mono text-[12px]"
              >hello&#64;neuranetai.app</span
            >
          </a>
          <div class="flex gap-6">
            <a
              class="text-fg-3 no-underline hover:text-fg-2 transition-colors duration-200"
              href="#"
              >Privacy</a
            >
            <a
              class="text-fg-3 no-underline hover:text-fg-2 transition-colors duration-200"
              href="#"
              >Terms</a
            >
          </div>
        </div>
      </footer>
    </div>
  </div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      scroll-behavior: smooth;
      background: #090e1c;
      color: #f1f5f9;
      font-family:
        'Space Grotesk',
        system-ui,
        -apple-system,
        sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .page::before {
      content: '';
      position: absolute;
      top: -480px;
      left: 50%;
      transform: translateX(-50%);
      width: 1600px;
      height: 1000px;
      background: radial-gradient(ellipse at center, rgba(251, 191, 36, 0.1), transparent 62%);
      opacity: 0.6;
      pointer-events: none;
    }

    .hero-svg {
      display: block;
      width: 100%;
      height: auto;
      mask-image: radial-gradient(90% 90% at 55% 48%, black 42%, transparent 92%);
      -webkit-mask-image: radial-gradient(90% 90% at 55% 48%, black 42%, transparent 92%);
    }

    .node-cyan {
      fill: #22d3ee;
      filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.55));
    }
    .node-violet {
      fill: #a78bfa;
      filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.55));
    }
    .node-rose {
      fill: #fb7185;
      filter: drop-shadow(0 0 6px rgba(251, 113, 133, 0.55));
    }
    .node-emerald {
      fill: #34d399;
      filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.55));
    }
    .node-orange {
      fill: #fb923c;
      filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
    }
    .node-sky {
      fill: #38bdf8;
      filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.55));
    }
    .node-lime {
      fill: #a3e635;
      filter: drop-shadow(0 0 6px rgba(163, 230, 53, 0.55));
    }
    .node-pink {
      fill: #f472b6;
      filter: drop-shadow(0 0 6px rgba(244, 114, 182, 0.55));
    }

    .selected-ring {
      fill: none;
      stroke: #fbbf24;
      stroke-width: 1.5;
      filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5));
    }

    .graph-edge {
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 1;
    }

    .graph-node-label {
      font-family:
        'Space Grotesk',
        system-ui,
        -apple-system,
        sans-serif;
      font-size: 10px;
      letter-spacing: 0.03em;
      fill: #94a3b8;
    }

    .how-shard {
      position: absolute;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.5;
      color: rgba(241, 245, 249, 0.78);
    }
    .how-shard .src {
      display: block;
      font-size: 10px;
      color: #475569;
      margin-top: 1px;
    }
    .how-glabel {
      font-family:
        'Space Grotesk',
        system-ui,
        -apple-system,
        sans-serif;
      font-size: 10px;
      letter-spacing: 0.03em;
      fill: #94a3b8;
    }
    .how-answer {
      position: absolute;
      left: 1000px;
      top: 116px;
      width: 312px;
    }
    .how-answer .q {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.7;
      color: #94a3b8;
    }
    .how-answer .q .hl {
      color: #fbbf24;
    }
    .how-answer .big {
      margin-top: 12px;
      font-size: 30px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #f1f5f9;
    }
    .how-answer .meta {
      margin-top: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #94a3b8;
    }
    .how-answer .meta .ok {
      color: #34d399;
    }
    .how-stack {
      display: none;
      margin-top: 32px;
      max-width: 480px;
    }
    .how-stack .how-shard {
      position: static;
      font-size: 12px;
    }
    .how-stack .how-shard .src {
      font-size: 11px;
    }
    .hs-shards {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .hs-link {
      width: 1px;
      height: 36px;
      margin: 14px 0 14px 19px;
      background: linear-gradient(to bottom, transparent, rgba(251, 191, 36, 0.55));
    }
    .hs-net svg {
      display: block;
      width: 100%;
      max-width: 400px;
      height: auto;
    }
    .how-stack .how-answer {
      position: static;
      width: auto;
      max-width: 360px;
    }

    @media (max-width: 1280px) {
      .hero-svg {
        max-height: 420px;
      }
    }

    @media (max-width: 1024px) {
      .how-stagewrap {
        display: none;
      }
      .how-stack {
        display: block;
      }
    }

    @media (max-width: 760px) {
      .page::before {
        top: -320px;
        height: 700px;
      }
      .how-answer {
        position: static;
        width: auto;
        max-width: 360px;
      }
      .how-stack .how-answer {
        position: static;
        width: auto;
      }
    }
  `,
})
export class LandingScreenComponent {
  private readonly api = inject(ApiService);

  protected readonly email = signal('');
  protected readonly submitted = signal(false);
  protected readonly mobileNavOpen = signal(false);

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
