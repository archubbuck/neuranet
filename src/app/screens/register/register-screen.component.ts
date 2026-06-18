import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthStore } from '../../data/auth.store';
import { ToastService } from '../../core/toast.service';
import { ToastComponent } from '../../ui/overlays/toast.component';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NG_CLUSTER_COLORS: Record<string, string> = {
  cyan: '#22D3EE',
  violet: '#A78BFA',
  rose: '#FB7185',
  emerald: '#34D399',
  orange: '#FB923C',
  sky: '#38BDF8',
  pink: '#F472B6',
  lime: '#A3E635',
};
const NG_CLUSTER_KEYS = ['cyan', 'violet', 'emerald', 'sky', 'rose', 'pink', 'lime', 'orange'];

interface GraphNode {
  x: number;
  y: number;
  r: number;
  color: string;
  phase: number;
  driftX: number;
  driftY: number;
  speed: number;
  twinkle: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function buildGraph(count: number, w: number, h: number) {
  let s = 7919;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const nodes: GraphNode[] = [];
  for (let i = 0; i < count; i++) {
    const cluster = NG_CLUSTER_KEYS[Math.floor(rand() * NG_CLUSTER_KEYS.length)];
    const isHub = rand() > 0.78;
    nodes.push({
      x: rand() * w,
      y: rand() * h,
      r: isHub ? 4 + rand() * 4 : 1.4 + rand() * 2.2,
      color: NG_CLUSTER_COLORS[cluster],
      phase: rand() * Math.PI * 2,
      driftX: rand() - 0.5,
      driftY: rand() - 0.5,
      speed: 0.15 + rand() * 0.5,
      twinkle: 0.6 + rand() * 0.4,
    });
  }
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x,
        dy = nodes[i].y - nodes[j].y;
      dists.push({ j, d: dx * dx + dy * dy });
    }
    dists.sort((a, b) => a.d - b.d);
    const links = nodes[i].r > 4 ? 3 : 1 + Math.floor(rand() * 2);
    for (let k = 0; k < Math.min(links, dists.length); k++) {
      if (dists[k].j > i) edges.push([i, dists[k].j]);
    }
  }
  return { nodes, edges };
}

@Component({
  selector: 'app-register-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ToastComponent],
  template: `
    <div class="page">
      <!-- Left: animated graph panel (desktop only) -->
      <div class="graph-panel" aria-hidden="true">
        <canvas #graphCanvas class="graph-canvas"></canvas>
        <div class="graph-overlay"></div>
        <div class="graph-wordmark">
          <div class="brand-mark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FBBF24"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="5" r="2" />
              <circle cx="19" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="5" cy="12" r="2" />
              <path d="M6.3 6.3 9 9" />
              <path d="m15 9 2.7-2.7" />
              <path d="M6.3 17.7 9 15" />
              <path d="m15 15 2.7 2.7" />
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">Neuranet</span>
            <span class="brand-sub">Knowledge graph</span>
          </div>
        </div>
        <div class="graph-footer">
          <h2 class="tagline">Map the hidden structure of everything you read.</h2>
          <p class="tagline-sub">
            Ingest Reddit, the web, and PDFs — then explore topics, clusters, and sentiment as one
            interactive network.
          </p>
        </div>
      </div>

      <!-- Right: form panel -->
      <div class="form-panel">
        <div class="form-center">
          <div class="form-content">
            <div class="form-wordmark">
              <div class="brand-mark">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FBBF24"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="19" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                  <circle cx="5" cy="12" r="2" />
                  <path d="M6.3 6.3 9 9" />
                  <path d="m15 9 2.7-2.7" />
                  <path d="M6.3 17.7 9 15" />
                  <path d="m15 15 2.7 2.7" />
                </svg>
              </div>
              <div class="brand-text">
                <span class="brand-name">Neuranet</span>
                <span class="brand-sub">Knowledge graph</span>
              </div>
            </div>

            <div class="form-heading">
              <h1 class="form-title">Create account</h1>
              <p class="form-subtitle">Start exploring your research network.</p>
            </div>

            <form (submit)="submitForm($event)" novalidate>
              <!-- Name -->
              <div class="field" [class.has-error]="!!nameError()">
                <label for="nr-name" class="field-label">Name</label>
                <div class="field-wrap" [class.focused]="nameFocused()">
                  <svg
                    class="field-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    [attr.stroke]="nameFocused() ? '#FBBF24' : '#475569'"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="15"
                    height="15"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="nr-name"
                    type="text"
                    autocomplete="name"
                    placeholder="Your name"
                    class="field-input"
                    [value]="name()"
                    (input)="name.set($any($event.target).value)"
                    (focus)="nameFocused.set(true)"
                    (blur)="nameFocused.set(false)"
                  />
                </div>
                @if (nameError()) {
                  <div class="field-error">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FB7185"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="12"
                      height="12"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {{ nameError() }}
                  </div>
                }
              </div>

              <!-- Email -->
              <div class="field" [class.has-error]="!!emailError()">
                <label for="nr-email" class="field-label">Email</label>
                <div class="field-wrap" [class.focused]="emailFocused()">
                  <svg
                    class="field-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    [attr.stroke]="emailFocused() ? '#FBBF24' : '#475569'"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="15"
                    height="15"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    id="nr-email"
                    type="email"
                    autocomplete="email"
                    placeholder="name@company.com"
                    class="field-input"
                    [value]="email()"
                    (input)="email.set($any($event.target).value)"
                    (focus)="emailFocused.set(true)"
                    (blur)="emailFocused.set(false)"
                  />
                </div>
                @if (emailError()) {
                  <div class="field-error">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FB7185"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="12"
                      height="12"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {{ emailError() }}
                  </div>
                }
              </div>

              <!-- Password -->
              <div class="field" [class.has-error]="!!passwordError()">
                <label for="nr-password" class="field-label">Password</label>
                <div class="field-wrap" [class.focused]="passwordFocused()">
                  <svg
                    class="field-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    [attr.stroke]="passwordFocused() ? '#FBBF24' : '#475569'"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="15"
                    height="15"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="nr-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="At least 8 characters"
                    class="field-input pw-input"
                    [value]="password()"
                    (input)="password.set($any($event.target).value)"
                    (focus)="passwordFocused.set(true)"
                    (blur)="passwordFocused.set(false)"
                  />
                  <button
                    type="button"
                    class="pw-toggle"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    (click)="showPassword.update((v) => !v)"
                  >
                    @if (showPassword()) {
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#475569"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        width="15"
                        height="15"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path
                          d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                        />
                        <path
                          d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                        />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    } @else {
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#475569"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        width="15"
                        height="15"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>
                @if (passwordError()) {
                  <div class="field-error">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FB7185"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="12"
                      height="12"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {{ passwordError() }}
                  </div>
                }
              </div>

              <!-- Confirm password -->
              <div class="field" [class.has-error]="!!confirmError()">
                <label for="nr-confirm" class="field-label">Confirm password</label>
                <div class="field-wrap" [class.focused]="confirmFocused()">
                  <svg
                    class="field-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    [attr.stroke]="confirmFocused() ? '#FBBF24' : '#475569'"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="15"
                    height="15"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="nr-confirm"
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Re-enter password"
                    class="field-input pw-input"
                    [value]="confirm()"
                    (input)="confirm.set($any($event.target).value)"
                    (focus)="confirmFocused.set(true)"
                    (blur)="confirmFocused.set(false)"
                  />
                </div>
                @if (confirmError()) {
                  <div class="field-error">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FB7185"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="12"
                      height="12"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {{ confirmError() }}
                  </div>
                }
              </div>

              <button type="submit" class="btn-primary" [disabled]="status() === 'submitting'">
                @if (status() === 'submitting') {
                  <span class="spinner"></span>
                  Creating account…
                } @else {
                  Create account
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#06090F"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="16"
                    height="16"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                }
              </button>
            </form>

            <p class="signin-prompt">
              Already have an account?
              <a routerLink="/login" class="terms-link">Sign in</a>.
            </p>
          </div>
        </div>
      </div>
    </div>

    <app-toast />
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--font-display, 'Space Grotesk', sans-serif);
      }

      .page {
        display: flex;
        width: 100%;
        min-height: 100dvh;
        background: #090e1c;
      }

      @media (min-width: 768px) {
        .page {
          height: 100dvh;
          overflow: hidden;
        }
      }

      .graph-panel {
        display: none;
        flex: 1;
        min-width: 0;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #0b1120 0%, #090e1c 60%, #06090f 100%);
      }
      @media (min-width: 768px) {
        .graph-panel {
          display: block;
        }
      }

      .graph-canvas {
        position: absolute;
        inset: 0;
        display: block;
      }

      .graph-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(
          ellipse 90% 90% at 30% 40%,
          rgba(6, 9, 15, 0) 40%,
          rgba(6, 9, 15, 0.6) 100%
        );
        pointer-events: none;
      }

      .graph-wordmark {
        position: absolute;
        top: 36px;
        left: 40px;
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .graph-footer {
        position: absolute;
        left: 40px;
        bottom: 44px;
        right: 40px;
        max-width: 440px;
      }

      .tagline {
        font-size: 30px;
        font-weight: 600;
        color: #f1f5f9;
        letter-spacing: -0.03em;
        line-height: 1.18;
        margin: 0;
      }

      .tagline-sub {
        font-size: 14px;
        color: #94a3b8;
        line-height: 1.6;
        margin: 14px 0 0;
        max-width: 380px;
      }

      .form-panel {
        width: 100%;
        background: #0b1120;
        flex-shrink: 0;
      }
      @media (min-width: 768px) {
        .form-panel {
          width: 480px;
          height: 100%;
          overflow-y: auto;
          border-left: 1px solid rgba(255, 255, 255, 0.09);
        }
      }

      .form-center {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 24px;
        box-sizing: border-box;
      }
      @media (min-width: 768px) {
        .form-center {
          padding: 40px 56px;
          min-height: 100%;
        }
      }

      .form-content {
        width: 100%;
        max-width: 340px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .form-wordmark {
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .brand-mark {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.28);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow:
          0 0 18px rgba(251, 191, 36, 0.18),
          inset 0 0 12px rgba(251, 191, 36, 0.06);
      }
      .brand-mark svg {
        width: 17px;
        height: 17px;
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1;
      }
      .brand-name {
        font-size: 17px;
        font-weight: 600;
        color: #f1f5f9;
        letter-spacing: -0.03em;
      }
      .brand-sub {
        font-size: 10px;
        font-weight: 500;
        color: #475569;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-top: 5px;
      }

      .form-heading {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-title {
        font-size: 24px;
        font-weight: 600;
        color: #f1f5f9;
        letter-spacing: -0.025em;
        margin: 0;
        line-height: 1.2;
      }
      .form-subtitle {
        font-size: 13.5px;
        color: #94a3b8;
        margin: 0;
        line-height: 1.5;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .field-label {
        font-size: 12px;
        font-weight: 500;
        color: #94a3b8;
        letter-spacing: 0.03em;
      }

      .field-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }

      .field-icon {
        position: absolute;
        left: 12px;
        pointer-events: none;
        flex-shrink: 0;
      }

      .field-input {
        width: 100%;
        height: 42px;
        background: #0f1828;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 6px;
        color: #f1f5f9;
        font-family: inherit;
        font-size: 14px;
        padding: 0 12px 0 38px;
        outline: none;
        box-sizing: border-box;
        transition:
          border-color 180ms ease-out,
          box-shadow 180ms ease-out,
          background 180ms ease-out;
      }
      .field-input::placeholder {
        color: #2a3d66;
      }
      .pw-input {
        padding-right: 40px;
      }

      .field-wrap.focused .field-input {
        border-color: rgba(251, 191, 36, 0.55);
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
      }
      .field.has-error .field-input {
        border-color: rgba(251, 113, 133, 0.45);
        background: rgba(251, 113, 133, 0.05);
        box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.1);
      }

      .pw-toggle {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
      }

      .field-error {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #fb7185;
        font-size: 11.5px;
      }

      .btn-primary {
        height: 44px;
        width: 100%;
        background: #fbbf24;
        color: #06090f;
        border: none;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.01em;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .btn-primary:hover:not(:disabled) {
        background: #fcd34d;
      }
      .btn-primary:disabled {
        opacity: 0.85;
        cursor: default;
      }

      @keyframes nr-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .spinner {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(6, 9, 15, 0.25);
        border-top-color: #06090f;
        animation: nr-spin 0.7s linear infinite;
        flex-shrink: 0;
      }

      .signin-prompt {
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
        margin: 0;
      }

      .terms-link {
        color: #94a3b8;
        text-decoration: none;
        transition: color 150ms ease-out;
      }
      .terms-link:hover {
        color: #fbbf24;
      }

      @keyframes nr-fade {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .success-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: 8px 0;
        animation: nr-fade 220ms ease-out;
      }
      .success-icon {
        width: 54px;
        height: 54px;
        border-radius: 14px;
        margin-bottom: 10px;
        background: rgba(52, 211, 153, 0.1);
        border: 1px solid rgba(52, 211, 153, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 24px rgba(52, 211, 153, 0.18);
      }
      .success-title {
        font-size: 19px;
        font-weight: 600;
        color: #f1f5f9;
        letter-spacing: -0.02em;
        margin: 0;
      }
      .success-sub {
        font-size: 13px;
        color: #94a3b8;
        margin: 0;
        max-width: 260px;
        line-height: 1.5;
      }
      .success-state .btn-primary {
        margin-top: 16px;
      }
    `,
  ],
})
export class RegisterScreenComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly showPassword = signal(false);
  protected readonly touched = signal(false);
  protected readonly status = signal<'idle' | 'submitting' | 'success'>('idle');
  protected readonly nameFocused = signal(false);
  protected readonly emailFocused = signal(false);
  protected readonly passwordFocused = signal(false);
  protected readonly confirmFocused = signal(false);

  protected readonly nameError = computed(() =>
    this.touched() && this.name().trim().length === 0 ? 'Enter your name.' : null,
  );
  protected readonly emailError = computed(() =>
    this.touched() && !EMAIL_RE.test(this.email()) ? 'Enter a valid email address.' : null,
  );
  protected readonly passwordError = computed(() =>
    this.touched() && this.password().length < 8 ? 'Must be at least 8 characters.' : null,
  );
  protected readonly confirmError = computed(() =>
    this.touched() && this.confirm() !== this.password() ? 'Passwords do not match.' : null,
  );

  private graph: { nodes: GraphNode[]; edges: [number, number][] } | null = null;
  private canvasW = 0;
  private canvasH = 0;
  private canvasDpr = 1;
  private animT = 0;
  private rafId = 0;
  private lastFrame = 0;
  private ro?: ResizeObserver;

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.lastFrame = performance.now();
    this.startLoop();
    this.ro = new ResizeObserver(() => this.setupCanvas());
    const parent = this.canvasRef?.nativeElement?.parentElement;
    if (parent) this.ro.observe(parent);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.ro?.disconnect();
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const count = Math.max(14, Math.round(((w * h) / 17000) * (0.35 + 0.7 * 1.3)));
    this.graph = buildGraph(count, w, h);
    this.canvasW = w;
    this.canvasH = h;
    this.canvasDpr = dpr;
  }

  private startLoop(): void {
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
      this.lastFrame = now;
      this.animT += dt;
      this.drawFrame();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private drawFrame(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.graph || this.canvasW === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { canvasW: w, canvasH: h, canvasDpr: dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const t = this.animT;
    const { nodes, edges } = this.graph;
    const pos = nodes.map((n) => ({
      x: n.x + Math.sin(t * n.speed + n.phase) * 18 * n.driftX * 2,
      y: n.y + Math.cos(t * n.speed * 0.9 + n.phase) * 18 * n.driftY * 2,
    }));

    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const pa = pos[a],
        pb = pos[b];
      const dist = Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
      if (dist > 240) continue;
      ctx.strokeStyle = `rgba(120,150,200,${(1 - dist / 240) * 0.16})`;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i],
        p = pos[i];
      const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.4 + n.phase));
      const [r, g, bl] = hexToRgb(n.color);
      const glowR = n.r * 6;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      grad.addColorStop(0, `rgba(${r},${g},${bl},${0.32 * pulse})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${r},${g},${bl},${0.55 + 0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, n.r, 0, Math.PI * 2);
      ctx.fill();

      if (n.r > 4) {
        ctx.fillStyle = 'rgba(241,245,249,0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, n.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  protected async submitForm(e: Event): Promise<void> {
    e.preventDefault();
    this.touched.set(true);
    if (
      this.name().trim().length === 0 ||
      !EMAIL_RE.test(this.email()) ||
      this.password().length < 8 ||
      this.confirm() !== this.password()
    ) {
      return;
    }
    this.status.set('submitting');
    try {
      await this.authStore.signUpWithEmail(this.email(), this.password(), this.name().trim());
      this.router.navigate(['/network']);
    } catch {
      this.toast.show('Could not create account. The email may already be registered.', 'error');
      this.status.set('idle');
    }
  }
}
