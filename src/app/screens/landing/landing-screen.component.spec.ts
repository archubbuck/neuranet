import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../data/api.service';
import type { JoinWaitlistResult } from '../../data/types';
import { LandingScreenComponent } from './landing-screen.component';

describe('LandingScreenComponent', () => {
  const joinWaitlist = vi.fn<(email: string) => Promise<JoinWaitlistResult>>();

  beforeEach(async () => {
    joinWaitlist.mockReset();
    joinWaitlist.mockResolvedValue({ ok: true });

    await TestBed.configureTestingModule({
      imports: [LandingScreenComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: { joinWaitlist } }],
    }).compileComponents();
  });

  it('renders the hero headline and waitlist form by default', () => {
    const fixture = TestBed.createComponent(LandingScreenComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Map the network');
    expect(root.querySelector('.hero-copy form.cta-row')).toBeTruthy();
    expect(root.querySelector('.cta-confirm')).toBeNull();
  });

  it('shows the confirmation message after a valid email is submitted', async () => {
    const fixture = TestBed.createComponent(LandingScreenComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      email: { set(value: string): void };
      onSubmit(): void;
    };
    component.email.set('hello@example.com');
    component.onSubmit();
    await vi.waitFor(() => expect(joinWaitlist).toHaveBeenCalledWith('hello@example.com'));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.hero-copy form.cta-row')).toBeNull();
    expect(root.querySelector('.cta-confirm')?.textContent).toContain("You're on the list");
  });

  it('ignores submissions that are missing or malformed', () => {
    const fixture = TestBed.createComponent(LandingScreenComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      email: { set(value: string): void };
      onSubmit(): void;
      submitted: () => boolean;
    };
    component.email.set('not-an-email');
    component.onSubmit();
    expect(component.submitted()).toBe(false);

    component.email.set('');
    component.onSubmit();
    expect(component.submitted()).toBe(false);
  });

  it('renders the three "how it works" markers', () => {
    const fixture = TestBed.createComponent(LandingScreenComponent);
    fixture.detectChanges();
    const markers = (fixture.nativeElement as HTMLElement).querySelectorAll('.how-marker');
    expect(markers.length).toBe(3);
    expect(markers[0]?.textContent).toContain('Connect sources');
    expect(markers[1]?.textContent).toContain('Structure emerges');
    expect(markers[2]?.textContent).toContain('Answers, quantified');
  });
});
