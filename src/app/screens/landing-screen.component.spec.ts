import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingScreenComponent } from './landing-screen.component';

describe('LandingScreenComponent', () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		await TestBed.configureTestingModule({
			imports: [LandingScreenComponent],
			providers: [provideRouter([])],
		}).compileComponents();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('renders the Enter button while idle', () => {
		const fixture = TestBed.createComponent(LandingScreenComponent);
		fixture.detectChanges();
		const btn = (fixture.nativeElement as HTMLElement).querySelector('.enter-btn');
		expect(btn?.textContent).toContain('Enter');
	});

	it('cancels the animation frame loop on destroy', () => {
		// Capture scheduled frame callbacks; ids are 1-based indices.
		const frames: FrameRequestCallback[] = [];
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
			frames.push(cb);
			return frames.length;
		});
		const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

		const fixture = TestBed.createComponent(LandingScreenComponent);
		fixture.detectChanges();

		(fixture.componentInstance as unknown as { startAnimation(): void }).startAnimation();
		vi.runOnlyPendingTimers(); // flush the startup setTimeout → runLoop schedules a frame
		const componentFrameId = frames.length;
		expect(componentFrameId).toBeGreaterThan(0);

		fixture.destroy();
		expect(cancelSpy).toHaveBeenCalledWith(componentFrameId);

		// Even if the frame fires after destroy, the loop must not reschedule.
		const before = frames.length;
		frames[componentFrameId - 1](0);
		expect(frames.length).toBe(before);
	});

	it('does not start the loop if destroyed before the startup timer fires', () => {
		const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);

		const fixture = TestBed.createComponent(LandingScreenComponent);
		fixture.detectChanges();

		(fixture.componentInstance as unknown as { startAnimation(): void }).startAnimation();
		fixture.destroy();
		const callsBefore = rafSpy.mock.calls.length;
		vi.runOnlyPendingTimers();

		expect(rafSpy.mock.calls.length).toBe(callsBefore);
	});
});
