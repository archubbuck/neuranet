import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { AppStore } from './app.store';
import type { AuthUser } from './types';

/**
 * Central auth state store.
 *
 * Signals:
 *   - `user` — current user profile (null when logged out)
 *   - `isAuthenticated` — derived from user not null
 *   - `isLoading` — true while the initial session check is in flight
 *
 * Lifecycle:
 *   - `checkSession()` is called once during app bootstrap to detect an
 *     existing session cookie. On success it hydrates the user signal and
 *     triggers `AppStore.loadAll()` to fetch the app's data.
 *   - `signIn(provider)` delegates to `AuthService.signIn()` which
 *     redirects the browser to the OAuth provider.
 *   - `signOut()` clears the session and resets local data.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService);
  private readonly appStore = inject(AppStore);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _isLoading = signal(true);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Check for an existing session. Call once during app bootstrap.
   * If the user is authenticated, triggers `AppStore.loadAll()`.
   */
  async checkSession(): Promise<void> {
    this._isLoading.set(true);
    try {
      const user = await this.auth.checkSession();
      if (user) {
        this._user.set(user);
        (window as unknown as Record<string, unknown>)['__neuranet_authenticated'] = true;
        // Load app data now that we know who the user is.
        await this.appStore.loadAll();
      }
    } catch {
      this._user.set(null);
      (window as unknown as Record<string, unknown>)['__neuranet_authenticated'] = false;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Sign in with a social provider. Delegates to AuthService which
   * redirects the browser to the OAuth flow.
   */
  signIn(provider: string): void {
    this.auth.signIn(provider);
  }

  /**
   * Sign in with email and password.
   * Updates the user signal on success so the auth guard lets the user through.
   * Throws on failure so callers can show an error message.
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const user = await this.auth.signInWithEmail(email, password);
    this._user.set(user);
    (window as unknown as Record<string, unknown>)['__neuranet_authenticated'] = true;
    await this.appStore.loadAll();
    return user;
  }

  /**
   * Sign up with email, password, and display name.
   * Updates the user signal on success so the auth guard lets the user through.
   * Throws on failure so callers can show an error message.
   */
  async signUpWithEmail(email: string, password: string, name: string): Promise<AuthUser> {
    const user = await this.auth.signUpWithEmail(email, password, name);
    this._user.set(user);
    (window as unknown as Record<string, unknown>)['__neuranet_authenticated'] = true;
    await this.appStore.loadAll();
    return user;
  }

  /**
   * Sign out and clear all local data.
   */
  async signOut(): Promise<void> {
    this._user.set(null);
    (window as unknown as Record<string, unknown>)['__neuranet_authenticated'] = false;
    this.appStore.resetData();
    await this.auth.signOut();
  }
}
