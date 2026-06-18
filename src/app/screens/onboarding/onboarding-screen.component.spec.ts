import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OnboardingScreenComponent } from './onboarding-screen.component';
import { seedAppStore } from '../spec-helpers';

describe('OnboardingScreenComponent', () => {
  beforeEach(async () => {
    await seedAppStore({});
  });

  it('renders the empty-state copy and both actions', () => {
    const fixture = TestBed.createComponent(OnboardingScreenComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Your network is empty');
    expect(el.textContent).toContain('Add first source');
    expect(el.textContent).toContain('demo dataset');
  });

  it('opens the add-source modal from the primary action', () => {
    const fixture = TestBed.createComponent(OnboardingScreenComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    // First button is "Add first source" (the primary action)
    (buttons[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    const dialog = el.querySelector('app-add-source-modal [role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Add a source');
  });
});
