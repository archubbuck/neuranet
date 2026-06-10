import {
	DestroyRef,
	inject,
	Injectable,
	NgZone,
	PLATFORM_ID,
	signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BREAKPOINTS } from '../ui/tokens';

export interface ViewportState {
	readonly width: number;
	readonly isMobile: boolean;
	readonly isNarrow: boolean;
}

const DEFAULT_WIDTH = 1280;

/**
 * Tracks viewport width and exposes prototype-aligned responsive flags as a
 * single signal. Mirrors the React prototype's `useViewport` hook so layout
 * code reads the same `{ width, isMobile, isNarrow }` shape it always did.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);

	private readonly _state = signal<ViewportState>(this.measure());
	readonly state = this._state.asReadonly();

	constructor() {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		let raf: number | null = null;
		const onResize = (): void => {
			if (raf !== null) return;
			raf = window.requestAnimationFrame(() => {
				raf = null;
				this._state.set(this.measure());
			});
		};

		// resize and orientationchange don't trigger Angular change detection
		// in zoneless mode anyway, but listening outside the zone keeps zone-
		// based callers (e.g. unit tests) lean.
		const zone = inject(NgZone);
		zone.runOutsideAngular(() => {
			window.addEventListener('resize', onResize);
			window.addEventListener('orientationchange', onResize);
		});

		this.destroyRef.onDestroy(() => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onResize);
			if (raf !== null) window.cancelAnimationFrame(raf);
		});
	}

	private measure(): ViewportState {
		const width = isPlatformBrowser(this.platformId)
			? window.innerWidth
			: DEFAULT_WIDTH;
		return {
			width,
			isMobile: width < BREAKPOINTS.mobile,
			isNarrow: width < BREAKPOINTS.narrow,
		};
	}
}
