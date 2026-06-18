import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Stub roadmap page — placeholder for the public market site.
 * Content to be filled by the product team.
 */
@Component({
  selector: 'app-roadmap-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col min-h-screen">
      <header
        class="flex justify-between items-center px-8 py-4 border-b border-[rgba(255,255,255,0.08)]"
      >
        <a routerLink="/" class="text-xl font-semibold text-cyan-400 no-underline">Neuranet</a>
        <nav class="flex gap-6">
          <a routerLink="/login" class="text-fg-2 no-underline text-sm hover:text-fg-1">Sign In</a>
        </nav>
      </header>
      <main class="flex-1 px-8 py-16 max-w-[48rem] mx-auto">
        <h1 class="text-[2rem] mb-4">Roadmap</h1>
        <p class="text-fg-2 leading-relaxed">
          Coming soon — our product roadmap will be published here.
        </p>
      </main>
      <footer class="flex gap-6 px-8 py-6 border-t border-[rgba(255,255,255,0.08)] justify-center">
        <a routerLink="/privacy" class="text-slate-500 no-underline text-[13px] hover:text-fg-2"
          >Privacy</a
        >
        <a routerLink="/terms" class="text-slate-500 no-underline text-[13px] hover:text-fg-2"
          >Terms</a
        >
      </footer>
    </div>
  `,
  styles:
    ':host { display: block; min-height: 100vh; background: var(--color-bg-base); color: var(--color-fg-1); font-family: var(--font-display); }',
})
export class RoadmapScreenComponent {}
