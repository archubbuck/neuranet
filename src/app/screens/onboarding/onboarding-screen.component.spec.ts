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
		expect(el.querySelector('button.primary')?.textContent).toContain('Add first source');
		expect(el.querySelector('button.ghost')?.textContent).toContain('demo dataset');
	});

	it('opens the add-source modal from the primary action', () => {
		const fixture = TestBed.createComponent(OnboardingScreenComponent);
		fixture.detectChanges();
		const el = fixture.nativeElement as HTMLElement;
		(el.querySelector('button.primary') as HTMLButtonElement).click();
		fixture.detectChanges();
		const dialog = el.querySelector('app-add-source-modal [role="dialog"]');
		expect(dialog).toBeTruthy();
		expect(dialog?.textContent).toContain('Add a source');
	});
});
