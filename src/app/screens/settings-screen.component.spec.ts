import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsScreenComponent } from './settings-screen.component';
import { seedAppStore } from './spec-helpers';

describe('SettingsScreenComponent', () => {
	beforeEach(async () => {
		await seedAppStore();
	});

	it('renders the settings placeholder copy', () => {
		const fixture = TestBed.createComponent(SettingsScreenComponent);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Settings');
		expect(text).toContain('Coming soon');
	});
});
