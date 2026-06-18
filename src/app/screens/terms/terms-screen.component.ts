import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Stub terms of service page — placeholder for the public market site.
 * Content to be filled by the product/legal team.
 */
@Component({
  selector: 'app-terms-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="header">
        <a routerLink="/" class="logo">Neuranet</a>
        <nav>
          <a routerLink="/login">Sign In</a>
        </nav>
      </header>
      <main class="content">
        <h1>Terms of Service</h1>
        <p>Coming soon — our terms of service will be published here.</p>
      </main>
      <footer class="footer">
        <a routerLink="/roadmap">Roadmap</a>
        <a routerLink="/privacy">Privacy</a>
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #090e1c;
        color: #f1f5f9;
        font-family: 'Space Grotesk', sans-serif;
      }
      .page {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .logo {
        font-size: 1.25rem;
        font-weight: 600;
        color: #22d3ee;
        text-decoration: none;
      }
      nav {
        display: flex;
        gap: 1.5rem;
      }
      nav a {
        color: #94a3b8;
        text-decoration: none;
        font-size: 0.875rem;
      }
      nav a:hover {
        color: #f1f5f9;
      }
      .content {
        flex: 1;
        padding: 4rem 2rem;
        max-width: 48rem;
        margin: 0 auto;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      p {
        color: #94a3b8;
        line-height: 1.6;
      }
      .footer {
        display: flex;
        gap: 1.5rem;
        padding: 1.5rem 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        justify-content: center;
      }
      .footer a {
        color: #64748b;
        text-decoration: none;
        font-size: 0.8125rem;
      }
      .footer a:hover {
        color: #94a3b8;
      }
    `,
  ],
})
export class TermsScreenComponent {}
