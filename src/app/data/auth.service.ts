import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AuthUser } from './types';

const API = '/api';

/**
 * Authentication service that mediates between the Angular app and Neon Auth
 * (Better Auth) through the Express backend.
 *
 * Flow:
 *   1. `signIn(provider)` redirects the browser to the Neon Auth OAuth
 *      endpoint. After successful authentication the user is redirected back
 *      to the app with a session cookie set by Neon Auth.
 *   2. `checkSession()` verifies the session cookie by calling the backend's
 *      `/api/auth/me` endpoint. Returns the user profile if authenticated.
 *   3. `signOut()` clears the session and redirects to the login page.
 *
 * The backend proxies all `/api/auth/*` requests to the Neon Auth managed
 * Better Auth service, which handles OAuth callbacks and session cookies.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /**
   * Redirect the browser to the Neon Auth OAuth flow for the given provider.
   *
   * After the OAuth handshake completes, Neon Auth redirects back to the app
   * with a session cookie set. The app's login page will then detect the
   * session and proceed.
   */
  signIn(provider: string): void {
    // The backend proxies to Neon Auth which handles the OAuth flow.
    // Redirecting to the backend auth endpoint starts the OAuth dance.
    window.location.href = `${API}/auth/sign-in/${provider}`;
  }

  /**
   * Check the current session by calling the backend's me endpoint.
   * Returns the authenticated user, or null if no session exists.
   */
  async checkSession(): Promise<AuthUser | null> {
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${API}/auth/me`, { withCredentials: true }),
      );
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Sign in with email and password.
   * POSTs to the backend which validates credentials via Better Auth.
   * On success the backend sets a session cookie; returns the user profile.
   * On failure throws an error with the server's message.
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>(
        `${API}/auth/sign-in/email`,
        { email, password },
        { withCredentials: true },
      ),
    );
    return user;
  }

  /**
   * Sign up (register) with email, password, and display name.
   * POSTs to the backend which creates the user via Better Auth.
   * On success the backend sets a session cookie; returns the new user profile.
   * On failure throws an error with the server's message.
   */
  async signUpWithEmail(email: string, password: string, name: string): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>(
        `${API}/auth/sign-up/email`,
        { email, password, name },
        { withCredentials: true },
      ),
    );
    return user;
  }

  /**
   * Fetch the list of available OAuth providers from the backend.
   * Only providers with configured credentials are returned.
   */
  async getAvailableProviders(): Promise<{ id: string; label: string }[]> {
    try {
      return await firstValueFrom(
        this.http.get<{ id: string; label: string }[]>(`${API}/auth/providers`),
      );
    } catch {
      return [];
    }
  }

  /**
   * Sign out the current session via the backend, then redirect to login.
   */
  async signOut(): Promise<void> {
    // Redirect to the sign-out endpoint which clears the session cookie.
    window.location.href = `${API}/auth/sign-out`;
  }
}
