import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Settings placeholder. After the workspace concept was removed there is no
 * per-tenant metadata left to edit; the screen now renders informational
 * copy so the navigation entry still resolves.
 */
@Component({
  selector: 'app-settings-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex-1 px-8 py-9 overflow-y-auto font-display text-fg-2 max-w-[720px] w-full mx-auto flex flex-col gap-6"
    >
      <header>
        <h1 class="text-[22px] font-bold text-fg-1 tracking-tight m-0 mb-1.5">Settings</h1>
        <p class="text-[13px] text-fg-3 m-0">Application preferences.</p>
      </header>
      <section
        class="bg-bg-elevated border border-border-subtle p-[22px_24px] flex flex-col gap-[10px]"
      >
        <h2 class="text-sm font-semibold text-fg-1 m-0">Coming soon</h2>
        <p class="text-xs text-fg-3 m-0 leading-relaxed">
          User preferences and account settings will live here in a future release. For now the app
          runs against a single global dataset.
        </p>
      </section>
    </div>
  `,
  styles: ':host { display: flex; flex: 1; min-height: 0; }',
})
export class SettingsScreenComponent {}
