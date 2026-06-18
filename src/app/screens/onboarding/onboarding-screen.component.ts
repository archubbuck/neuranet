import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { AppStore } from '../../data/app.store';
import { IconComponent } from '../../ui/primitives/icon.component';
import { AddSourceModalComponent } from '../sources/add-source-modal.component';

/**
 * Empty-state screen shown when there are no derived nodes
 * yet. Ports the React `OnboardingScreen` (52bd8bb2-*.js) but with a smaller
 * surface area in Phase 2 — the ghost-graph animation lands in Phase 3.
 *
 * Two actions:
 *   • "Add first source" — opens the AddSourceModal (Reddit only for now).
 *   • "Explore demo data" — creates a curated Reddit source and ingests
 *     it inline. Uses an Ask-Reddit thread on data science so the layout has
 *     enough variety to be interesting.
 */
@Component({
  selector: 'app-onboarding-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AddSourceModalComponent],
  template: `
    <div class="flex-1 flex items-center justify-center p-6 bg-bg-base font-display">
      <div
        class="flex flex-col items-center gap-4 p-9 max-w-[380px] w-full text-center bg-[rgba(9,14,28,0.86)] border border-border-def backdrop-blur-lg"
        style="box-shadow: 0 12px 48px rgba(0,0,0,0.5)"
      >
        <div
          class="w-[46px] h-[46px] rounded-full bg-amber-dim border-[1.5px] border-amber-border flex items-center justify-center"
        >
          <app-icon name="network" [size]="22" color="var(--c-amber)" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-fg-1 mb-2 tracking-tight">Your network is empty</h1>
          <p class="text-[13px] text-fg-3 leading-relaxed">
            Add a source to start populating your knowledge graph. Neuranet ingests Reddit threads
            today and grows from there.
          </p>
        </div>

        @if (errorMessage()) {
          <p
            class="text-xs text-rose bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.25)] px-3 py-2 w-full"
          >
            {{ errorMessage() }}
          </p>
        }

        @if (store.ingesting()) {
          <div class="flex items-center gap-[10px] text-fg-3 text-[13px]">
            <span
              class="block w-[14px] h-[14px] rounded-full border-2 border-amber/25 animate-[spin_800ms_linear_infinite]"
              style="border-top-color: var(--c-amber)"
            ></span>
            <span>Building demo data…</span>
          </div>
        } @else {
          <button
            class="inline-flex items-center justify-center gap-2 font-display cursor-pointer border-none text-[13px] font-semibold bg-amber text-[#1a1208] px-[22px] py-3 hover:bg-amber-hover"
            type="button"
            (click)="modal.open()"
          >
            <app-icon name="plus" [size]="14" />
            <span>Add first source</span>
          </button>
          <button
            class="inline-flex items-center justify-center gap-2 font-display cursor-pointer border-none text-xs bg-transparent text-fg-4 px-1 py-[4px]"
            type="button"
            (click)="loadDemo()"
          >
            or <span class="text-info">explore a demo dataset</span>
          </button>
        }
      </div>
    </div>

    <app-add-source-modal #modal />
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class OnboardingScreenComponent {
  readonly store = inject(AppStore);

  @ViewChild('modal') modal!: AddSourceModalComponent;

  readonly errorMessage = signal<string | null>(null);

  /**
   * Seeds Neuranet with a curated public Reddit thread so the
   * graph has interesting structure. Uses a stable r/datascience question on
   * the field's future — no API key required.
   */
  async loadDemo(): Promise<void> {
    const DEMO_URL =
      'https://www.reddit.com/r/datascience/comments/1d4kvw3/what_will_data_science_look_like_in_the_next_5/';
    this.errorMessage.set(null);
    const source = await this.store.addSource({
      sourceType: 'reddit',
      config: { threadUrl: DEMO_URL },
    });
    if (!source) {
      this.errorMessage.set('Could not create demo source.');
      return;
    }
    await this.store.fetchSource(source.id);
  }
}
