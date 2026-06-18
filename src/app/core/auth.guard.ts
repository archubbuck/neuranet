import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { AuthStore } from '../data/auth.store';

/**
 * Route guard that verifies the user is authenticated.
 *
 * Checks the `AuthStore` which maintains a synchronous `isAuthenticated`
 * signal (updated asynchronously during bootstrap). If not yet resolved,
 * the guard triggers `AuthStore.checkSession()` and waits for the result.
 * If the user is not authenticated, they are redirected to `/login` with
 * a `returnUrl` parameter so the auth flow can navigate back after login.
 *
 * Usage:
 * ```ts
 * {
 *   path: '',
 *   canActivate: [authGuard],
 *   children: [ … protected routes … ],
 * }
 * ```
 */
export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const authStore = inject(AuthStore);

  // If the store hasn't checked the session yet, do it now.
  if (authStore.isLoading()) {
    await authStore.checkSession();
  }

  if (authStore.isAuthenticated()) {
    return true;
  }

  const returnUrl = state.url || '/network';
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
};
