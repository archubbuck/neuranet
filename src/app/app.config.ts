import {
  ApplicationConfig,
  APP_INITIALIZER,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthStore } from './data/auth.store';

/**
 * Application providers. Zoneless change detection + signal-driven UI
 * everywhere; component input binding so router `data`/`params` flow into
 * `input()` signals on routed components.
 *
 * Auth bootstrap: the `APP_INITIALIZER` runs before the first component
 * renders, checking for an existing session cookie. This ensures the
 * `AuthStore.isAuthenticated` signal is populated before any route guard
 * or component reads it.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const authStore = inject(AuthStore);
        return () => authStore.checkSession();
      },
    },
  ],
};
