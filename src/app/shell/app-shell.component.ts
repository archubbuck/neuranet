import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ViewportService } from '../core/viewport.service';
import { SidebarComponent } from './sidebar.component';
import { MobileNavComponent } from './mobile-nav.component';
import { ToastComponent } from '../ui/overlays/toast.component';

/**
 * Top-level shell. On wide viewports, renders the sidebar to the left of the
 * router outlet; on mobile, renders the outlet above a bottom tab bar.
 * Mirrors the prototype's `App` layout switch.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, MobileNavComponent, ToastComponent],
  template: `
    @if (isMobile()) {
      <div class="flex flex-col h-full w-full">
        <main class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden"><router-outlet /></main>
        <app-mobile-nav />
      </div>
    } @else {
      <div class="flex flex-row h-full w-full">
        <app-sidebar />
        <main class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden"><router-outlet /></main>
      </div>
    }
    <app-toast />
  `,
  styles:
    ':host { display: block; height: 100%; width: 100%; background: var(--color-bg-base); color: var(--color-fg-1); }',
})
export class AppShellComponent {
  private readonly viewport = inject(ViewportService);
  protected readonly isMobile = computed(() => this.viewport.state().isMobile);
}
